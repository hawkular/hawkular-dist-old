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
      '$modal', '$window', 'HawkularInventory', 'HawkularMetric', 'HawkularAlertsManager', 'MetricsService',
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
    // will contain in the format: 'metric name' : true | false
    public skipChartData = {};

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
                private MetricsService:IMetricsService,
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
      let pheapPromise = this.HawkularAlertsManager.queryAlerts({statuses:'OPEN',
        triggerIds: metricIdPrefix + '_jvm_pheap', startTime: startTime, endTime: endTime}).then((pheapData)=> {
          _.forEach(pheapData.alertList, (item) => {
            item['alertType'] = 'PHEAP';
          });
          pheapArray = pheapData.alertList;
        }, (error) => {
          return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.');
        });

      let nheapPromise = this.HawkularAlertsManager.queryAlerts({statuses:'OPEN',
        triggerIds: metricIdPrefix + '_jvm_nheap', startTime: startTime, endTime: endTime}).then((nheapData)=> {
          _.forEach(nheapData.alertList, (item) => {
            item['alertType'] = 'NHEAP';
          });
          nheapArray = nheapData.alertList;
        }, (error) => {
          return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.');
        });

      let garbaPromise = this.HawkularAlertsManager.queryAlerts({statuses: 'OPEN',
        triggerIds: metricIdPrefix + '_jvm_garba', startTime: startTime, endTime: endTime}).then((garbaData)=> {
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
          this['accGCDuration'] = (resource[0].max - resource[0].min);
        }
      }, this);
      this.getJvmChartData();
    }

    public getJvmChartData():void {

      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      var tmpChartHeapData = [];
      var heapPromises = [];
      var tmpChartNonHeapData = [];
      var nonHeapPromises = [];

      if (!this.skipChartData['Heap Committed']) {
        heapPromises.push(this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~Heap Committed',
          start: this.startTimeStamp,
          end: this.endTimeStamp,
          buckets: 60
        }, (data) => {
          tmpChartHeapData[tmpChartHeapData.length] = {
            key: 'Heap Committed',
            color: AppServerJvmDetailsController.COMMITTED_COLOR, values: this.formatBucketedChartOutput(data)
          };
        }, this).$promise);
      }
      if (!this.skipChartData['Heap Used']) {
        heapPromises.push(this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~Heap Used',
          start: this.startTimeStamp,
          end: this.endTimeStamp,
          buckets: 60
        }, (data) => {
          tmpChartHeapData[tmpChartHeapData.length] = {
            key: 'Heap Used',
            color: AppServerJvmDetailsController.USED_COLOR, values: this.formatBucketedChartOutput(data)
          };
        }, this).$promise);
      }
      if (!this.skipChartData['Heap Max']) {
        heapPromises.push(this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~Heap Max',
          start: this.startTimeStamp,
          end: this.endTimeStamp,
          buckets: 60
        }, (data) => {
          tmpChartHeapData[tmpChartHeapData.length] = {
            key: 'Heap Max',
            color: AppServerJvmDetailsController.MAXIMUM_COLOR, values: this.formatBucketedChartOutput(data)
          };
        }, this).$promise);
      }
      this.$q.all(heapPromises).finally(()=> {
        this.chartHeapData = tmpChartHeapData;
      });

      if (!this.skipChartData['NonHeap Committed']) {
        nonHeapPromises.push(this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~NonHeap Committed',
          start: this.startTimeStamp,
          end: this.endTimeStamp,
          buckets: 60
        }, (data) => {
          tmpChartNonHeapData[tmpChartNonHeapData.length] = {
            key: 'NonHeap Committed',
            color: AppServerJvmDetailsController.COMMITTED_COLOR, values: this.formatBucketedChartOutput(data)
          };
        }, this).$promise);
      }
      if (!this.skipChartData['NonHeap Used']) {
        nonHeapPromises.push(this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
          gaugeId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~NonHeap Used',
          start: this.startTimeStamp,
          end: this.endTimeStamp,
          buckets: 60
        }, (data) => {
          tmpChartNonHeapData[tmpChartNonHeapData.length] = {
            key: 'NonHeap Used',
            color: AppServerJvmDetailsController.USED_COLOR, values: this.formatBucketedChartOutput(data)
          };
        }, this).$promise);
      }
      this.$q.all(nonHeapPromises).finally(()=> {
        this.chartNonHeapData = tmpChartNonHeapData;
      });

      this.HawkularMetric.CounterMetricRate(this.$rootScope.currentPersona.id).queryMetrics({
        counterId: 'MI~R~[' + this.$routeParams.resourceId + '~~]~MT~WildFly Memory Metrics~Accumulated GC Duration',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 60
      }, (resource) => {
        if (resource.length) {
          this.chartGCDurationData = MetricsService.formatBucketedChartOutput(resource);
        }
      }, this);
    }

    public toggleChartData(name): void {
      this.skipChartData[name] = !this.skipChartData[name];
      this.getJvmChartData();
    }

  }

  _module.controller('AppServerJvmDetailsController', AppServerJvmDetailsController);

}
