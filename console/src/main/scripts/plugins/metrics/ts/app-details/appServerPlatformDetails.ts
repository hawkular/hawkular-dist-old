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

/* Already defined in appServerJvmDetails
  export interface IMultiDataPoint {
    key: string;
    color: string;
    values: IChartDataPoint[];
  }
*/

  export class AppServerPlatformDetailsController {
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
    public fileStoreList;
    public processorList;
    public chartCpuData:IChartDataPoint[];
    public chartFileSystemData;//:IMultiDataPoint[];
    public startTimeStamp:TimestampInMillis;
    public endTimeStamp:TimestampInMillis;
    public chartMemoryUsageData:IChartDataPoint[];
    // will contain in the format: 'metric name' : true | false
    public skipChartData = {};
    public feedId:any;

    public resolvedChartFileSystemData = {};
    public resolvedMemoryData: boolean = false;
    public resolvedCPUData: boolean = false;

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
      $scope.os = this;

      this.startTimeStamp = +moment().subtract(($routeParams.timeOffset || 3600000), 'milliseconds');
      this.endTimeStamp = +moment();
      this.chartCpuData = [];
      this.chartFileSystemData = {};
      this.feedId= this.$routeParams.resourceId.split('~')[0];

      if ($rootScope.currentPersona) {
          this.$log.log('We have have a persona');
          this.getProcessors();
          this.getFileSystems();
          this.getPlatformData();
          this.getCPUMemoryChartData();
          this.getFSChartData();
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona',
          (currentPersona) => currentPersona
          && this.getProcessors()
          && this.getFileSystems()
          && this.getPlatformData());
      }

      //this.getAlerts(this.$routeParams.resourceId, this.startTimeStamp, this.endTimeStamp);


      this.autoRefresh(20);
    }

    private getAlerts(metricIdPrefix:string, startTime:TimestampInMillis, endTime:TimestampInMillis):void {
      let pheapArray:any, nheapArray:any, garbaArray:any;
      let pheapPromise = this.HawkularAlertsManager.queryAlerts({statuses:'OPEN',
        triggerIds: metricIdPrefix + '_platform_mem', startTime: startTime, endTime: endTime}).then((pheapData)=> {
          _.forEach(pheapData.alertList, (item) => {
            item['alertType'] = 'P_MEM';
          });
          pheapArray = pheapData.alertList;
        }, (error) => {
          return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.');
        });

      let nheapPromise = this.HawkularAlertsManager.queryAlerts({statuses:'OPEN',
        triggerIds: metricIdPrefix + '_platform_cpu', startTime: startTime, endTime: endTime}).then((nheapData)=> {
          _.forEach(nheapData.alertList, (item) => {
            item['alertType'] = 'PCPU';
          });
          nheapArray = nheapData.alertList;
        }, (error) => {
          return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.');
        });

      let garbaPromise = this.HawkularAlertsManager.queryAlerts({statuses: 'OPEN',
        triggerIds: metricIdPrefix + '_jvm_garba', startTime: startTime, endTime: endTime}).then((garbaData)=> { // TODO
          _.forEach(garbaData.alertList, (item) => {
            item['alertType'] = 'GARBA'; // TODO
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


    private autoRefresh(intervalInSeconds:number):void {
      this.autoRefreshPromise = this.$interval(() => {
        //this.getFileSystems();
        this.getPlatformData();
        this.getCPUMemoryChartData();
        this.getFSChartData();
        //this.getAlerts(this.$routeParams.resourceId, this.startTimeStamp, this.endTimeStamp);
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    public getFileSystems(): any {
this.$log.log('getFileSystems');
        this.endTimeStamp = this.$routeParams.endTime || +moment();
        this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

        let tenantId:TenantId = this.$rootScope.currentPersona.id;
        this.HawkularInventory.ResourceOfTypeUnderFeed.query({
          environmentId: globalEnvironmentId,
          feedId: this.feedId,
          resourceTypeId: 'File Store'}, (aResourceList, getResponseHeaders) => {
          let promises = [];
          let tmpResourceList = [];
          this.$q.all(promises).then(() => {
            this.fileStoreList = aResourceList;
            this.fileStoreList.$resolved = true;
          });
        },
        () => { // error
          if (!this.fileStoreList) {
            this.fileStoreList = [];
            this.fileStoreList.$resolved = true;
            this['lastUpdateTimestamp'] = new Date();
          }
        });
    }

    // retrieve the list of CPUs
    public getProcessors(): any {
this.$log.log('getProcessors');
        this.endTimeStamp = this.$routeParams.endTime || +moment();
        this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

        this.HawkularInventory.ResourceOfTypeUnderFeed.query({
          environmentId: globalEnvironmentId,
          feedId: this.feedId,
          resourceTypeId: 'Processor'}, (aResourceList, getResponseHeaders) => {
          let promises = [];
          let tmpResourceList = [];
          this.$q.all(promises).then(() => {
            this.processorList = []; // aResourceList;
            // Generate metric key from resource id
            for (var i = 0; i < aResourceList.length;i++) {
                let tmp:string = this.feedId + '~MI~R~[' + aResourceList[i].id + ']~MT~CPU Usage';
                this.processorList[i] = tmp;

            }
          });
        },
        () => { // error
          if (!this.processorList) {
            this.processorList = [];
            this['lastUpdateTimestamp'] = new Date();
          }
        });

    }

    public getPlatformData():void {
this.$log.log('getPlatformData');
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: this.feedId + '~MI~R~[' + 'Memory' + ']~MT~Available Memory',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 1
      }, (resource) => {
        if (resource.length) {
          this['memoryAvail'] = resource[0];
        }
      }, this);
        if (this.processorList) {
            this.HawkularMetric.GaugeMetricMultipleStats(this.$rootScope.currentPersona.id).get({
                metrics: this.processorList,
                start: this.startTimeStamp,
                end: this.endTimeStamp,
                buckets: 1
            }, (resource) => {
                if (resource.length) {
                    this['cpuUsage'] = resource[0];
                }
            }, this);
        }
    }

    public getFSChartData():void {
        this.endTimeStamp = this.$routeParams.endTime || +moment();
        this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

        let tenantId:TenantId = this.$rootScope.currentPersona.id;

        let availPromises = [];

        let tmpChartAvailData = {};

        angular.forEach(this.fileStoreList, function(res, idx) {
            availPromises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
                gaugeId: this.feedId + '~MI~R~[' + res.id + ']~MT~Usable Space',
                start: this.startTimeStamp,
                end: this.endTimeStamp, buckets: 60
            }, (data) => {
                tmpChartAvailData[res.id] = tmpChartAvailData[res.id] || [];
                tmpChartAvailData[res.id][tmpChartAvailData[res.id].length] = {
                    key: 'Usable Space',
                    color: AppServerPlatformDetailsController.USED_COLOR,
                    values: MetricsService.formatBucketedChartOutput(data,1/(1024*1024))
                };
            }, this).$promise);
            availPromises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
                gaugeId: this.feedId + '~MI~R~[' + res.id + ']~MT~Total Space',
                start: this.startTimeStamp,
                end: this.endTimeStamp, buckets: 60
            }, (data) => {
                tmpChartAvailData[res.id] = tmpChartAvailData[res.id] || [];
                tmpChartAvailData[res.id][tmpChartAvailData[res.id].length] = {
                    key: 'Total Space',
                    color: AppServerPlatformDetailsController.MAXIMUM_COLOR,
                    values: MetricsService.formatBucketedChartOutput(data,1/(1024*1024))
                };
            }, this).$promise);
            this.$q.all(availPromises).finally(()=> {
                this.chartFileSystemData[res.id] = tmpChartAvailData[res.id] || [];
                this.resolvedChartFileSystemData[res.id] = true;
            });
        },this);
    }

    public getCPUMemoryChartData():void {

      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

    if (this.processorList) {
        this.HawkularMetric.GaugeMetricMultipleStats(this.$rootScope.currentPersona.id).get({
          metrics: this.processorList,
          start: this.startTimeStamp,
          end: this.endTimeStamp,
          buckets: 60
        }, (resource) => {
          if (resource.length) {
            this.chartCpuData = MetricsService.formatBucketedChartOutput(resource,100);
            this.resolvedCPUData = true;
          }
        }, this);
    }



      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: this.feedId + '~MI~R~[' + 'Memory' + ']~MT~Available Memory',
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 60
      }, (resource) => {
        if (resource.length) {
          this.chartMemoryUsageData = MetricsService.formatBucketedChartOutput(resource,1/(1024*1024));
          this.resolvedMemoryData = true;
        }
      }, this);
    }

    public toggleChartData(name): void {
      this.skipChartData[name] = !this.skipChartData[name];
      this.getCPUMemoryChartData();
    }

  }

  _module.controller('AppServerJvmDetailsController', AppServerJvmDetailsController);

}
