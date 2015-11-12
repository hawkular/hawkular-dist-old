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

  export class WebAlertType {

    constructor (public value:string) {
    }

    toString = () => {
      return this.value;
    };

    static ACTIVE_SESSIONS = new WebAlertType('ACTIVE_SESSIONS');
    static EXPIRED_SESSIONS = new WebAlertType('EXPIRED_SESSIONS');
    static REJECTED_SESSIONS = new WebAlertType('REJECTED_SESSIONS');
  }

  export class AppServerWebDetailsController implements IRefreshable {

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
    public resourceId;
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
                private HawkularNav:any,
                private HawkularAlertsManager:IHawkularAlertsManager,
                private ErrorsManager:IErrorsManager,
                private $q:ng.IQService,
                private MetricsService:IMetricsService) {
      $scope.vm = this;

      this.resourceId = this.$routeParams.resourceId;
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

      // handle drag ranges on charts to change the time range
      this.$scope.$on('ChartTimeRangeChanged', (event, data:Date[]) => {
        this.startTimeStamp = data[0].getTime();
        this.endTimeStamp = data[1].getTime();
        this.HawkularNav.setTimestampStartEnd(this.startTimeStamp, this.endTimeStamp);
        this.refresh();
      });

      this.getAlerts(this.$routeParams.resourceId, this.startTimeStamp, this.endTimeStamp);

      this.autoRefresh(20);
    }

    private getAlerts(resourceId:string, startTime:TimestampInMillis, endTime:TimestampInMillis):void {
      let webArray: IAlert[];
      let webPromise = this.HawkularAlertsManager.queryAlerts({
        statuses: 'OPEN',
        tags: 'resourceId|' + resourceId,
        startTime: startTime,
        endTime: endTime
      }).then((webData)=> {
        _.remove(webData.alertList, (item) => {
          switch( item.context.alertType ) {
            case 'ACTIVE_SESSIONS' :
            case 'EXPIRED_SESSIONS' :
            case 'REJECTED_SESSIONS' :
              item['alertType'] = item.context.alertType;
              return false;
            default : return true; // ignore non-web alert
          }
        });
        webArray = webData.alertList;
      }, (error) => {
        return this.ErrorsManager.errorHandler(error, 'Error fetching web alerts.');
      });

      this.$q.all([webPromise]).finally(()=> {
        this.alertList = webArray;
      });
    }

    private autoRefreshPromise:ng.IPromise<number>;

    private autoRefresh(intervalInSeconds:number):void {
      this.autoRefreshPromise = this.$interval(() => {
        this.refresh();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    public refresh():void {
      this.getWebData();
      this.getWebChartData();
    }

    public getWebData():void {
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
        `MI~R~[${this.$routeParams.resourceId}~~]~MT~WildFly Aggregated Web Metrics~Aggregated Active Web Sessions`,
        this.startTimeStamp, this.endTimeStamp, 1).then((resource) => {
          this.activeWebSessions = resource[0].avg;
        });
      this.MetricsService.retrieveCounterMetrics(this.$rootScope.currentPersona.id,
        `MI~R~[${this.$routeParams.resourceId}~~]~MT~WildFly Aggregated Web Metrics~Aggregated Servlet Request Time`,
        this.startTimeStamp, this.endTimeStamp, 1).then((resource) => {
          this.requestTime = resource[0].max - resource[0].min;
        });
      this.MetricsService.retrieveCounterMetrics(this.$rootScope.currentPersona.id,
        `MI~R~[${this.$routeParams.resourceId}~~]~MT~WildFly Aggregated Web Metrics~Aggregated Servlet Request Count`,
        this.startTimeStamp, this.endTimeStamp, 1).then((resource) => {
          this.requestCount = resource[0].max - resource[0].min;
        });
    }

    public getWebChartData():void {

      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      let tmpChartWebSessionData = [];
      let promises = [];

      if (!this.skipChartData['Active Sessions']) {
        let activeSessionsPromise = this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
          `MI~R~[${this.$routeParams.resourceId}~~]~MT~WildFly Aggregated Web Metrics~Aggregated Active Web Sessions`,
          this.startTimeStamp, this.endTimeStamp, 60);
        promises.push(activeSessionsPromise);
        activeSessionsPromise.then((data) => {
          tmpChartWebSessionData[tmpChartWebSessionData.length] = {
            key: 'Active Sessions',
            color: AppServerWebDetailsController.ACTIVE_COLOR,
            values: MetricsService.formatBucketedChartOutput(data)
          };
        });
      }
      if (!this.skipChartData['Expired Sessions']) {
        let expSessionsPromise = this.MetricsService.retrieveCounterMetrics(this.$rootScope.currentPersona.id,
          `MI~R~[${this.$routeParams.resourceId}~~]~MT~WildFly Aggregated Web Metrics~Aggregated Expired Web Sessions`,
          this.startTimeStamp, this.endTimeStamp, 60);
        promises.push(expSessionsPromise);
        expSessionsPromise.then((data) => {
          tmpChartWebSessionData[tmpChartWebSessionData.length] = {
            key: 'Expired Sessions',
            color: AppServerWebDetailsController.EXPIRED_COLOR,
            values: MetricsService.formatBucketedChartOutput(data)
          };
        });
      }
      if (!this.skipChartData['Rejected Sessions']) {
        let rejSessionsPromise = this.MetricsService.retrieveCounterMetrics(this.$rootScope.currentPersona.id,
          `MI~R~[${this.$routeParams.resourceId}~~]~MT~WildFly Aggregated Web Metrics~Aggregated Rejected Web Sessions`,
          this.startTimeStamp, this.endTimeStamp, 60);
        promises.push(rejSessionsPromise);
        rejSessionsPromise.then((data) => {
          tmpChartWebSessionData[tmpChartWebSessionData.length] = {
            key: 'Rejected Sessions',
            color: AppServerWebDetailsController.REJECTED_COLOR,
            values: MetricsService.formatBucketedChartOutput(data)
          };
        });
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

    public toggleChartData(name):void {
      this.skipChartData[name] = !this.skipChartData[name];
      this.getWebChartData();
    }
  }


  _module.controller('AppServerWebDetailsController', AppServerWebDetailsController);
}
