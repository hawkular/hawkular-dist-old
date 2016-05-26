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

  export interface IMultiDataPoint {
    key: string;
    color: string;
    values: IChartDataPoint[];
  }

  class JVMMetricsTabType {

    private _key: string;
    private _metricName: string;
    private _color: IColor;
    private _statisticsKey: string;

    public static HEAP_COMMITTED = new JVMMetricsTabType('Heap Committed', 'Heap Committed', '#515252');
    public static HEAP_USED = new JVMMetricsTabType('Heap Used', 'Heap Used', '#1884c7', 'heapUsage');
    public static HEAP_MAX = new JVMMetricsTabType('Heap Max', 'Heap Max', '#f57f20', 'heapMax');

    public static NON_HEAP_COMMITTED = new JVMMetricsTabType('NonHeap Committed');
    public static NON_HEAP_USED = new JVMMetricsTabType('NonHeap Used');

    public static ACCUMULATED_GC_DURATION = new JVMMetricsTabType('Accumulated GC Duration', undefined, undefined,
      'accGCDuration');

    constructor(metricName: string, key?: string, color?: IColor, statisticsKey?: string) {
      this._metricName = metricName;
      this._key = key;
      this._color = color;
      this._statisticsKey = statisticsKey;
    }

    public getKey() {
      if (!this._key) {
        return this._metricName;
      } else {
        return this._key;
      }
    }

    public getMetricName() {
      return this._metricName;
    }

    public getWildflyFullMetricName() {
      return 'WildFly Memory Metrics~' + this._metricName;
    }

    public getColor() {
      return this._color;
    }

    public getStatisticsKey() {
      return this._statisticsKey;
    }

  }

  export class AppServerJvmDetailsController implements IRefreshable {

    public static MAX_HEAP = 1024 * 1024 * 1024;
    public static BYTES2MB = 1 / 1024 / 1024;

    public math = Math;

    public alertList: any[] = [];
    public chartHeapData: IMultiDataPoint[];
    public chartNonHeapData: IMultiDataPoint[];
    public startTimeStamp: TimestampInMillis;
    public endTimeStamp: TimestampInMillis;
    public chartGCDurationData: IChartDataPoint[];

    public contextChartHeapUsedData: IContextChartDataPoint[];
    public contextChartNonHeapUsedData: IContextChartDataPoint[];
    public contextChartGCDurationData: IContextChartDataPoint[];
    public predictedData: any = {};

    // will contain in the format: 'metric name' : true | false
    public skipChartData = {};

    private feedId: FeedId;
    private resourceId: ResourceId;

    constructor(private $scope: any,
      private $rootScope: IHawkularRootScope,
      private $interval: ng.IIntervalService,
      private $routeParams: any,
      private $log: ng.ILogService,
      private HawkularNav: any,
      private HawkularAlertRouterManager: IHawkularAlertRouterManager,
      private MetricsService: IMetricsService,
      private $q: ng.IQService) {
      $scope.vm = this;

      this.feedId = this.$routeParams.feedId;
      this.resourceId = this.$routeParams.resourceId + '~~';

      this.startTimeStamp = +moment().subtract(($routeParams.timeOffset || 3600000), 'milliseconds');
      this.endTimeStamp = +moment();
      this.chartHeapData = [];
      this.chartNonHeapData = [];

      if ($rootScope.currentPersona) {
        this.refresh();
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona',
          (currentPersona) => currentPersona && this.refresh());
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

      this.HawkularAlertRouterManager.registerForAlerts(
        this.$routeParams.feedId + '/' + this.$routeParams.resourceId,
        'jvm',
        _.bind(this.filterAlerts, this)
      );
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

    public refresh(): void {
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      this.getJvmContextChartData();
      this.getJvmData();
      this.getAlerts();

      this.$rootScope.lastUpdateTimestamp = new Date();
    }

    public filterAlerts(alertData: IHawkularAlertQueryResult) {
      let alertList = alertData.alertList;
      _.remove(alertList, (item: IAlert) => {
        switch (item.context.alertType) {
          case 'PHEAP':
          case 'NHEAP':
          case 'GARBA':
            item.alertType = item.context.alertType;
            return false;
          default:
            return true;
        }
      });
      this.alertList = alertList;
    }

    private getAlerts(): void {
      this.HawkularAlertRouterManager.getAlertsForCurrentResource(
        this.startTimeStamp,
        this.endTimeStamp
      );
    }

    public getJvmData(): void {
      this.getJvmAggregateStatistics();
      this.getJvmChartData();
    }

    private getJvmAggregateStatistics(): void {

      this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId,
          JVMMetricsTabType.HEAP_USED.getWildflyFullMetricName()),
        this.startTimeStamp, this.endTimeStamp, 1).then((resource: IChartDataPoint[]) => {
          if (resource.length) {
            this[JVMMetricsTabType.HEAP_USED.getStatisticsKey()] = resource[0];
          }
        });
      this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId,
          JVMMetricsTabType.HEAP_MAX.getWildflyFullMetricName()),
        this.startTimeStamp, this.endTimeStamp, 1).then((resource) => {
          if (resource.length) {
            this[JVMMetricsTabType.HEAP_MAX.getStatisticsKey()] = resource[0];
            AppServerJvmDetailsController.MAX_HEAP = resource[0].max;
          }
        });
      this.MetricsService.retrieveCounterMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId,
          JVMMetricsTabType.ACCUMULATED_GC_DURATION.getWildflyFullMetricName()),
        this.startTimeStamp, this.endTimeStamp, 1).then((resource) => {
          if (resource.length) {
            this[JVMMetricsTabType.ACCUMULATED_GC_DURATION.getStatisticsKey()] = (resource[0].max - resource[0].min);
          }
        });
    }

    private getJvmContextChartData(): void {
      // because the time range is so much greater here we need more points of granularity
      const contextStartTimestamp = +moment(this.endTimeStamp).subtract(1, globalContextChartTimePeriod);

      this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId,
          JVMMetricsTabType.HEAP_USED.getWildflyFullMetricName()),
        contextStartTimestamp, this.endTimeStamp, globalNumberOfContextChartDataPoints).then((contextData) => {
          this.contextChartHeapUsedData = MetricsService.formatContextChartOutput(contextData);
        });

      this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId,
          JVMMetricsTabType.NON_HEAP_USED.getWildflyFullMetricName()),
        contextStartTimestamp, this.endTimeStamp, globalNumberOfContextChartDataPoints).then((contextData) => {
          this.contextChartNonHeapUsedData = MetricsService.formatContextChartOutput(contextData);
        });

      this.MetricsService.retrieveCounterRateMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId,
          JVMMetricsTabType.ACCUMULATED_GC_DURATION.getWildflyFullMetricName()),
        contextStartTimestamp, this.endTimeStamp, globalNumberOfContextChartDataPoints).then((contextData) => {
          this.contextChartGCDurationData = MetricsService.formatContextChartOutput(contextData);
        });

    }

    private getJvmChartData(): void {
      let tmpChartHeapData = [];
      let heapPromises = [];
      let tmpChartNonHeapData = [];
      let nonHeapPromises = [];

      const heapCommitted = JVMMetricsTabType.HEAP_COMMITTED;
      if (!this.skipChartData[heapCommitted.getKey()]) {
        let hCommPromise = this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
          MetricsService.getMetricId('M', this.feedId, this.resourceId,
            heapCommitted.getWildflyFullMetricName()),
          this.startTimeStamp, this.endTimeStamp, 60);
        heapPromises.push(hCommPromise);
        hCommPromise.then((data) => {
          tmpChartHeapData[tmpChartHeapData.length] = {
            key: heapCommitted.getKey(),
            color: heapCommitted.getColor(),
            values: MetricsService.formatBucketedChartOutput(data, AppServerJvmDetailsController.BYTES2MB)
          };
        });
      }

      const heapUsed = JVMMetricsTabType.HEAP_USED;
      if (!this.skipChartData[heapUsed.getKey()]) {

        let hUsedPromise = this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
          MetricsService.getMetricId('M', this.feedId, this.resourceId,
            heapUsed.getWildflyFullMetricName()),
          this.startTimeStamp, this.endTimeStamp, 60);
        heapPromises.push(hUsedPromise);
        hUsedPromise.then((data) => {
          let chartHeapDataUsed = MetricsService.formatBucketedChartOutput(data,
            AppServerJvmDetailsController.BYTES2MB);
          tmpChartHeapData[tmpChartHeapData.length] = {
            key: heapUsed.getKey(),
            color: heapUsed.getColor(),
            values: chartHeapDataUsed
          };
        });
      }

      const heapMax = JVMMetricsTabType.HEAP_MAX;
      if (!this.skipChartData[heapMax.getKey()]) {
        let hMaxPromise = this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
          MetricsService.getMetricId('M', this.feedId, this.resourceId,
            heapMax.getWildflyFullMetricName()),
          this.startTimeStamp, this.endTimeStamp, 60);
        heapPromises.push(hMaxPromise);
        hMaxPromise.then((data) => {
          tmpChartHeapData[tmpChartHeapData.length] = {
            key: heapMax.getKey(),
            color: heapMax.getColor(),
            values: MetricsService.formatBucketedChartOutput(data, AppServerJvmDetailsController.BYTES2MB)
          };
        });
      }
      this.$q.all(heapPromises).finally(() => {
        this.chartHeapData = tmpChartHeapData;
      });

      const nonHeapCommitted = JVMMetricsTabType.NON_HEAP_COMMITTED;
      if (!this.skipChartData[nonHeapCommitted.getKey()]) {
        let nhCommPromise = this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
          MetricsService.getMetricId('M', this.feedId, this.resourceId,
            nonHeapCommitted.getWildflyFullMetricName()),
          this.startTimeStamp, this.endTimeStamp, 60);
        nonHeapPromises.push(nhCommPromise);
        nhCommPromise.then((data) => {
          tmpChartNonHeapData[tmpChartNonHeapData.length] = {
            key: nonHeapCommitted.getKey(),
            color: nonHeapCommitted.getColor(),
            values: MetricsService.formatBucketedChartOutput(data, AppServerJvmDetailsController.BYTES2MB)
          };
        });
      }

      const nonHeapUsed = JVMMetricsTabType.NON_HEAP_USED;
      if (!this.skipChartData[nonHeapUsed.getKey()]) {
        let nhUsedPromise = this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
          MetricsService.getMetricId('M', this.feedId, this.resourceId,
            nonHeapUsed.getWildflyFullMetricName()),
          this.startTimeStamp, this.endTimeStamp, 60);
        nonHeapPromises.push(nhUsedPromise);
        nhUsedPromise.then((data) => {
          tmpChartNonHeapData[tmpChartNonHeapData.length] = {
            key: nonHeapUsed.getKey(),
            color: nonHeapUsed.getColor(),
            values: MetricsService.formatBucketedChartOutput(data, AppServerJvmDetailsController.BYTES2MB)
          };
        });
      }
      this.$q.all(nonHeapPromises).finally(() => {
        this.chartNonHeapData = tmpChartNonHeapData;
      });

      const accumulatedGCDuration = JVMMetricsTabType.ACCUMULATED_GC_DURATION;
      this.MetricsService.retrieveCounterRateMetrics(this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId,
          accumulatedGCDuration.getWildflyFullMetricName()),
        this.startTimeStamp, this.endTimeStamp, 60).then((resource) => {
          if (resource.length) {
            this.chartGCDurationData = MetricsService.formatBucketedChartOutput(resource);
          }
        });
    }

    public toggleChartData(name): void {
      this.skipChartData[name] = !this.skipChartData[name];
      this.getJvmChartData();
    }

  }

  _module.controller('AppServerJvmDetailsController', AppServerJvmDetailsController);

}
