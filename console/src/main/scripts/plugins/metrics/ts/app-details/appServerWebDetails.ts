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

/// <reference path="../metricsPlugin.ts"/>

module HawkularMetrics {

  class WebTabType {

    static ACTIVE_SESSIONS = new WebTabType( 'Aggregated Active Web Sessions','Active Sessions', '#49a547');
    static EXPIRED_SESSIONS = new WebTabType('Aggregated Expired Web Sessions','Expired Sessions', '#f57f20');
    static REJECTED_SESSIONS = new WebTabType('Aggregated Rejected Web Sessions','Rejected Sessions', '#e12226');

    static SERVLET_REQUEST_TIME = new WebTabType('Aggregated Servlet Request Time');
    static SERVLET_REQUEST_COUNT = new WebTabType('Aggregated Servlet Request Count');

    private _key:string;
    private _metricName:string;
    private _color:IColor;

    constructor(metricName:string, key?: string, color?:IColor) {
      this._metricName = metricName;
      this._key = key;
      this._color = color;
    }

    public getKey() {
      return this._key;
    }
    public getFullWildflyMetricName() {
      return 'WildFly Aggregated Web Metrics~' + this._metricName;
    }

    public getMetricName() {
      return this._metricName;
    }

    public getColor() {
      return this._color;
    }

  }

  export class AppServerWebDetailsController implements IRefreshable {

    //public static MAX_ACTIVE_COLOR = '#1884c7'; /// blue
    public static DEFAULT_MIN_SESSIONS = 20;
    public static DEFAULT_MAX_SESSIONS = 5000;
    public static DEFAULT_EXPIRED_SESSIONS_THRESHOLD = 15;
    public static DEFAULT_REJECTED_SESSIONS_THRESHOLD = 15;

    public alertList:any[] = [];
    public activeWebSessions:number = 0;
    public requestTime:number = 0;
    public requestCount:number = 0;
    public startTimeStamp:TimestampInMillis;
    public endTimeStamp:TimestampInMillis;

    public chartWebSessionData:IMultiDataPoint[] = [];
    public contextChartActiveWebSessionData:IContextChartDataPoint[];

    // will contain in the format: 'metric name' : true | false
    public skipChartData = {};

    private feedId:FeedId;
    private resourceId:ResourceId;

    constructor(private $scope:any,
                private $rootScope:IHawkularRootScope,
                private $interval:ng.IIntervalService,
                private $log:ng.ILogService,
                private $routeParams:any,
                private HawkularNav:any,
                private HawkularAlertRouterManager:IHawkularAlertRouterManager,
                private $q:ng.IQService,
                private MetricsService:IMetricsService) {
      $scope.vm = this;

      this.feedId = this.$routeParams.feedId;
      this.resourceId = this.$routeParams.resourceId + '~~';

      this.startTimeStamp = +moment().subtract(($routeParams.timeOffset || 3600000), 'milliseconds');
      this.endTimeStamp = +moment();

      if ($rootScope.currentPersona) {
        this.refresh();
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) => currentPersona && this.refresh());
      }

      // handle drag ranges on charts to change the time range
      this.$scope.$on(EventNames.CHART_TIMERANGE_CHANGED, (event, timeRange:Date[]) => {
        this.startTimeStamp = timeRange[0].getTime();
        this.endTimeStamp = timeRange[1].getTime();
        this.HawkularNav.setTimestampStartEnd(this.startTimeStamp, this.endTimeStamp);
        this.refresh();
      });

      // handle drag ranges on charts to change the time range
      this.$scope.$on(EventNames.CONTEXT_CHART_TIMERANGE_CHANGED, (event, timeRange:Date[]) => {
        this.$log.debug('Received ContextChartTimeRangeChanged event' + timeRange);
        this.changeTimeRange(timeRange);
      });

      this.HawkularAlertRouterManager.registerForAlerts(
        this.$routeParams.feedId + '/' + this.$routeParams.resourceId,
        'web',
        _.bind(this.filterAlerts, this)
      );

      this.autoRefresh(20);
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

    private changeTimeRange(timeRange:Date[]):void {
      this.startTimeStamp = timeRange[0].getTime();
      this.endTimeStamp = timeRange[1].getTime();
      this.HawkularNav.setTimestampStartEnd(this.startTimeStamp, this.endTimeStamp);
      this.refresh();
    }

    public filterAlerts(alertData:IHawkularAlertQueryResult) {
      let webAlerts = alertData.alertList.slice();
      _.remove(webAlerts, (item:IAlert) => {
        switch (item.context.alertType) {
          case 'ACTIVE_SESSIONS' :
          case 'EXPIRED_SESSIONS' :
          case 'REJECTED_SESSIONS' :
            item.alertType = item.context.alertType;
            return false;
          default :
            return true; // ignore non-web alert
        }
      });
      this.alertList = webAlerts;
    }

    public refresh():void {
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      this.getWebData();
      this.getWebChartData();
      this.getAlerts();
    }

    private getAlerts():void {
      this.HawkularAlertRouterManager.getAlertsForCurrentResource(
        this.startTimeStamp,
        this.endTimeStamp
      );
    }

    public getWebData():void {
      this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId,
          WebTabType.ACTIVE_SESSIONS.getFullWildflyMetricName()),
        this.startTimeStamp, this.endTimeStamp, 1).then((resource) => {
        this.activeWebSessions = resource[0].avg;
      });
      this.MetricsService.retrieveCounterMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId,
          WebTabType.SERVLET_REQUEST_TIME.getFullWildflyMetricName()),
        this.startTimeStamp, this.endTimeStamp, 1).then((resource) => {
        this.requestTime = resource[0].max - resource[0].min;
      });
      this.MetricsService.retrieveCounterMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId,
          WebTabType.SERVLET_REQUEST_COUNT.getFullWildflyMetricName()),
        this.startTimeStamp, this.endTimeStamp, 1).then((resource) => {
        this.requestCount = resource[0].max - resource[0].min;
      });
    }

    private getWebSessionContextChartData():void {
      // because the time range is so much greater here we need more points of granularity
      const contextStartTimestamp = +moment(this.endTimeStamp).subtract(1, globalContextChartTimePeriod);

      this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId,
          WebTabType.ACTIVE_SESSIONS.getFullWildflyMetricName()),
        contextStartTimestamp, this.endTimeStamp, globalNumberOfContextChartDataPoints).then((contextData) => {
        this.contextChartActiveWebSessionData = MetricsService.formatContextChartOutput(contextData);
      });

    }

    public getWebChartData():void {
      let tmpChartWebSessionData = [];
      let promises = [];

      if (!this.skipChartData[WebTabType.ACTIVE_SESSIONS.getKey()]) {
        let activeSessionsPromise = this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
          MetricsService.getMetricId('M', this.feedId, this.resourceId,
            WebTabType.ACTIVE_SESSIONS.getFullWildflyMetricName()),
          this.startTimeStamp, this.endTimeStamp, 60);
        promises.push(activeSessionsPromise);
        activeSessionsPromise.then((data) => {
          tmpChartWebSessionData[tmpChartWebSessionData.length] = {
            key: WebTabType.ACTIVE_SESSIONS.getKey(),
            color: WebTabType.ACTIVE_SESSIONS.getColor(),
            values: MetricsService.formatBucketedChartOutput(data)
          };
        });
      }
      if (!this.skipChartData[WebTabType.EXPIRED_SESSIONS.getKey()]) {
        let expSessionsPromise = this.MetricsService.retrieveCounterMetrics(this.$rootScope.currentPersona.id,
          MetricsService.getMetricId('M', this.feedId, this.resourceId,
            WebTabType.EXPIRED_SESSIONS.getFullWildflyMetricName()),
          this.startTimeStamp, this.endTimeStamp, 60);
        promises.push(expSessionsPromise);
        expSessionsPromise.then((data) => {
          tmpChartWebSessionData[tmpChartWebSessionData.length] = {
            key: WebTabType.EXPIRED_SESSIONS.getKey(),
            color: WebTabType.EXPIRED_SESSIONS.getColor(),
            values: MetricsService.formatBucketedChartOutput(data)
          };
        });
      }
      if (!this.skipChartData[WebTabType.EXPIRED_SESSIONS.getKey()]) {
        let rejSessionsPromise = this.MetricsService.retrieveCounterMetrics(this.$rootScope.currentPersona.id,
          MetricsService.getMetricId('M', this.feedId, this.resourceId,
            WebTabType.REJECTED_SESSIONS.getFullWildflyMetricName()),
          this.startTimeStamp, this.endTimeStamp, 60);
        promises.push(rejSessionsPromise);
        rejSessionsPromise.then((data) => {
          tmpChartWebSessionData[tmpChartWebSessionData.length] = {
            key: WebTabType.EXPIRED_SESSIONS.getKey(),
            color: WebTabType.REJECTED_SESSIONS.getColor(),
            values: MetricsService.formatBucketedChartOutput(data)
          };
        });
      }
      /* FIXME: Currently this is always returning negative values, as WFLY returns -1 per webapp. is it config value?
       this.HawkularMetric.CounterMetricData(this.$rootScope.currentPersona.id).queryMetrics({
       counterId: 'MI~R~[' + this.resourceId +
       '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Max Active Web Sessions',
       start: this.startTimeStamp,
       end: this.endTimeStamp, buckets:60}, (data) => {
       this.chartWebSessionData[3] = { key: 'Max Active Sessions',
       color: AppServerWebDetailsController.MAX_ACTIVE_COLOR, values: this.formatBucketedChartOutput(data) };
       }, this);
       */

      /*
       this.HawkularMetric.CounterMetricData(this.$rootScope.currentPersona.id).queryMetrics({
       counterId: 'MI~R~[' + this.resourceId +
       '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Servlet Request Time',
       start: this.startTimeStamp,
       end: this.endTimeStamp, buckets:60}, (data) => {
       this.chartWebData[4] = { key: 'NonHeap Committed',
       color: AppServerWebDetailsController.COMMITTED_COLOR, values: this.formatCounterChartOutput(data) };
       }, this);
       this.HawkularMetric.CounterMetricData(this.$rootScope.currentPersona.id).queryMetrics({
       counterId: 'MI~R~[' + this.resourceId +
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
