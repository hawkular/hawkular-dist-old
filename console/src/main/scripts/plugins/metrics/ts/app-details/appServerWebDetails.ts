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

/// <reference path="../metricsPlugin.ts"/>
/// <reference path="../services/alertsManager.ts"/>
/// <reference path="../services/errorsManager.ts"/>

module HawkularMetrics {

  export class AppServerWebDetailsController {

    /// this is for minification purposes
    public static $inject = ['$scope', '$rootScope', '$interval', '$log', '$routeParams',
      'HawkularInventory', 'HawkularMetric', 'HawkularAlertsManager', 'ErrorsManager', '$q'];

    public static MAX_ACTIVE_COLOR = '#1884c7'; /// blue
    public static EXPIRED_COLOR = '#f57f20'; /// orange
    public static ACTIVE_COLOR = '#49a547'; /// green
    public static REJECTED_COLOR = '#e12226'; /// red
    public static DEFAULT_MIN_SESSIONS = 20;
    public static DEFAULT_MAX_SESSIONS = 5000;
    public static MAX_SESSIONS = 9999;
    public static DEFAULT_EXPIRED_SESSIONS_THRESHOLD = 15;
    public static DEFAULT_REJECTED_SESSIONS_THRESHOLD = 15;

    public alertList;
    public activeWebSessions:number = 0;
    public requestTime:number = 0;
    public requestCount:number = 0;
    public startTimeStamp:TimestampInMillis;
    public endTimeStamp:TimestampInMillis;

    public chartWebSessionData:IMultiDataPoint[] = [];
    // will contain in the format: 'metric name' : true | false
    public skipChartData = {};

    constructor(private $scope:any,
                private $rootScope:IHawkularRootScope,
                private $interval:ng.IIntervalService,
                private $log:ng.ILogService,
                private $routeParams:any,
                private HawkularInventory:any,
                private HawkularMetric:any,
                private HawkularAlertsManager:IHawkularAlertsManager,
                private ErrorsManager:IErrorsManager,
                private $q:ng.IQService) {
      $scope.vm = this;

      this.startTimeStamp = +moment().subtract(($routeParams.timeOffset || 3600000), 'milliseconds');
      this.endTimeStamp = +moment();

      if ($rootScope.currentPersona) {
        this.getWebData();
        this.getWebChartData();
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) => currentPersona &&
        this.getWebData());
        this.getWebChartData();
      }

      this.getAlerts(this.$routeParams.resourceId, this.startTimeStamp, this.endTimeStamp);

      this.autoRefresh(20);
    }

    private getAlerts(metricIdPrefix:string, startTime:TimestampInMillis, endTime:TimestampInMillis):void {

      let activeSessionsTriggerId = metricIdPrefix + '_web_active_sessions';
      let expiredSessionsTriggerId = metricIdPrefix + '_web_expired_sessions';
      let rejectedSessionsTriggerId = metricIdPrefix + '_web_rejected_sessions';

      let triggerIds = activeSessionsTriggerId + ',' + expiredSessionsTriggerId + ',' + rejectedSessionsTriggerId;

      let sessionsArray:any;
      let sessionsPromise = this.HawkularAlertsManager.queryAlerts({statuses: 'OPEN', triggerIds: triggerIds,
        startTime: startTime, endTime: endTime}).then((sessionsData)=> {
          _.forEach(sessionsData.alertList, (item) => {
            if (item['triggerId'] === activeSessionsTriggerId) {
              item['alertType'] = 'ACTIVE_SESSIONS';
            } else if (item['triggerId'] === expiredSessionsTriggerId) {
              item['alertType'] = 'EXPIRED_SESSIONS';
            } else if (item['triggerId'] === rejectedSessionsTriggerId) {
              item['alertType'] = 'REJECTED_SESSIONS';
            }
          });
          sessionsArray = sessionsData.alertList;
        }, (error) => {
          return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.');
        });

      this.$q.all([sessionsPromise]).finally(()=> {
        this.alertList = [].concat(sessionsArray);
      });
    }

    private autoRefreshPromise:ng.IPromise<number>;

    private autoRefresh(intervalInSeconds:number):void {
      this.autoRefreshPromise = this.$interval(() => {
        this.getWebData();
        this.getWebChartData();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    public getWebData():void {
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId +
        '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Active Web Sessions',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 1
      }, (resource) => {
        this.activeWebSessions = resource[0].avg;
      }, this);
      this.HawkularMetric.CounterMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        counterId: 'MI~R~[' + this.$routeParams.resourceId +
        '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Servlet Request Time',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 1
      }, (resource) => {
        this.requestTime = resource[0].max - resource[0].min;
      }, this);
      this.HawkularMetric.CounterMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        counterId: 'MI~R~[' + this.$routeParams.resourceId +
        '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Servlet Request Count',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 1
      }, (resource) => {
        this.requestCount = resource[0].max - resource[0].min;
      }, this);
    }

    public getWebChartData():void {

      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      let tmpChartWebSessionData = [];
      let promises = [];

      if (!this.skipChartData['Active Sessions']) {
        promises.push(this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          gaugeId: 'MI~R~[' + this.$routeParams.resourceId +
          '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Active Web Sessions',
          start: this.startTimeStamp,
          end: this.endTimeStamp, buckets: 60
        }, (data) => {
          tmpChartWebSessionData[tmpChartWebSessionData.length] = {
            key: 'Active Sessions',
            color: AppServerWebDetailsController.ACTIVE_COLOR,
            values: MetricsService.formatBucketedChartOutput(data)
          };
        }, this).$promise);
      }
      if (!this.skipChartData['Expired Sessions']) {
        promises.push(this.HawkularMetric.CounterMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          counterId: 'MI~R~[' + this.$routeParams.resourceId +
          '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Expired Web Sessions',
          start: this.startTimeStamp,
          end: this.endTimeStamp, buckets: 60
        }, (data) => {
          tmpChartWebSessionData[tmpChartWebSessionData.length] = {
            key: 'Expired Sessions',
            color: AppServerWebDetailsController.EXPIRED_COLOR,
            values: MetricsService.formatBucketedChartOutput(data)
          };
        }, this).$promise);
      }
      if (!this.skipChartData['Rejected Sessions']) {
        promises.push(this.HawkularMetric.CounterMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          counterId: 'MI~R~[' + this.$routeParams.resourceId +
          '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Rejected Web Sessions',
          start: this.startTimeStamp,
          end: this.endTimeStamp, buckets: 60
        }, (data) => {
          tmpChartWebSessionData[tmpChartWebSessionData.length] = {
            key: 'Rejected Sessions',
            color: AppServerWebDetailsController.REJECTED_COLOR,
            values: MetricsService.formatBucketedChartOutput(data)
          };
        }, this).$promise);
      }
      /* FIXME: Currently this is always returning negative values, as WFLY returns -1 per webapp. is it config value?
       this.HawkularMetric.CounterMetricData(this.$rootScope.currentPersona.id).queryMetrics({
       counterId: 'MI~R~[' + this.$routeParams.resourceId +
       '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Max Active Web Sessions',
       start: this.startTimeStamp,
       end: this.endTimeStamp, buckets:60}, (data) => {
       this.chartWebSessionData[3] = { key: 'Max Active Sessions',
       color: AppServerWebDetailsController.MAX_ACTIVE_COLOR, values: this.formatBucketedChartOutput(data) };
       }, this);
       */

      /*
       this.HawkularMetric.CounterMetricData(this.$rootScope.currentPersona.id).queryMetrics({
       counterId: 'MI~R~[' + this.$routeParams.resourceId +
       '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Servlet Request Time',
       start: this.startTimeStamp,
       end: this.endTimeStamp, buckets:60}, (data) => {
       this.chartWebData[4] = { key: 'NonHeap Committed',
       color: AppServerWebDetailsController.COMMITTED_COLOR, values: this.formatCounterChartOutput(data) };
       }, this);
       this.HawkularMetric.CounterMetricData(this.$rootScope.currentPersona.id).queryMetrics({
       counterId: 'MI~R~[' + this.$routeParams.resourceId +
       '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Servlet Request Count',
       start: this.startTimeStamp,
       end: this.endTimeStamp, buckets:60}, (data) => {
       this.chartWebData[5] = { key: 'NonHeap Used',
       color: AppServerWebDetailsController.USED_COLOR, values: this.formatCounterChartOutput(data) };
       }, this);
       */
      this.$q.all(promises).finally(()=> {
        this.chartWebSessionData = tmpChartWebSessionData;
      });
    }

    public toggleChartData(name): void {
      this.skipChartData[name] = !this.skipChartData[name];
      this.getWebChartData();
    }
  }


  _module.controller('AppServerWebDetailsController', AppServerWebDetailsController);
}
