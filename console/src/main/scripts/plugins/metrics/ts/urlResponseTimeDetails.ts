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

/// <reference path='metricsTypes.ts'/>
/// <reference path='metricsPlugin.ts'/>
/// <reference path='services/metricsService.ts'/>
/// <reference path='../../includes.ts'/>

module HawkularMetrics {

  export class MetricsViewController {
    /// for minification only
    public static  $inject = ['$scope', '$rootScope', '$interval', '$log', '$location', '$routeParams',
       'HawkularNav', 'HawkularAlertsManager', 'ErrorsManager', '$q', 'NotificationsService', 'MetricsService'];

    private bucketedDataPoints:IChartDataPoint[] = [];
    private contextDataPoints:IChartDataPoint[] = [];
    private autoRefreshPromise:ng.IPromise<number>;
    private resourceId:ResourceId;

    public chartData:IChartData; // essentially the dto for the screen
    public threshold:TimestampInMillis = 5000; // default to 5 seconds some high number
    public median = 0;
    public percentile95th = 0;
    public average = 0;
    public alertList;
    public startTimeStamp:TimestampInMillis;
    public endTimeStamp:TimestampInMillis;

    constructor(private $scope:any,
                private $rootScope:IHawkularRootScope,
                private $interval:ng.IIntervalService,
                private $log:ng.ILogService,
                private $location:ng.ILocationService,
                private $routeParams:any,
                private HawkularNav:any,
                private HawkularAlertsManager:IHawkularAlertsManager,
                private ErrorsManager:IErrorsManager,
                private $q:ng.IQService,
                private NotificationsService:INotificationsService,
                private MetricsService:IMetricsService) {
      $scope.vm = this;

      this.startTimeStamp = +moment().subtract(1, 'hours');
      this.endTimeStamp = +moment();

      this.resourceId = $scope.hkParams.resourceId;

      $scope.$on(EventNames.REFRESH_CHART, (event) => {
        this.$log.debug('RefreshChart Event');
        this.refreshChartDataNow(this.getMetricId());
      });

      // handle drag ranges on charts to change the time range
      this.$scope.$on(EventNames.CHART_TIMERANGE_CHANGED, (event, data:Date[]) => {
        this.changeTimeRange(data);
      });

      let waitForResourceId = () => $scope.$watch('hkParams.resourceId', (resourceId:ResourceId) => {
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
      $scope.$on('SwitchedPersona', () => $location.path('/hawkular-ui/url/url-list'));
      this.autoRefresh(20);
    }

    private changeTimeRange(data:Date[]):void {
      this.startTimeStamp = data[0].getTime();
      this.endTimeStamp = data[1].getTime();
      this.HawkularNav.setTimestampStartEnd(this.startTimeStamp, this.endTimeStamp);
      this.refreshChartDataNow(this.getMetricId());
    }

    private getAlerts(resourceId:string, startTime:TimestampInMillis, endTime:TimestampInMillis):void {
      let alertsArray:IAlert[];
      let promise = this.HawkularAlertsManager.queryAlerts({
        statuses: 'OPEN',
        tags: 'resourceId|' + resourceId, startTime: startTime, endTime: endTime
      }).then((data:IHawkularAlertQueryResult)=> {
        _.remove(data.alertList, (item:IAlert) => {
          switch (item.context.alertType) {
            case 'PINGRESPONSE' :
              item.alertType = item.context.alertType;
              return false;
            case 'PINGAVAIL' :
              item.alertType = item.context.alertType;
              return false;
            default :
              return true; // ignore non-response-time alert
          }
        });
        alertsArray = data.alertList;
      }, (error) => {
        return this.ErrorsManager.errorHandler(error, 'Error fetching url RT alerts.');
      });

      this.$q.all([promise]).finally(()=> {
        this.alertList = alertsArray;
      });
    }

    private autoRefresh(intervalInSeconds:IntervalInSeconds):void {
      this.autoRefreshPromise = this.$interval(()  => {
        this.refreshChartDataNow(this.getMetricId());
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }


    private refreshChartDataNow(metricId:MetricId, startTime?:TimestampInMillis):void {
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      this.refreshSummaryData(metricId, this.startTimeStamp, this.endTimeStamp);
      this.refreshHistoricalChartDataForTimestamp(metricId, this.startTimeStamp, this.endTimeStamp);
      this.getAlerts(this.resourceId, this.startTimeStamp, this.endTimeStamp);
      this.retrieveThreshold();
    }

    public getMetricId():MetricId {
      return this.resourceId + '.status.duration';
    }

    public min(a:number, b:number):number {
      return Math.min(a, b);
    }


    public refreshSummaryData(metricId:MetricId,
                              startTime?:TimestampInMillis,
                              endTime?:TimestampInMillis):void {
      let dataPoints:IChartDataPoint[];

      // calling refreshChartData without params use the model values
      if (!endTime) {
        endTime = this.endTimeStamp;
      }
      if (!startTime) {
        startTime = this.startTimeStamp;
      }

      if (metricId) {

        this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
          metricId, startTime, endTime, 1)
          .then((response) => {

            dataPoints = MetricsService.formatBucketedChartOutput(response);

            this.median = Math.round(_.last(dataPoints).median);
            this.percentile95th = Math.round(_.last(dataPoints).percentile95th);
            this.average = Math.round(_.last(dataPoints).avg);

          }, (error) => {
            this.NotificationsService.error('Error Loading Chart Data: ' + error);
          });

      }
    }

    private retrieveThreshold() {
      let triggerId = this.$routeParams.resourceId + '_trigger_thres';
      this.HawkularAlertsManager.getTriggerConditions(triggerId)
        .then((conditions) => {
          if (conditions[0]) {
            this.threshold = conditions[0].threshold;
          }
        }, (error) => {
          this.$log.error('Error Loading Threshold data');
        });
    }


    public refreshHistoricalChartDataForTimestamp(metricId:MetricId,
                                                  startTime?:TimestampInMillis,
                                                  endTime?:TimestampInMillis):void {
      /// calling refreshChartData without params use the model values
      if (!endTime) {
        endTime = this.endTimeStamp;
      }
      if (!startTime) {
        startTime = this.startTimeStamp;
      }

      if (metricId) {

        this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id, metricId,
          startTime, endTime, 120)
          .then((response) => {

            // we want to isolate the response from the data we are feeding to the chart
            this.bucketedDataPoints = MetricsService.formatBucketedChartOutput(response);

            if (this.bucketedDataPoints.length) {
              // this is basically the DTO for the chart
              this.chartData = {
                id: metricId,
                startTimeStamp: startTime,
                endTimeStamp: endTime,
                dataPoints: this.bucketedDataPoints,
                contextDataPoints: this.contextDataPoints,
                annotationDataPoints: null
              };

            } else {
              this.$log.warn('No Data found for id: ' + metricId);
            }

          }, (error) => {
            this.NotificationsService.error('Error Loading Chart Data: ' + error);
          });
      }
    }
  }

  _module.controller('MetricsViewController', MetricsViewController);
}
