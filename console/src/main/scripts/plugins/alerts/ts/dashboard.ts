///
/// Copyright 2015 Red Hat, Inc. and/or its affiliates
/// and other contributors as indicated by the @author tags.
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///    http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

/// <reference path="alertsPlugin.ts"/>
module HawkularAlerts {

    export interface IDashboardController {
        showRefreshForm(): void;
        hideRefreshForm(): void;
        updateRefresh(): void;
    }

    export class DashboardController implements IDashboardController {
        public static  $inject = ['$scope', '$interval', '$log', 'HawkularAlert'];

        private stopInterval: any;
        private g: Graph;

        constructor(private $scope:any,
                    private $interval:ng.IIntervalService,
                    private $log:ng.ILogService,
                    private HawkularAlert:any) {

            $scope.msgs = [];
            $scope.refresh = {
                interval: 2000
            };
            $scope.showRefresh = false;

            var oneHour = 1 * 60 * 60 * 1000;
            var endTime = Date.now() + oneHour;
            var startTime = endTime - (1.5 * oneHour);

            this.g = Graph.getInstance();

            this.g.init('alertsDashboard',
                900,
                { top: 100, left: 125, bottom: 0, right: 0 },
                startTime,
                endTime,
                (series, timestamp) => {
                    /*
                     "series" var will store whole text with (<number>) counter representation
                     */
                    var sanitizedSeries = series.substring(0, series.lastIndexOf('(')).trim();
                    $scope.$apply(() => {
                        $scope.legend = this.g.getEvent(sanitizedSeries, timestamp);
                    });
                }
            );

            this.getAlerts();

            this.stopInterval = $interval(() => {
                this.getAlerts();
            }, $scope.refresh.interval);

            $scope.$on('$destroy', () => {
                this.cancelRefresh();
            });
        }

        showRefreshForm(): void {
            this.$scope.showRefresh = true;
        }

        hideRefreshForm(): void {
            this.$scope.showRefresh = false;
        }

        updateRefresh(): void {
            this.$scope.showRefresh = false;
            this.cancelRefresh();
            this.stopInterval = this.$interval(() => {
                this.getAlerts();
            }, this.$scope.refresh.interval);
        }

        closeAlertMsg(index: number):void {
            this.$scope.msgs.splice(index, 1);
        }

        private getAlerts(): void {
            this.HawkularAlert.Alert.query(
                (alerts) => {
                    var alertsLength = alerts.length;
                    for (var i = 0; i < alertsLength; i++) {
                        var alert = alerts[i];
                        alert.name = alert.triggerId;
                        alert.date = new Date(alert.time);
                        // Create a description
                        alert.description = alert.evalSets.toString();
                        this.g.addEvent(alert);
                    }
                }, (reason) => {
                    this.addAlertMsg(reason);
                }
            );
        }

        private cancelRefresh(): void {
            this.$interval.cancel(this.stopInterval);
        }

        private addAlertMsg(reason: any):void {
            var newAlert = {type: 'danger', msg: ''};
            if (reason.data && reason.data.errorMsg) {
                newAlert.msg = reason.data.errorMsg;
            } else {
                newAlert.msg = reason.statusText;
            }
            this.$scope.msgs.push(newAlert);
        }
    }

    _module.controller('HawkularAlerts.DashboardController', DashboardController);

    export class Graph {

        private static _instance:Graph = null;

        private _initialized: boolean = false;
        private _chartPlaceholder: any;
        private _width: number;
        private _margin: any;
        private _startTime: number;
        private _endTime: number;
        private _color;

        /*
             Global data of the graph:
             - It is a list of arrays.
             - Each array has:
             a) first element: a text containing name of the series.
             b) other elements: date objects representing events.
             - This array is passed to d3 object as input for raw data.
         */
        private _data = [];

        /*
             Aux associative array to map a name of series with the index on _data[] array.
             If we have a series name, we can acces to its series data using:

             _data[_seriesIndexes['MySeries']]
         */
        private _seriesIndexes = [];

        /*
             Associative array to store "events".
             - First level is an associative array based on event.name.
             - Second level is an associative array based on event.date.

             _storage[event.name][event.date] = event
         */
        private _storage = [];

        /*
         Global graph object.
         */
        private _graph;
        private _element;

        /*
            Scale to maintain aspect ratio after redraw
         */
        private _scaleDomain;

        constructor() {
            if (Graph._instance) {
                throw new Error("Something error in Graph singleton initialization");
            }
            Graph._instance = this;
        }

        public static getInstance():Graph {
            if (Graph._instance === null) {
                Graph._instance = new Graph();
            }
            return Graph._instance;
        }

        public init(dashboardId: string,
                    width: number,
                    margin: any,
                    startTime: number,
                    endTime: number,
                    hoverCallBack: Function): void {
            this._initialized = true;
            this._chartPlaceholder = document.getElementById(dashboardId);
            this._width = width;
            this._margin = margin;
            this._startTime = startTime;
            this._endTime = endTime;

            if (this._scaleDomain) {
                this._startTime = this._scaleDomain[0];
                this._endTime = this._scaleDomain[1];
            }

            this._color = d3.scale.category10();
            this._graph = d3.chart.eventDrops()
                .start(new Date(this._startTime))
                .end(new Date(this._endTime))
                .eventColor((datum, index) => {
                    return this._color(index);
                })
                .width(this._width)
                .margin(this._margin)
                .axisFormat((xAxis) => {
                    xAxis.ticks(5);
                })
                .eventHover((el) => {
                    var series = el.parentNode.firstChild.innerHTML;
                    var timestamp = d3.select(el).data()[0];

                    hoverCallBack(series, timestamp);

                })
                .eventZoom((scale) => {
                    this._scaleDomain = scale.domain();
                });

            this._element = d3.select(this._chartPlaceholder).append('div').datum(this._data);
            this._data = this._element.datum();
            this._graph(this._element);
        }

        public addEvent(event: any): void {
            if (this._initialized) {
                if (this._storage[event.name] === undefined) {
                    // Update _storage
                    var newSeries = [];
                    newSeries[event.date] = event;
                    this._storage[event.name] = newSeries;

                    // Update _data
                    this._seriesIndexes.push(event.name);
                    var newLine = {
                        name: event.name,
                        dates: [ event.date ]
                    };
                    this. _data.push(newLine);

                    // Redraw
                    if (this._scaleDomain) {
                        this._graph.start(this._scaleDomain[0]);
                        this._graph.end(this._scaleDomain[1]);
                    }
                    this._graph(this._element);
                } else {
                    if (this._storage[event.name][event.date] === undefined) {
                        // Update _storage
                        this._storage[event.name][event.date] = event;

                        // Update _data
                        var i = this._seriesIndexes.indexOf(event.name);
                        this._data[i].dates.push(event.date);

                        // Redraw
                        if (this._scaleDomain) {
                            this._graph.start(this._scaleDomain[0]);
                            this._graph.end(this._scaleDomain[1]);
                        }
                        this._graph(this._element);
                    }
                }
            }
        }

        public getEvent(name: any, date: any): any {
            if (this._initialized) {
                if (this._storage[name] !== undefined && this._storage[name][date] !== undefined) {
                    return this._storage[name][date];
                }
            }
        }

    }
}
