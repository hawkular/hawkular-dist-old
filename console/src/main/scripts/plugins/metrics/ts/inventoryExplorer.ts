///
/// Copyright 2015-2016 Red Hat, Inc. and/or its affiliates
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

/// <reference path='metricsPlugin.ts'/>
/// <reference path='services/notificationsService.ts'/>

module HawkularMetrics {

  export class InventoryExplorerController implements IRefreshable {
    public title: string = 'Metrics Explorer';
    public pleaseWait = true;
    public resourceButtonEnabled = false;
    private selectedFeed;
    private selectedResource;
    private metrics = [];
    private charts = [];
    private chartData = [];
    private selectedMetric;
    private buttonActive = false;
    public startTimeStamp: TimestampInMillis;
    public endTimeStamp: TimestampInMillis;
    private chartType = [];
    private chartUnit = [];
    public example_treedata: any;
    public childrenTree: any = [];
    public alertList: any[] = [];
    public foo: any;
    public static get pathDelimiter(): string {return '/r;';}
    /*@ngInject*/
    constructor(private $location: ng.ILocationService,
                private $scope: any,
                private $rootScope: any,
                private $interval: ng.IIntervalService,
                private $log: ng.ILogService,
                private $routeParams: any,
                private HawkularAlertRouterManager: IHawkularAlertRouterManager,
                private HawkularNav: any,
                private $modal: any,
                private $window: any,
                private HawkularInventory: any,
                private HawkularMetric: any,
                private MetricsService: IMetricsService,
                private ErrorsManager: IErrorsManager,
                private $q: ng.IQService,
                private $sessionStorage: any,
                private $localStorage: any
    ) {
      $scope.exc = this;
      this.example_treedata = [{
        label: 'Languages',
        children: [{label: 'Jade'},{label: 'Less'},{label: 'Coffeescript'}]
      }];
      // Check if we have charts in local storage
      // and set them up if so.
      let tmp = $localStorage.hawkular_charts;
      if (!angular.isUndefined(tmp)) {
        this.charts = tmp;
        _.forEach(tmp, (metric: any) => {
          this.registerForAlerts(metric.feed, metric.resource);
          this.$log.log('Found metric in storage: ' + metric.id);
        });
        if ($rootScope.currentPersona) {
          this.startTimeStamp = +moment().subtract(($routeParams.timeOffset || 3600000), 'milliseconds');
          this.endTimeStamp = +moment();
          this.refresh();
        } else {
          // No persona yet injected -> wait for it.
          $rootScope.$watch('currentPersona',
              (currentPersona) => currentPersona && this.refresh());
        }
      }

      // handle drag ranges on charts to change the time range
      this.$scope.$on(EventNames.CHART_TIMERANGE_CHANGED, (event, data: Date[]) => {
        this.changeTimeRange(data);
      });

      // handle drag ranges on charts to change the time range
      this.$scope.$on('ContextChartTimeRangeChanged', (event, data: Date[]) => {
        this.$log.debug('Received ContextChartTimeRangeChanged event' + data);
        this.changeTimeRange(data);
      });

      this.startTimeStamp = +moment().subtract(($routeParams.timeOffset || 3600000), 'milliseconds');
      this.endTimeStamp = +moment();

      this.autoRefresh(20);
    }

    private changeTimeRange(data: Date[]): void {
      this.startTimeStamp = data[0].getTime();
      this.endTimeStamp = data[1].getTime();
      this.HawkularNav.setTimestampStartEnd(this.startTimeStamp, this.endTimeStamp);
      this.refresh();
    }

    private autoRefreshPromise: ng.IPromise<number>;

    private autoRefresh(intervalInSeconds: number): void {
      this.autoRefreshPromise = this.$interval(() => {
        this.refresh();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    public getMetrics(resource) {
      this.pleaseWait = true;
      this.selectedMetric = null;
      this.buttonActive = false;
      this.HawkularInventory['MetricOfResourceUnderFeed']['get']({
          feedId: this.selectedFeed.id,
          resourcePath: resource.resourcePath.replace(/\/r;/g, '/').slice(1)
        },
        (metricList) => {
          this.metrics = metricList;
          this.pleaseWait = false;
        }
      );
    };

    public selectMetric(metric) {
      this.selectedMetric = metric;
      this.buttonActive = true;
      this.registerForAlerts(this.selectedFeed, this.selectedResource);

     // this.showChart(); // TODO activate only after button press
    }

    private registerForAlerts(feed, resource) {
      InventoryExplorerController.stripLastCharactersFromResourceId(resource, 2);
      this.HawkularAlertRouterManager.registerForAlerts(
        feed.id + '/' + resource.id,
        'explorer',
        _.bind(this.filterAlerts, this)
      );
    }

    private static stripLastCharactersFromResourceId(resource, numberOfChars) {
      if (resource.id.substr(resource.id.length - numberOfChars) === '~~') {
        resource.id = resource.id.substr(0, resource.id.length - numberOfChars);
      }
    }

    private getAlerts(): void {
      _.forEach(this.charts, (oneChart) => {
        if (oneChart.hasOwnProperty('feed') && oneChart.hasOwnProperty('resource')) {
          this.HawkularAlertRouterManager.getAlertsForResourceId(
              oneChart.feed.id + '/' + oneChart.resource.id,
                this.startTimeStamp,
                this.endTimeStamp
          );
        }
      });
    }

    public filterAlerts(alertData: IHawkularAlertQueryResult) {
      let deploymentAlerts = alertData.alertList;
      _.forEach(deploymentAlerts, (item) => {
        item['alertType'] = item.context.alertType;
      });
      this.alertList = this.alertList.concat(deploymentAlerts);
    }

    public showChart() {
      // Only add if not empty and not yet in the array.
      if (this.selectedMetric != null && this.selectedMetric !== '' &&
           this.charts.indexOf(this.selectedMetric) === -1) {
        this.selectedMetric['resource'] = _.cloneDeep(this.selectedResource);
        this.selectedMetric['feed'] = _.cloneDeep(this.selectedFeed);
        this.addNewChartToController(this.selectedMetric);
        this.addMetricToStorage();
        this.refresh();
      }
    }

    private addNewChartToController(metric) {
      this.charts.push(metric);
      this.chartType[metric.id] = metric.type.type;
      this.chartUnit[metric.id] = metric.type.unit;
    };

    public removeChart(chart) {
      this.$log.log('Remove ' + chart);
      let index = this.charts.indexOf(chart,0);
      if (index > -1) {
        this.charts.splice(index,1);
        let id = chart.id;
        index = this.chartData.indexOf(id,0);
        if (index > -1) {
          this.chartData.splice(index,1);
        }
        this.refresh();
      }
    }

    public refresh() {
      this.$rootScope.lastUpdateTimestamp = new Date();
      this.alertList = [];
      this.getAlerts();
      this.getMetricData();
    }

    public getMetricData() {
      _.forEach(this.charts, (res: any) => {
        if (res.type.type === 'GAUGE') {
          this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
            res.id,
            this.startTimeStamp,
            this.endTimeStamp,
            60
          ).then((data) => {
            this.formatChartGaugeData(res.id, data);
          });
        } else if (res.type.type === 'COUNTER') {
          this.MetricsService.retrieveCounterMetrics(this.$rootScope.currentPersona.id,
            res.id,
            this.startTimeStamp,
            this.endTimeStamp,
            60
          ).then((data) => {
            this.formatChartData(res.id, data);
          });
        } else if (res.type.type === 'AVAILABILITY') {
          this.MetricsService.retrieveAvailabilityMetrics(this.$rootScope.currentPersona.id,
            res.id,
            this.startTimeStamp,
            this.endTimeStamp,
            60
          ).then((data) => {
            this.formatChartData(res.id, data);
          });
        } else {
          this.$log.log('Unknown type ' + res.type.type);
        }
      });
    }

    private formatChartGaugeData(resourceId, data) {
      if (data.length) {
        let scale = 1 /  MetricsService.getMultiplier(data);
        this.chartData[resourceId] = MetricsService.formatBucketedChartOutput(data,scale);
      }
    }

    private formatChartData(resourceId, data) {
      if (data.length) {
        this.chartData[resourceId] = MetricsService.formatBucketedChartOutput(data);
      }
    }

    private addMetricToStorage(): void {
        this.$log.log('addMetricToStorage');
      this.$localStorage.hawkular_charts = this.charts;
    }
  }

  //_module.config(['ngClipProvider', (ngClipProvider) => {
  //  ngClipProvider.setConfig({
  //    zIndex: 50
  //  });
  //}]);

  _module.controller('InventoryExplorerController', InventoryExplorerController);

}
