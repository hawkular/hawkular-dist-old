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

  export interface IServerLabel {
    key:string;
    value:string;
  }

  export class ServerLabel implements IServerLabel {
    key:string;
    value:string;
    type:string;

    constructor(key, value, type?) {
      this.key = key;
      this.value = value;
      this.type = type || 'userDefined';
    }
  }

  export class AlertChartDataPoint implements IChartDataPoint {
    start:any;
    date:Date;
    min:any;
    max:any;
    percentile95th:any;
    median:any;
    timestamp:number;
    value:any;
    avg:any;
    empty:boolean;

    constructor(value, timestamp) {
      this.start = timestamp;
      this.timestamp = timestamp;
      this.min = value;
      this.max = value;
      this.percentile95th = value;
      this.median = value;
      this.date = new Date(timestamp);
      this.value = value;
      this.avg = value;
      this.empty = false;
    }
  }

  export class AppServerOverviewDetailsController implements IRefreshable {
    private static ALL_STATUSES = 'OPEN,ACKNOWLEDGED,RESOLVED';
    private static ALERTS_PER_PAGE = 20;
    private autoRefreshPromise:ng.IPromise<number>;
    public startTimeStamp:HawkularMetrics.TimestampInMillis;
    public endTimeStamp:HawkularMetrics.TimestampInMillis;
    public alertList:any[] = [];
    public alertInfo:any = {};
    public datasourceInfo:any;
    public serverInfo:any = {};
    public overviewInfo:any;
    public alertRound:number;
    private feedId: FeedId;
    private resourceId: ResourceId;

    constructor(private $scope,
                private $rootScope:IHawkularRootScope,
                private $routeParams:any,
                private $interval:ng.IIntervalService,
                private HawkularAlertRouterManager: IHawkularAlertRouterManager,
                private HawkularAlertsManager:IHawkularAlertsManager,
                private HawkularInventory: any,
                private HawkularMetric:any,
                private $q: ng.IQService,
                private MetricsService:IMetricsService) {
      this.feedId = this.$routeParams.feedId;
      this.resourceId = this.$routeParams.resourceId + '~~';
      let selectedTime = $routeParams.timeOffset || 3600000;
      this.alertRound = selectedTime/AppServerOverviewDetailsController.ALERTS_PER_PAGE;
      this.startTimeStamp = +moment().subtract(selectedTime, 'milliseconds');
      this.endTimeStamp = +moment();
      $scope.vm = this;
      this.HawkularAlertRouterManager.registerForAlerts(
        this.$routeParams.feedId + '/' + this.$routeParams.resourceId,
        'overview',
        _.bind(this.filterAlerts, this)
      );

      if (this.$rootScope.currentPersona) {
        this.refresh();
      } else {
        $rootScope.$watch('currentPersona',
          (currentPersona) => currentPersona && this.refresh());
      }
      this.autoRefresh(20);
    }
    refresh():void {
      this.alertList = [];
      this.getAlerts();
      this.getOverviewInfo();
      this.getServerInfo();
      this.getDatasourceInfo();
      this.alertInfo.graphData = [];
      this.alertInfo.allAlerts = [];
      this.alertInfo.alertCount = 0;
      this.getAlertsInfo(this.feedId, this.$routeParams.resourceId);
    }

    private getAlerts(res?:IResource):void {
      let resourceId = (res) ? res.id : this.$routeParams.resourceId;
      this.HawkularAlertRouterManager.getAlertsForResourceId(
        this.$routeParams.feedId + '/' + resourceId,
        this.startTimeStamp,
        this.endTimeStamp
      );
    }

    public filterAlerts(alertData:IHawkularAlertQueryResult) {
      let deploymentAlerts = alertData.alertList;
      angular.forEach(deploymentAlerts, (item) => {
        item['alertType'] = item.context.alertType;
      });
      this.alertList = this.alertList.concat(deploymentAlerts);
    }

    private initGraphAlertData():{} {
      let timeStep = (this.endTimeStamp - this.startTimeStamp) / AppServerOverviewDetailsController.ALERTS_PER_PAGE;
      let filledArray = {};
      for (let step = 0; step<AppServerOverviewDetailsController.ALERTS_PER_PAGE; step++) {
        let currentStep = Math.round((this.startTimeStamp + (timeStep * step))/this.alertRound);
        filledArray[currentStep] = {};
        filledArray[currentStep].length = 'NaN';
      }
      return filledArray;
    }

    private getOverviewInfo() {
      let promises = [];
      let resourceData: any = {};

      this.HawkularInventory.ResourceOfTypeUnderFeed.query({
        feedId: this.$routeParams.feedId,
        resourceTypeId: 'Deployment'
      }, (aResourceList:IResource[], getResponseHeaders) => {
        _.forEach(aResourceList, (res:IResource) => {
          res.feedId = this.$routeParams.feedId;
          promises.push(this.HawkularMetric.AvailabilityMetricData(this.$rootScope.currentPersona.id).query({
            tenantId: this.$rootScope.currentPersona.id,
            availabilityId: MetricsService.getMetricId('A', res.feedId, res.id,
              'Deployment Status~Deployment Status'),
            distinct: true
          }, (availResource:IAvailResource[]) => {
            let latestData = _.last(availResource);
            if (latestData) {
              res.state = latestData.value;
              res.updateTimestamp = latestData.timestamp;
            }
          }).$promise);
        });
        this.$q.all(promises).then(() => {
          resourceData.deployments = aResourceList;
          this.overviewInfo = resourceData;
        });
      });

      //Web session data
      promises.push(this.getActiveWebSession().then(
        (resource) => {
          if (resource.length) {
            resourceData['activeWebSessions'] = [];
            _.forEach(resource, (item) => {
              item['value'] = item['avg'];
            });
            let latestData = _.last(resource);
            resourceData['activeWebSessions']['graph'] =
              MetricsService.formatBucketedChartOutput(resource, AppServerJvmDetailsController.BYTES2MB);
            resourceData['activeWebSessions']['last'] = +latestData['avg'].toFixed(2);
          }
        })
      );
      //JVM data
      promises.push(this.getJvmHeapUsage().then(
        (resource) => {
          if (resource.length) {
            resourceData['heapUsage'] = [];
            _.forEach(resource, (item) => {
              item['value'] = item['avg'];
            });
            let latestData = _.last(resource);
            resourceData['heapUsage']['graph'] =
              MetricsService.formatBucketedChartOutput(resource, AppServerJvmDetailsController.BYTES2MB);
            resourceData['heapUsage']['last'] = latestData['avg'];
          }
        })
      );
    }

    private getActiveWebSession() {
      return this.MetricsService.retrieveGaugeMetrics(
        this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId,
          'WildFly Aggregated Web Metrics~Aggregated Active Web Sessions'),
        this.startTimeStamp,
        this.endTimeStamp,
        60
      );
    }

    private getJvmHeapUsage() {
      return this.MetricsService.retrieveGaugeMetrics(
        this.$rootScope.currentPersona.id,
        MetricsService.getMetricId('M', this.feedId, this.resourceId, 'WildFly Memory Metrics~Heap Used'),
        this.startTimeStamp,
        this.endTimeStamp,
        60
      );
    }

    private getAlertsInfo(feedId, resourceId) {
      this.HawkularAlertsManager.queryAlerts({
        statuses: AppServerOverviewDetailsController.ALL_STATUSES,
        tags: 'resourceId|' + feedId + '/' + resourceId,
        startTime: this.startTimeStamp,
        endTime: this.endTimeStamp
      }).then((alertData:IHawkularAlertQueryResult) => {
        this.alertInfo.allAlerts = this.alertInfo.allAlerts.concat(alertData.alertList);
        let alertInfo = [];
        //Let's group alerts by time, number of ticks is defined in this.alertRound
        let sortedData = _.groupBy(this.alertInfo.allAlerts, (item) => {
          if (item.hasOwnProperty('ctime')) {
            return Math.round(item['ctime'] / this.alertRound);
          }
        }, this);
        let graphData = _.merge(this.initGraphAlertData(), sortedData);
        //Parse all alerts into points for graph
        _.forEach(graphData, (item, key) => {
          if (item.hasOwnProperty('length')) {
            //TODO: when proper graph used change this
            let value = (item['length'] === 'NaN') ? 0 : item['length'];
            alertInfo.push(new AlertChartDataPoint(value,
              parseInt(key.toString(), 10) * this.alertRound
            ));
          }
        });
        this.alertInfo.alertCount += alertData.alertList.length;
        this.alertInfo.graphData = MetricsService.formatBucketedChartOutput(alertInfo);
      });
    }

    private getDatasourceInfo() {
      let xaDSsPromise = this.HawkularInventory.ResourceOfTypeUnderFeed.query({
        feedId: this.feedId,
        resourceTypeId: 'XA Datasource'
      }).$promise;

      let nonXaDSsPromise = this.HawkularInventory.ResourceOfTypeUnderFeed.query({
        feedId: this.feedId,
        resourceTypeId: 'Datasource'
      }).$promise;

      this.$q.all([xaDSsPromise, nonXaDSsPromise]).then((resourceLists) => {
        this.getDSMetrics(resourceLists, this.$rootScope.currentPersona.id);
      });
    }

    private getDSMetrics(resourceLists, tenantId) {
      let tmpResourceList = [];
      let promises = [];
      let self_ = this;
      angular.forEach(resourceLists, (aResourceList) => {
        angular.forEach(aResourceList, (res:IResource) => {
          res.feedId = this.feedId;
          if (res['id'].startsWith(new RegExp(this.$routeParams.resourceId + '~/'))) {
            this.getAlertsInfo(res.feedId, res.id);
            this.HawkularAlertRouterManager.registerForAlerts(
              res.feedId + '/' + res.id,
              'overview',
              _.bind(self_.filterAlerts, this)
            );
            this.getAlerts(res);
            tmpResourceList.push(res);
            promises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
              gaugeId: MetricsService.getMetricId('M', this.feedId, res.id, 'Datasource Pool Metrics~Available Count'),
              distinct: true
            }, (data:number[]) => {
              res.availableCount = data[0];
            }).$promise);
            promises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
              gaugeId: MetricsService.getMetricId('M', this.feedId, res.id, 'Datasource Pool Metrics~In Use Count'),
              distinct: true
            }, (data:number[]) => {
              res.inUseCount = data[0];
            }).$promise);
          }
        });
      });
      this.$q.all(promises).then(() => {
        this.datasourceInfo = tmpResourceList;
      });
    }

    private getServerInfo() {
      let promises = [];
      let tenantId = this.$rootScope.currentPersona.id;
      promises.push(this.HawkularMetric.AvailabilityMetricData(tenantId).query({
        availabilityId: MetricsService.getMetricId('A', this.feedId, this.resourceId, 'Server Availability~App Server'),
        distinct: true}, (resource) => {
        let latestData = resource[resource.length-1];
        if (latestData) {
          this.serverInfo['state'] = latestData['value'];
          this.serverInfo['updateTimestamp'] = latestData['timestamp'];
        }
      }).$promise);
      promises.push(this.HawkularInventory.ResourceUnderFeed.getData({
        feedId: this.feedId,
        resourcePath: this.resourceId}, (resource) => {
        if (resource['value']) {
          this.serverInfo['configuration'] = resource['value'];
        }
      }).$promise);
      promises.push(this.HawkularInventory.ResourceUnderFeed.get({
        feedId: this.feedId,
        resourcePath: this.resourceId
      }, (resource:IResourcePath) => {
        if (resource['type']) {
          this.serverInfo['type'] = resource['type'];
        }
        if (resource['properties']) {
          this.serverInfo['properties'] = resource['properties'];
        }
      }).$promise);
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

  _module.controller('AppServerOverviewDetailsController', AppServerOverviewDetailsController);
}
