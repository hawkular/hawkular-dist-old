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

  export interface IMultiDataPoint {
    key: string;
    color: string;
    values: IChartDataPoint[];
  }

  export class AppServerJvmDetailsController {
    /// this is for minification purposes
    public static $inject = ['$location', '$scope', '$rootScope', '$interval', '$log', '$filter', '$routeParams',
      '$modal', '$window', 'HawkularInventory', 'HawkularMetric', 'HawkularAlertsManager',
      'ErrorsManager', '$q', 'md5'];

    public static USED_COLOR = '#1884c7'; /// blue
    public static MAXIMUM_COLOR = '#f57f20'; /// orange
    public static COMMITTED_COLOR = '#515252'; /// dark gray

    public static MAX_HEAP = 1024 * 1024 * 1024;
    public math = this.$window.Math;

    public alertList;
    public chartHeapData:IMultiDataPoint[];
    public chartNonHeapData:IMultiDataPoint[];
    public startTimeStamp:TimestampInMillis;
    public endTimeStamp:TimestampInMillis;
    public chartGCDurationData:IChartDataPoint[];

    constructor(private $location:ng.ILocationService,
                private $scope:any,
                private $rootScope:IHawkularRootScope,
                private $interval:ng.IIntervalService,
                private $log:ng.ILogService,
                private $filter:ng.IFilterService,
                private $routeParams:any,
                private $modal:any,
                private $window:any,
                private HawkularInventory:any,
                private HawkularMetric:any,
                private HawkularAlertsManager:IHawkularAlertsManager,
                private ErrorsManager:IErrorsManager,
                private $q:ng.IQService,
                private md5:any) {
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

      this.getAlerts(this.$routeParams.resourceId, this.startTimeStamp, this.endTimeStamp);

      this.autoRefresh(20);
    }

    private getAlerts(metricIdPrefix:string, startTime:TimestampInMillis, endTime:TimestampInMillis):void {
      let pheapArray:any, nheapArray:any, garbaArray:any;
      let pheapPromise = this.HawkularAlertsManager.queryAlerts(metricIdPrefix + '_jvm_pheap', startTime, endTime)
        .then((pheapData)=> {
          _.forEach(pheapData.alertList, (item) => {
            item['alertType'] = 'PHEAP';
          });
          pheapArray = pheapData.alertList;
        }, (error) => {
          return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.');
        });

      let nheapPromise = this.HawkularAlertsManager.queryAlerts(metricIdPrefix + '_jvm_nheap', startTime, endTime)
        .then((nheapData)=> {
          _.forEach(nheapData.alertList, (item) => {
            item['alertType'] = 'NHEAP';
          });
          nheapArray = nheapData.alertList;
        }, (error) => {
          return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.');
        });

      let garbaPromise = this.HawkularAlertsManager.queryAlerts(metricIdPrefix + '_jvm_garba', startTime, endTime)
        .then((garbaData)=> {
          _.forEach(garbaData.alertList, (item) => {
            item['alertType'] = 'GARBA';
          });
          garbaArray = garbaData.alertList;
        }, (error) => {
          return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.');
        });

      this.$q.all([pheapPromise, nheapPromise, garbaPromise]).finally(()=> {
        this.alertList = [].concat(pheapArray, nheapArray, garbaArray);
      });
    }

    private autoRefreshPromise:ng.IPromise<number>;

    private formatBucketedChartOutput(response):IChartDataPoint[] {
      function convertBytesToMegaBytes(bytes:number):number {
        return bytes / 1024 / 1024;
      }

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
      if(response.length < 2) {
        return [];
      }

      // get the timestamp interval from the first two samples
      let tsStep = response[1].timestamp - response[0].timestamp;

      // sometimes there are gaps in data, which needs to be filled with empty values so the buckets get similar time
      // intervals. here we figure that and fill them. when metrics support buckets for counters, this is unnecessary
      let tmpArr = [response[0], response[1]];
      let k = 2;
      while(k < response.length) {
        if(response[k].timestamp - tmpArr[tmpArr.length-1].timestamp >= (tsStep * 2)) {
          tmpArr.push({timestamp: tmpArr[tmpArr.length-1].timestamp + tsStep, value: 0});
        }
        else {
          tmpArr.push(response[k++]);
        }
      }
      response = tmpArr;

      // also, if the data starts after the start timestamp, the chart will not have a proper scale, and not comparable
      // with others (eg: mem usage). so, if required, fill data with initial missing timestamps.
      while (response[0].timestamp > this.startTimeStamp) {
        response.unshift({timestamp: (response[0].timestamp - tsStep), value: 0});
      }

      // put things into buckets
      response = tmpArr;
      let result = response.reverse();
      /// FIXME: Simulating buckets.. this should come from metrics.
      if (response.length >= buckets) {
        let step = this.$window.Math.floor(response.length / buckets);
        result = [];
        let accValue = 0;
        var iTimeStamp = 0;
        _.forEach(response, (point:any, idx) => {
          if (iTimeStamp === 0) {
            iTimeStamp = point.timestamp;
          }

          accValue += point.value;

          if (parseInt(idx, 10) % step === (step - 1)) {
            result.push({timestamp: iTimeStamp, value: accValue});
            accValue = 0;
            iTimeStamp = 0;
          }
        });
        // just so that scale matches, sometimes there's some skew..
        result[result.length-1].timestamp = this.startTimeStamp;
      }

      //  The schema is different for bucketed output
      return _.map(result, (point:IChartDataPoint, idx) => {
        let theValue = idx === 0 ? 0 : (result[idx - 1].value - point.value);
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

    private autoRefresh(intervalInSeconds:number):void {
      this.autoRefreshPromise = this.$interval(() => {
        this.getJvmData();
        this.getJvmChartData();
        this.getAlerts(this.$routeParams.resourceId, this.startTimeStamp, this.endTimeStamp);
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    public getJvmData():void {
      this.alertList = []; // FIXME: when we have alerts for app server
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~Heap Used',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 1
      }, (resource) => {
        if (resource.length) {
          this['heapUsage'] = resource[0];
        }
      }, this);
      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~Heap Max',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 1
      }, (resource) => {
        if (resource.length) {
          this['heapMax'] = resource[0];
          AppServerJvmDetailsController.MAX_HEAP = resource[0].max;
        }
      }, this);
      this.HawkularMetric.CounterMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        counterId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~Accumulated GC Duration',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 1
      }, (resource) => {
        if (resource.length) {
          this['accGCDuration'] = resource[resource.length - 1].value - resource[0].value;
        }
      }, this);
      this.getJvmChartData();
    }

    public getJvmChartData():void {

      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~Heap Committed',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 60
      }, (data) => {
        this.chartHeapData[0] = {
          key: 'Heap Committed',
          color: AppServerJvmDetailsController.COMMITTED_COLOR, values: this.formatBucketedChartOutput(data)
        };
      }, this);
      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~Heap Used',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 60
      }, (data) => {
        this.chartHeapData[1] = {
          key: 'Heap Used',
          color: AppServerJvmDetailsController.USED_COLOR, values: this.formatBucketedChartOutput(data)
        };
      }, this);
      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~Heap Max',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 60
      }, (data) => {
        this.chartHeapData[2] = {
          key: 'Heap Max',
          color: AppServerJvmDetailsController.MAXIMUM_COLOR, values: this.formatBucketedChartOutput(data)
        };
      }, this);

      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~NonHeap Committed',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 60
      }, (data) => {
        this.chartNonHeapData[0] = {
          key: 'NonHeap Committed',
          color: AppServerJvmDetailsController.COMMITTED_COLOR, values: this.formatBucketedChartOutput(data)
        };
      }, this);
      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~NonHeap Used',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 60
      }, (data) => {
        this.chartNonHeapData[1] = {
          key: 'NonHeap Used',
          color: AppServerJvmDetailsController.USED_COLOR, values: this.formatBucketedChartOutput(data)
        };
      }, this);
      this.HawkularMetric.CounterMetricRate(this.$rootScope.currentPersona.id).queryMetrics({
        counterId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~Accumulated GC Duration',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 1
      }, (resource) => {
        if (resource.length) {
          this.chartGCDurationData = this.formatCounterChartOutput(resource);
        }
      }, this);
    }
  }

  _module.controller('AppServerJvmDetailsController', AppServerJvmDetailsController);

}
