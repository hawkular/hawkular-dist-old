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
/// <reference path="../alertsManager.ts"/>
/// <reference path="../errorManager.ts"/>

module HawkularMetrics {

  export interface IMultiDataPoint {
    key: string;
    color: string;
    values: IChartDataPoint[];
  }

  export class AppServerJvmDetailsController {
    /// this is for minification purposes
    public static $inject = ['$location', '$scope', '$rootScope', '$interval', '$log', '$filter', '$routeParams',
      '$modal', '$window', 'HawkularInventory', 'HawkularMetric', 'HawkularAlert', 'HawkularAlertsManager',
      'HawkularErrorManager', '$q', 'md5'];

    public static USED_COLOR = '#1884c7'; /// blue
    public static MAXIMUM_COLOR = '#f57f20'; /// orange
    public static COMMITTED_COLOR = '#515252'; /// dark gray

    public static MAX_HEAP = 1024*1024*1024;

    public alertList;
    public chartHeapData: IMultiDataPoint[];
    public chartNonHeapData: IMultiDataPoint[];
    public startTimeStamp:TimestampInMillis;
    public endTimeStamp:TimestampInMillis;
    public chartGCDurationData: IChartDataPoint[];

    constructor(private $location: ng.ILocationService,
      private $scope: any,
      private $rootScope: IHawkularRootScope,
      private $interval: ng.IIntervalService,
      private $log: ng.ILogService,
      private $filter: ng.IFilterService,
      private $routeParams: any,
      private $modal: any,
      private $window: any,
      private HawkularInventory: any,
      private HawkularMetric: any,
      private HawkularAlert: any,
      private HawkularAlertsManager: HawkularMetrics.IHawkularAlertsManager,
      private HawkularErrorManager: HawkularMetrics.IHawkularErrorManager,
      private $q: ng.IQService,
      private md5: any ) {
        $scope.vm = this;

        this.startTimeStamp = +moment().subtract(($routeParams.timeOffset || 3600000), 'milliseconds');
        this.endTimeStamp = +moment();
        this.chartHeapData = [];
        this.chartNonHeapData = [];

        if ($rootScope.currentPersona) {
          this.getJvmData();
        } else {
          // currentPersona hasn't been injected to the rootScope yet, wait for it..
          $rootScope.$watch('currentPersona',
            (currentPersona) => currentPersona && this.getJvmData());
        }

        //var metricId = 'MI~R~[' + this.$routeParams.resourceId + '~/]~MT~WildFly Memory Metrics~Heap Used';

        this.getAlerts(this.$routeParams.resourceId + '_jvm_pheap', this.startTimeStamp, this.endTimeStamp);

        this.autoRefresh(20);
    }

    private getAlerts(metricId:string, startTime:TimestampInMillis, endTime:TimestampInMillis):void {
      this.HawkularAlertsManager.queryAlerts(metricId, startTime, endTime,
        HawkularMetrics.AlertType.THRESHOLD).then((data)=> {
          this.alertList = data.alertList;
        }, (error) => {
          return this.HawkularErrorManager.errorHandler(error, 'Error fetching alerts.');
        });
    }

    private autoRefreshPromise: ng.IPromise<number>;

    private formatBucketedChartOutput(response):IChartDataPoint[] {
      function convertBytesToMegaBytes(bytes:number):number { return bytes / 1024 / 1024; }

      //  The schema is different for bucketed output
      return _.map(response, (point:IChartDataPoint) => {
        return {
          timestamp: point.start,
          date: new Date(point.start),
          value: !angular.isNumber(point.value) ? 0 : point.value,
          avg: (point.empty) ? 0 : convertBytesToMegaBytes(point.avg),
          min: !angular.isNumber(point.min) ? 0 : point.min,
          max: !angular.isNumber(point.max) ? 0 : point.max,
          percentile95th: !angular.isNumber(point.percentile95th) ? 0 : point.percentile95th,
          median: !angular.isNumber(point.median) ? 0 : point.median,
          empty: point.empty
        };
      });
    }

    private formatCounterChartOutput(response, buckets = 60):IChartDataPoint[] {
      var result = response;
      /// FIXME: Simulating buckets.. this should come from metrics.
      if (response.length > buckets) {
        var step = this.$window.Math.floor(response.length / buckets);
        result = [];
        var accValue = 0;
        _.forEach(response, function(point:any, idx) {
          if (parseInt(idx, 10) % step === (step-1)) {
            result.push({timestamp: point.timestamp, value: accValue });
            accValue = 0;
          }
          else {
            accValue += point.value;
          }
        });
      }

      //  The schema is different for bucketed output
      return _.map(result, (point:IChartDataPoint, idx) => {
        var theValue = idx === 0 ? 0 : (result[idx-1].value - point.value);
        return {
          timestamp: point.timestamp,
          date: new Date(point.timestamp),
          value: theValue,
          avg: theValue,
          min: theValue,
          max: theValue,
          percentile95th: theValue,
          median: theValue,
          empty: !angular.isNumber(point.value)
        };
      });
    }

    public autoRefresh(intervalInSeconds: number): void {
      this.autoRefreshPromise = this.$interval(() => {
        this.getJvmData();
        this.getJvmChartData();
        this.getAlerts(this.$routeParams.resourceId + '_jvm_pheap', this.startTimeStamp, this.endTimeStamp);
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    public getJvmData(): any {
      this.alertList = []; // FIXME: when we have alerts for app server
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~/]~MT~WildFly Memory Metrics~Heap Used',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 1}, (resource) => {
          this['heapUsage'] = resource[0];
        }, this);
      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~/]~MT~WildFly Memory Metrics~Heap Max',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 1}, (resource) => {
          this['heapMax'] = resource[0];
          AppServerJvmDetailsController.MAX_HEAP = resource[0].max;
        }, this);
      this.HawkularMetric.CounterMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        counterId: 'MI~R~[' + this.$routeParams.resourceId + '~/]~MT~WildFly Memory Metrics~Accumulated GC Duration',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 1}, (resource) => {
          this['accGCDuration'] = resource[0].value - resource[resource.length-1].value;
          this.chartGCDurationData = this.formatCounterChartOutput(resource);
        }, this);
      this.getJvmChartData();
    }

    public getJvmChartData(): any {

      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~/]~MT~WildFly Memory Metrics~Heap Committed',
        start: this.startTimeStamp,
        end: this.endTimeStamp, buckets:60}, (data) => {
          this.chartHeapData[0] = { key: 'Heap Committed',
            color: AppServerJvmDetailsController.COMMITTED_COLOR, values: this.formatBucketedChartOutput(data) };
        }, this);
      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~/]~MT~WildFly Memory Metrics~Heap Used',
        start: this.startTimeStamp,
        end: this.endTimeStamp, buckets:60}, (data) => {
          this.chartHeapData[1] = { key: 'Heap Used',
            color: AppServerJvmDetailsController.USED_COLOR, values: this.formatBucketedChartOutput(data) };
        }, this);
      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~/]~MT~WildFly Memory Metrics~Heap Max',
        start: this.startTimeStamp,
        end: this.endTimeStamp, buckets:60}, (data) => {
          this.chartHeapData[2] = { key: 'Heap Max',
            color: AppServerJvmDetailsController.MAXIMUM_COLOR, values: this.formatBucketedChartOutput(data) };
        }, this);

      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~/]~MT~WildFly Memory Metrics~NonHeap Committed',
        start: this.startTimeStamp,
        end: this.endTimeStamp, buckets:60}, (data) => {
          this.chartNonHeapData[0] = { key: 'NonHeap Committed',
            color: AppServerJvmDetailsController.COMMITTED_COLOR, values: this.formatBucketedChartOutput(data) };
        }, this);
      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~/]~MT~WildFly Memory Metrics~NonHeap Used',
        start: this.startTimeStamp,
        end: this.endTimeStamp, buckets:60}, (data) => {
          this.chartNonHeapData[1] = { key: 'NonHeap Used',
            color: AppServerJvmDetailsController.USED_COLOR, values: this.formatBucketedChartOutput(data) };
        }, this);
    }




  }

  _module.controller('HawkularMetrics.AppServerJvmDetailsController', AppServerJvmDetailsController);

}
