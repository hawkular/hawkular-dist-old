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

/// <reference path="metricsTypes.ts"/>
/// <reference path="metricsPlugin.ts"/>
/// <reference path="../../includes.ts"/>

module HawkularMetrics {

  export interface IContextChartDataPoint {
    timestamp: number;
    start?: number;
    end?: number;
    value: number;
    avg: number;
    empty: boolean;
  }

  export interface IChartDataPoint extends IContextChartDataPoint {
    date: Date;
    min: number;
    max: number;
    percentile95th: number;
    median: number;
  }

  declare var window: any;

  /**
   * @ngdoc controller
   * @name ChartController
   * @description This controller is responsible for handling activity related to the Chart tab.
   * @param $scope
   * @param $rootScope for publishing $broadcast events only
   * @param $interval
   * @param $log
   * @param HawkularMetric
   * @param HawkularAlert
   * @param $routeParams
   */
  export class MetricsViewController {
    /// for minification only
    public static  $inject = ['$scope', '$rootScope', '$interval', '$log', 'HawkularMetric', 'HawkularAlert', '$routeParams'];

    private bucketedDataPoints:IChartDataPoint[] = [];
    private contextDataPoints:IChartDataPoint[] = [];
    private chartData:any;
    private autoRefreshPromise:ng.IPromise<number>;

    private resourceId:ResourceId;
    threshold = 5000; // default to 5 seconds some high number

    median = 0;
    percentile95th = 0;
    average = 0;
    math;

    constructor(private $scope:any,
                private $rootScope:any,
                private $interval:ng.IIntervalService,
                private $log:ng.ILogService,
                private HawkularMetric:any,
                private HawkularAlert:any,
                private $routeParams:any,
                public alertList:any,
                public startTimeStamp:TimestampInMillis,
                public endTimeStamp:TimestampInMillis) {
      $scope.vm = this;
      this.math = window.Math;

      this.startTimeStamp = moment().subtract(1, 'hours').valueOf();
      this.endTimeStamp = +moment();

      this.resourceId = $scope.hkParams.resourceId;

      $scope.$on('RefreshChart', (event) => {
        this.refreshChartDataNow(this.getMetricId());
      });

      var waitForResourceId = () => $scope.$watch('hkParams.resourceId', (resourceId:ResourceId) => {
        /// made a selection from url switcher
        if (resourceId) {
          this.resourceId = resourceId;
          this.refreshChartDataNow(this.getMetricId());
        }
      });
      
      if ($rootScope.currentPersona) {
        waitForResourceId();
      } else {
        $rootScope.$watch('currentPersona', (currentPersona) => {
          if (currentPersona) {
            waitForResourceId();
          }
        });
      }
      this.autoRefresh(20);

    }




    cancelAutoRefresh():void {
      this.$interval.cancel(this.autoRefreshPromise);
      toastr.info('Canceling Auto Refresh');
    }

    autoRefresh(intervalInSeconds:number):void {
      this.autoRefreshPromise = this.$interval(()  => {
        this.$scope.hkEndTimestamp = +moment();
        this.endTimeStamp = this.$scope.hkEndTimestamp;
        this.$scope.hkStartTimestamp = moment().subtract(this.$scope.hkParams.timeOffset, 'milliseconds').valueOf();
        this.startTimeStamp = this.$scope.hkStartTimestamp;
        this.refreshSummaryData(this.getMetricId());
        this.refreshHistoricalChartDataForTimestamp(this.getMetricId());
        this.retrieveThreshold();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    private noDataFoundForId(resourceId:ResourceId):void {
      this.$log.warn('No Data found for id: ' + resourceId);
      ///toastr.warning('No Data found for id: ' + id);
    }


    refreshChartDataNow(metricId:string, startTime?:TimestampInMillis):void {
      this.$scope.hkEndTimestamp = +moment();
      var adjStartTimeStamp:number = moment().subtract(this.$scope.hkParams.timeOffset, 'milliseconds').valueOf();
      this.endTimeStamp = this.$scope.hkEndTimestamp;
      this.refreshSummaryData(metricId, startTime ? startTime : adjStartTimeStamp, this.endTimeStamp);
      this.refreshHistoricalChartDataForTimestamp(metricId, !startTime ? adjStartTimeStamp : startTime, this.endTimeStamp);
      this.refreshAlerts(metricId, startTime ? startTime : adjStartTimeStamp, this.endTimeStamp);
      this.retrieveThreshold();
    }

    getMetricId():ResourceId {
      return this.resourceId + '.status.duration';
    }

    retrieveThreshold() {
      this.HawkularAlert.Condition.query({triggerId: this.$routeParams.resourceId + '_trigger_thres'}).$promise
        .then((response) => {

          if (response[0]) {
            this.threshold = response[0].threshold;
          }

        }, (error) => {
          this.$log.error('Error Loading Threshold data');
          toastr.error('Error Loading Threshold Data: ' + error);
        });
    }

    refreshAlerts(metricId:MetricId, startTime:TimestampInMillis, endTime:TimestampInMillis):void {
      var alertType = this.$routeParams.resourceId + '_trigger_thres';
      this.HawkularAlert.Alert.query({ statuses:'OPEN'}, (anAlertList) => {
        var filteredAlerts = [];
        for(var i = 0; i < anAlertList.length; i++) {
          if((anAlertList[i].triggerId === alertType) && (anAlertList[i].ctime >= (+moment() - this.$scope.hkParams.timeOffset))) {
            // cleaning a lot of data, we dont need at the template
            anAlertList[i].evalSets.splice(1);
            filteredAlerts.push(anAlertList[i]);
          }
        }
        this.alertList = filteredAlerts.reverse();
      }, this);
    }

    public alertResolve(alert: any, index: number): void {
      for (var i = 0; i< this.alertList.length; i++) {
        if (this.alertList[i].$$hashKey === alert.$$hashKey) {
          this.HawkularAlert.Alert.resolve({alertIds: alert.alertId}, {}).$promise.then( () => {
            this.alertList.splice(i, 1);
          });
          break;
        }
      }
    }

    refreshSummaryData(metricId:string, startTime?:TimestampInMillis, endTime?:TimestampInMillis):void {
      var dataPoints:IChartDataPoint[];
      // calling refreshChartData without params use the model values
      if (!endTime) {
        endTime = this.endTimeStamp;
      }
      if (!startTime) {
        startTime = this.startTimeStamp;
      }

      if (metricId) {
        this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          numericId: metricId,
          start: startTime,
          end: endTime,
          buckets: 1
        }).$promise
          .then((response) => {

            dataPoints = this.formatBucketedChartOutput(response);
            console.dir(dataPoints);

            this.median = Math.round(_.last(dataPoints).median);
            this.percentile95th = Math.round(_.last(dataPoints).percentile95th);
            this.average = Math.round(_.last(dataPoints).avg);

          }, (error) => {
            this.$log.error('Error Loading Chart data');
            toastr.error('Error Loading Chart Data: ' + error);
          });

      }
    }


    refreshHistoricalChartDataForTimestamp(metricId:string, startTime?:TimestampInMillis, endTime?:TimestampInMillis):void {
      // calling refreshChartData without params use the model values
      if (!endTime) {
        endTime = this.endTimeStamp;
      }
      if (!startTime) {
        startTime = this.startTimeStamp;
      }


      if (metricId) {
        this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          numericId: metricId,
          start: startTime,
          end: endTime,
          buckets: 120
        }).$promise
          .then((response) => {

            // we want to isolate the response from the data we are feeding to the chart
            this.bucketedDataPoints = this.formatBucketedChartOutput(response);
            console.dir(this.bucketedDataPoints);

            if (this.bucketedDataPoints.length) {
              // this is basically the DTO for the chart
              this.chartData = {
                id: metricId,
                startTimeStamp: startTime,
                endTimeStamp: endTime,
                dataPoints: this.bucketedDataPoints,
                contextDataPoints: this.contextDataPoints,
                annotationDataPoints: []
              };

            } else {
              this.noDataFoundForId(metricId);
            }

          }, (error) => {
            this.$log.error('Error Loading Chart data');
            toastr.error('Error Loading Chart Data: ' + error);
          });

      }
    }

    private formatBucketedChartOutput(response):IChartDataPoint[] {
      //  The schema is different for bucketed output
      return _.map(response, (point:IChartDataPoint) => {
        return {
          timestamp: point.start,
          date: new Date(point.start),
          value: !angular.isNumber(point.value) ? 0 : point.value,
          avg: (point.empty) ? 0 : point.avg,
          min: !angular.isNumber(point.min) ? 0 : point.min,
          max: !angular.isNumber(point.max) ? 0 : point.max,
          percentile95th: !angular.isNumber(point.percentile95th) ? 0 : point.percentile95th,
          median: !angular.isNumber(point.median) ? 0 : point.median,
          empty: point.empty
        };
      });
    }

  }

  _module.controller('MetricsViewController', MetricsViewController);


}
