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
/// <reference path="../services/alertsManager.ts"/>
/// <reference path="../services/errorsManager.ts"/>

module HawkularMetrics {
  export class AppServerPlatformDetailsController implements IRefreshable {
    public static USED_COLOR = '#1884c7'; /// blue
    public static MAXIMUM_COLOR = '#f57f20'; /// orange

    public static MINIMUM_AVAIL_MEM = 100 * 1024 * 1024;
    public math = Math;
    private autoRefreshPromise:ng.IPromise<number>;

    public alertList:any[] = [];
    public fileStoreList;
    public processorList;
    public processorListNames;
    public chartCpuData:IChartDataPoint[] = [];
    public chartCpuDataMulti:IChartDataPoint[][] = [];
    public chartFileSystemData = {};
    public startTimeStamp:TimestampInMillis;
    public endTimeStamp:TimestampInMillis;
    public chartMemoryUsageData:IChartDataPoint[];
    // will contain in the format: 'metric name' : true | false
    public skipChartData = {};
    public feedId:FeedId;
    private memoryResourceId:ResourceId;

    public resolvedChartFileSystemData = {};
    public resolvedMemoryData:boolean = false;
    public resolvedCPUData:boolean = false;

    constructor(private $scope:any,
                private $rootScope:IHawkularRootScope,
                private $interval:ng.IIntervalService,
                private $log:ng.ILogService,
                private $routeParams:any,
                private HawkularNav:any,
                private HawkularInventory:any,
                private HawkularMetric:any,
                private HawkularAlertRouterManager: IHawkularAlertRouterManager,
                private $q:ng.IQService ) {
      $scope.os = this;
      this.feedId = this.$routeParams.feedId;
      this.memoryResourceId = AppServerPlatformDetailsController.getMemoryResourceId(this.feedId);
      this.initTimeStamps();

      this.HawkularAlertRouterManager.registerForAlerts(
        this.feedId,
        'platform',
        _.bind(this.filterAlerts, this)
      );
      if ($rootScope.currentPersona) {
        this.$log.log('We have have a persona');
        this.setup();
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona',
          (currentPersona) => currentPersona && this.setup());
      }
      // handle drag ranges on charts to change the time range
      this.$scope.$on('ChartTimeRangeChanged', (event, data:Date[]) => {
        this.startTimeStamp = data[0].getTime();
        this.endTimeStamp = data[1].getTime();
        this.HawkularNav.setTimestampStartEnd(this.startTimeStamp, this.endTimeStamp);
        this.refresh();
      });
      this.getAlerts();
      this.autoRefresh(20);
    }

    private initTimeStamps() {
      this.startTimeStamp = +moment().subtract((this.$routeParams.timeOffset || 3600000), 'milliseconds');
      this.endTimeStamp = +moment();
    }

    private filterAlerts(alertData:IHawkularAlertQueryResult):IAlert[] {
      let alertList =  alertData.alertList;
      _.remove(alertList, (item:IAlert) => {
        switch( item.context.alertType ) {
          case 'CPU_USAGE_EXCEED' :
            item.alertType = item.context.alertType;
            return false;
          case 'AVAILABLE_MEMORY' :
            item.alertType = item.context.alertType;
            return false;
          default : return true;
        }
      });
      this.alertList = alertList;
      return alertList;
    }

    private setup() {
      this.getProcessors();
      this.getFileSystems();
      this.getPlatformData();
    }

    public refresh():void {
      this.initTimeStamps();
      this.getAlerts();
      this.getPlatformData();
      this.getCPUChartData();
      this.getMemoryChartData();
      this.getFSChartData();
      this.getCpuChartDetailData();
    }

    private getAlerts():void {
      this.HawkularAlertRouterManager.getAlertsForResourceId(
        this.feedId,
        this.startTimeStamp,
        this.endTimeStamp
      );
    }

    public getFileSystems():any {
      this.HawkularInventory.ResourceOfTypeUnderFeed.query({
          environmentId: globalEnvironmentId,
          feedId: this.feedId,
          resourceTypeId: 'File Store'
        }).$promise.then((aResourceList) => {
          this.fileStoreList = aResourceList;
          this.fileStoreList.$resolved = true;
          this.getFSChartData();
          return aResourceList;
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
    public getProcessors():any {
      this.HawkularInventory.ResourceOfTypeUnderFeed.query({
          environmentId: globalEnvironmentId,
          feedId: this.feedId,
          resourceTypeId: 'Processor'
        }).$promise.then((aResourceList) => {
          this.processorList = []; // aResourceList;
          this.processorListNames = [];
          // Generate metric key from resource id
          _.forEach(aResourceList, (item) => {
            const metricId: string = MetricsService.getMetricId('M', this.feedId, item['id'], 'CPU Usage');
            this.processorList.push(metricId);
            this.processorListNames[metricId] = item['name'];
          });
          this.processorList = _.sortBy(this.processorList);
          this.getCpuUsage();
          this.getCPUChartData();
          this.getCpuChartDetailData();
        return aResourceList;
        },
        () => { // error
          if (!this.processorList) {
            this.processorList = [];
            this['lastUpdateTimestamp'] = new Date();
          }
        });

    }

    public getPlatformData():void {
      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: MetricsService.getMetricId('M', this.feedId, this.memoryResourceId, 'Available Memory'),
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 1
      }).$promise.then((resource) => {
        if (resource.length) {
          this['memoryAvail'] = resource[0];
          this.getMemoryChartData();
          return resource[0];
        }
      });
    }

    private getCpuUsage() {
      if (this.processorList) {
        this.HawkularMetric.GaugeMetricMultipleStats(this.$rootScope.currentPersona.id).get({
          metrics: this.processorList,
          start: this.startTimeStamp,
          end: this.endTimeStamp,
          buckets: 1
        }).$promise.then((resource) => {
          if (resource.length) {
            this['cpuUsage'] = resource[0];
            return resource[0];
          }
        });
      }
    }

    public getFSChartData():void {
      let availPromises = [];
      angular.forEach(this.fileStoreList, function (res) {
        //Free Space
        if (!this.skipChartData[res.id + '_Free']) {
          availPromises.push(
            this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
              gaugeId: MetricsService.getMetricId('M', this.feedId, res.id, 'Usable Space'),
              start: this.startTimeStamp,
              end: this.endTimeStamp, buckets: 60
            }).$promise.then((data) => {
              return {
                fileStoreId : res.id,
                key: 'Usable Space',
                color: AppServerPlatformDetailsController.USED_COLOR,
                values: MetricsService.formatBucketedChartOutput(data, 1 / (1024 * 1024))
              };
            })
          );
        }
        //Total space
        if (!this.skipChartData[res.id + '_Total']) {
          availPromises.push(
            this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
              gaugeId: MetricsService.getMetricId('M', this.feedId, res.id, 'Total Space'),
              start: this.startTimeStamp,
              end: this.endTimeStamp,
              buckets: 60
            }).$promise.then((data) => {
              return {
                fileStoreId : res.id,
                key: 'Total Space',
                color: AppServerPlatformDetailsController.MAXIMUM_COLOR,
                values: MetricsService.formatBucketedChartOutput(data, 1 / (1024 * 1024))
              };
            })
          );
        }
      }, this);
      this.$q.all(availPromises).then((data)=> {
        let tmpChartFileSystemData = {};
        _.forEach(data, (item) => {
          if (!tmpChartFileSystemData[item.fileStoreId]) {
            tmpChartFileSystemData[item.fileStoreId] = [];
          }
          tmpChartFileSystemData[item.fileStoreId].push(item);
          this.resolvedChartFileSystemData[item.fileStoreId] = true;
        });
        this.chartFileSystemData = tmpChartFileSystemData;
      });
    }

    public getCPUChartData():void {
      if (this.processorList) {
        this.HawkularMetric.GaugeMetricMultipleStats(this.$rootScope.currentPersona.id).get({
          metrics: this.processorList,
          start: this.startTimeStamp,
          end: this.endTimeStamp,
          buckets: 60,
          stacked: true
        }).$promise.then((resource) => {
          if (resource.length) {
            this.chartCpuData = MetricsService.formatBucketedChartOutput(resource, 100);
            this.resolvedCPUData = true;
          }
          return resource;
        });
      }
    }

    public getCpuChartDetailData():void {
      if (this.processorList) {
        _.forEach(this.processorList, (res:string) => {
          this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
            gaugeId: res,
            start: this.startTimeStamp,
            end: this.endTimeStamp,
            buckets: 60
          }).$promise.then((data) => {
            this.chartCpuDataMulti[res] = MetricsService.formatBucketedChartOutput(data, 100);
            return data;
          });
        });
      }
    }

    public getMemoryChartData():void {
      this.HawkularMetric.GaugeMetricData(this.$rootScope.currentPersona.id).queryMetrics({
        gaugeId: MetricsService.getMetricId('M', this.feedId, this.memoryResourceId, 'Available Memory'),
        start: this.startTimeStamp,
        end: this.endTimeStamp,
        buckets: 60
      }).$promise.then((resource) => {
        if (resource.length) {
          this.chartMemoryUsageData = MetricsService.formatBucketedChartOutput(resource, 1 / (1024 * 1024));
          this.resolvedMemoryData = true;
        }
        return resource;
      });
    }

    public toggleChartData(name):void {
      this.skipChartData[name] = !this.skipChartData[name];
      this.getFSChartData();
    }

    public static getMemoryResourceId(feedId):string {
      return 'platform~/OPERATING_SYSTEM=' + feedId + '_OperatingSystem/MEMORY=Memory';
    }

    private autoRefresh(intervalInSeconds:number):void {
      this.autoRefreshPromise = this.$interval(() => {
        this.refresh();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }
  }
  _module.controller('AppServerPlatformDetailsController', AppServerPlatformDetailsController);
}
