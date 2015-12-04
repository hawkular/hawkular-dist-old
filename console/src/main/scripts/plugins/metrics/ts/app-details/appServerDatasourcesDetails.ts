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

  export class AppServerDatasourcesDetailsController implements IRefreshable {
    public static AVAILABLE_COLOR = '#1884c7'; /// blue
    public static IN_USE_COLOR = '#49a547'; /// green
    public static TIMED_OUT_COLOR = '#515252'; /// dark gray
    public static WAIT_COLOR = '#bcb932'; /// yellow
    public static CREATION_COLOR = '#95489c'; /// purple

    public static DEFAULT_CONN_THRESHOLD = 200; // < 200 # connections available
    public static DEFAULT_WAIT_THRESHOLD = 200; // > 200 ms average wait time
    public static DEFAULT_CREA_THRESHOLD = 200; // > 200 ms average creatiion time

    private autoRefreshPromise:ng.IPromise<number>;
    private resourceList;
    ///private expandedList;
    public alertList;
    public chartAvailData;
    public chartRespData;
    // will contain in the format: 'metric name' : true | false
    public skipChartData = {};
    public driversList;

    public resolvedAvailData = {};
    public resolvedRespData = {};

    public defaultEmail:string;

    public startTimeStamp:TimestampInMillis;
    public endTimeStamp:TimestampInMillis;

    private feedId: FeedId;
    private resourceId: ResourceId;

    constructor(private $scope:any,
                private $rootScope:IHawkularRootScope,
                private $routeParams:any,
                private $interval:ng.IIntervalService,
                private $q:ng.IQService,
                private HawkularInventory:any,
                private HawkularMetric:any,
                private HawkularNav:any,
                private HawkularAlertsManager:HawkularMetrics.IHawkularAlertsManager,
                private HawkularAlertRouterManager: IHawkularAlertRouterManager,
                private ErrorsManager:IErrorsManager,
                private MetricsService:IMetricsService,
                private $log:ng.ILogService,
                private $location:ng.ILocationService,
                private $modal:any) {
      $scope.vm = this;

      this.feedId = this.$routeParams.feedId;
      this.resourceId = this.$routeParams.resourceId + '~~';

      this.startTimeStamp = +moment().subtract(($routeParams.timeOffset || 3600000), 'milliseconds');
      this.endTimeStamp = +moment();
      this.chartAvailData = {};
      this.chartRespData = {};

      this.defaultEmail = this.$rootScope.userDetails.email || 'myemail@company.com';
      if ($routeParams.action && $routeParams.action === 'add-new') {
        this.showDatasourceAddDialog();
        $location.search('action', null);
      }

      // handle drag ranges on charts to change the time range
      this.$scope.$on('ChartTimeRangeChanged', (event, data:Date[]) => {
        this.startTimeStamp = data[0].getTime();
        this.endTimeStamp = data[1].getTime();
        this.HawkularNav.setTimestampStartEnd(this.startTimeStamp, this.endTimeStamp);
        this.refresh();
      });

      if ($rootScope.currentPersona) {
        this.getDatasources(this.$rootScope.currentPersona.id);
      } else {
        /// currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) => currentPersona &&
        this.getDatasources(currentPersona.id));
      }

      this.autoRefresh(20);
    }

    public showDriverAddDialog():void {

      /// create a new isolate scope for dialog inherited from current scope instead of default $rootScope
      let driverAddDialog = this.$modal.open({
        templateUrl: 'plugins/metrics/html/app-details/modals/detail-datasources-driver-add.html',
        controller: 'AppServerDatasourcesDriverAddDialogController as dac',
        scope: this.$scope.$new()
      });

      driverAddDialog.result.then((modalValue) => {
        // handle any returned modalValue if required
      }, (reason) => {
        // handle any returned cancel reason if required
      });
    }

    public showDatasourceAddDialog():void {

      /// create a new isolate scope for dialog inherited from current scope instead of default $rootScope
      let datasourceAddDialog = this.$modal.open({
        templateUrl: 'plugins/metrics/html/app-details/modals/detail-datasources-add.html',
        controller: 'AppServerDatasourcesAddDialogController as dac',
        scope: this.$scope.$new()
      });

      datasourceAddDialog.result.then((modalValue) => {
        // handle any returned modalValue if required
      }, (reason) => {
        // handle any returned cancel reason if required
      });
    }

    public showDatasourceEditDialog(datasource:any):void {
      /// create a new isolate scope for dialog inherited from current scope instead of default $rootScope
      let datasourceEditDialog = this.$modal.open({
        templateUrl: 'plugins/metrics/html/app-details/modals/detail-datasources-edit.html',
        controller: 'AppServerDatasourcesEditDialogController as mvm',
        resolve: {
          datasource: () => datasource
        }
      });
    }

    public deleteDatasource(datasource:any):void {
      /// create a new isolate scope for dialog inherited from current scope instead of default $rootScope
      let datasourceDeleteDialog = this.$modal.open({
        templateUrl: 'plugins/metrics/html/app-details/modals/detail-datasources-delete.html',
        controller: 'AppServerDatasourcesDeleteDialogController as mvm',
        resolve: {
          datasource: () => datasource
        }
      });

      datasourceDeleteDialog.result.then((modalValue) => {
        // handle any returned modalValue if required
      }, (reason) => {
        // handle any returned cancel reason if required
      });
    }

    public deleteDriver(driver:any):void {
      /// create a new isolate scope for dialog inherited from current scope instead of default $rootScope
      let driverDeleteDialog = this.$modal.open({
        templateUrl: 'plugins/metrics/html/app-details/modals/detail-datasources-driver-delete.html',
        controller: 'AppServerDatasourcesDriverDeleteDialogController as mvm',
        resolve: {
          driver: () => driver
        }
      });
    }

    public autoRefresh(intervalInSeconds:number):void {
      this.autoRefreshPromise = this.$interval(() => {
        this.getDatasources();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    public refresh():void {
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      this.getDatasources();
    }

    private getDSMetrics(resourceLists, currentTenantId?:TenantId) {
      let tenantId:TenantId = currentTenantId || this.$rootScope.currentPersona.id;
      let promises = [];
      let tmpResourceList = [];

      if (!resourceLists.length || _.every(resourceLists, { 'length': 0 })) {
        this.resourceList = [];
        this.resourceList.$resolved = true;
        this['lastUpdateTimestamp'] = new Date();
      }

      angular.forEach(resourceLists, (aResourceList) => {
        angular.forEach(aResourceList, (res:IResource) => {
          if (res.id.startsWith(this.$routeParams.resourceId + '~/')) {
            res.feedId = this.feedId;
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
            this.HawkularAlertRouterManager.registerForAlerts(
              res.feedId + '/' + res.id,
              'datasource',
              _.bind(this.filterAlerts, this, _, res)
            );
            this.getAlerts(res);
          }
        });
        this.$q.all(promises).then(() => {
          this.resourceList = tmpResourceList;
          this.resourceList.$resolved = true;
          this.getDatasourceChartData();
          this.loadTriggers();
        });
      });
    }

    public getDatasources(currentTenantId?:TenantId):void {
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      let xaDSsPromise = this.HawkularInventory.ResourceOfTypeUnderFeed.query({
        feedId: this.$routeParams.feedId,
        resourceTypeId: 'XA Datasource'
      }).$promise;

      let nonXaDSsPromise = this.HawkularInventory.ResourceOfTypeUnderFeed.query({
        feedId: this.$routeParams.feedId,
        resourceTypeId: 'Datasource'
      }).$promise;

      this.$q.all([xaDSsPromise, nonXaDSsPromise]).then((resourceLists) => {
        this.getDSMetrics(resourceLists, currentTenantId);
      });

      this.getDrivers();
    }

    public filterAlerts(alertData:IHawkularAlertQueryResult, res:IResource) {
      let currentAlertList = alertData.alertList;
      _.forEach(currentAlertList, (item:IAlert) => {
        item.alertType = item.context.alertType;
      });
      res.alertList = currentAlertList;
    }

    private getAlerts(res:IResource):void {
      this.HawkularAlertRouterManager.getAlertsForResourceId(
        res.feedId + '/' + res.id,
        this.startTimeStamp,
        this.endTimeStamp
      );
    }

    public getDrivers(currentTenantId?:TenantId):void {
      this.HawkularInventory.ResourceOfTypeUnderFeed.query({
        feedId: this.$routeParams.feedId,
        resourceTypeId: 'JDBC Driver'
      }, (aResourceList, getResponseHeaders) => {
        this.driversList = aResourceList;
      });

    }

    public getDatasourceChartData(currentTenantId?:TenantId):void {
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      //let tenantId:TenantId = currentTenantId || this.$rootScope.currentPersona.id;

      let availPromises = [];
      let respPromises = [];

      let tmpChartAvailData = {};
      let tmpChartRespData = {};

      _.forEach(this.resourceList, function (res:IResource) {

        if (!this.skipChartData[res.id + '_Available Count']) {
          let dsAvailPromise = this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
            MetricsService.getMetricId('M', this.feedId, res.id, 'Datasource Pool Metrics~Available Count'),
            this.startTimeStamp, this.endTimeStamp, 60);
          availPromises.push(dsAvailPromise);
          dsAvailPromise.then((data) => {
            tmpChartAvailData[res.id] = tmpChartAvailData[res.id] || [];
            tmpChartAvailData[res.id][tmpChartAvailData[res.id].length] = {
              key: 'Available Count',
              color: AppServerDatasourcesDetailsController.AVAILABLE_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          });
        }
        if (!this.skipChartData[res.id + '_In Use Count']) {
          let dsInUsePromise = this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
            MetricsService.getMetricId('M', this.feedId, res.id, 'Datasource Pool Metrics~In Use Count'),
            this.startTimeStamp, this.endTimeStamp, 60);
          availPromises.push(dsInUsePromise);
          dsInUsePromise.then((data:number[]) => {
            tmpChartAvailData[res.id] = tmpChartAvailData[res.id] || [];
            tmpChartAvailData[res.id][tmpChartAvailData[res.id].length] = {
              key: 'In Use',
              color: AppServerDatasourcesDetailsController.IN_USE_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          });
        }
        if (!this.skipChartData[res.id + '_Timed Out']) {
          let dsTimedPromise = this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
            MetricsService.getMetricId('M', this.feedId, res.id, 'Datasource Pool Metrics~Timed Out'),
            this.startTimeStamp, this.endTimeStamp, 60);
          availPromises.push(dsTimedPromise);
          dsTimedPromise.then((data) => {
            tmpChartAvailData[res.id] = tmpChartAvailData[res.id] || [];
            tmpChartAvailData[res.id][tmpChartAvailData[res.id].length] = {
              key: 'Timed Out',
              color: AppServerDatasourcesDetailsController.TIMED_OUT_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          });
        }
        this.$q.all(availPromises).finally(()=> {
          this.chartAvailData[res.id] = tmpChartAvailData[res.id] || [];
          this.resolvedAvailData[res.id] = true;
        });

        if (!this.skipChartData[res.id + '_Average Get Time']) {
          let dsWTimePromise = this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
            MetricsService.getMetricId('M', this.feedId, res.id, 'Datasource Pool Metrics~Average Get Time'),
            this.startTimeStamp, this.endTimeStamp, 60);
          respPromises.push(dsWTimePromise);
          dsWTimePromise.then((data) => {
            tmpChartRespData[res.id] = tmpChartRespData[res.id] || [];
            tmpChartRespData[res.id][tmpChartRespData[res.id].length] = {
              key: 'Wait Time (Avg.)',
              color: AppServerDatasourcesDetailsController.WAIT_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          });
        }
        if (!this.skipChartData[res.id + '_Average Creation Time']) {
          let dsCTimePromise = this.MetricsService.retrieveGaugeMetrics(this.$rootScope.currentPersona.id,
            MetricsService.getMetricId('M', this.feedId, res.id, 'Datasource Pool Metrics~Average Creation Time'),
            this.startTimeStamp, this.endTimeStamp, 60);
          respPromises.push(dsCTimePromise);
          dsCTimePromise.then((data) => {
            tmpChartRespData[res.id] = tmpChartRespData[res.id] || [];
            tmpChartRespData[res.id][tmpChartRespData[res.id].length] = {
              key: 'Creation Time (Avg.)',
              color: AppServerDatasourcesDetailsController.CREATION_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          });
        }
        this.$q.all(respPromises).finally(()=> {
          this.chartRespData[res.id] = tmpChartRespData[res.id] || [];
          this.resolvedRespData[res.id] = true;
        });
      }, this);
    }

    public toggleChartData(name):void {
      this.skipChartData[name] = !this.skipChartData[name];
      this.getDatasourceChartData();
    }

    public loadTriggers(currentTenantId?:TenantId):any {
      _.forEach(this.resourceList, function (res:IResource, idx) {

        this.loadDatasourceTriggers(this.feedId + '/' + res.id);

      }, this);
    }

    private loadDatasourceTriggers(resId:ResourceId):void {
      // Check if trigger exists on alerts setup modal open. If not, create the trigger before opening the modal

      let connTriggerPromise = this.HawkularAlertsManager.existTrigger(resId + '_ds_conn').then(() => {
        this.$log.debug('Datasource connection trigger exists, nothing to do');
      }, () => {
        /// Datasource connection trigger doesn't exist, need to create one

        let triggerId:string = resId + '_ds_conn';
        let dataId:string = 'MI~R~[' + resId + ']~MT~Datasource Pool Metrics~Available Count';
        let fullTrigger = {
          trigger: {
            name: 'Datasource Available Connections',
            id: triggerId,
            description: 'Available Connection Count for Datasource ' + resId,
            autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
            autoEnable: true, // Enable trigger once an alert is resolved
            autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
            actions: {email: [this.defaultEmail]},
            tags: {
              resourceId: resId
            },
            context: {
              alertType: 'DSCONN',
              resourceType: 'DataSource',
              resourceName: resId,
              resourcePath: this.$rootScope.resourcePath,
              triggerType: 'Threshold'
            }
          },
          dampenings: [
            {
              triggerId: triggerId,
              evalTimeSetting: 7 * 60000,
              triggerMode: 'FIRING',
              type: 'STRICT_TIME'
            }
          ],
          conditions: [
            {
              triggerId: triggerId,
              type: 'THRESHOLD',
              dataId: dataId,
              threshold: AppServerDatasourcesDetailsController.DEFAULT_CONN_THRESHOLD,
              operator: 'LT',
              context: {
                description: 'Available Count',
                unit: 'connections'
              }
            }
          ]
        };

        return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
          this.$log.error('Error on Trigger creation for ' + triggerId);
        });
      });

      let waitTimeTriggerPromise = this.HawkularAlertsManager.existTrigger(resId + '_ds_wait').then(() => {
        /// Datasource wait time trigger exists, nothing to do
        this.$log.debug('Datasource Wait Time trigger exists, nothing to do');
      }, () => {
        /// trigger doesn't exist, need to create one
        let triggerId:string = resId + '_ds_wait';
        let dataId:string = 'MI~R~[' + resId + ']~MT~Datasource Pool Metrics~Average Wait Time';

        let fullTrigger = {
          trigger: {
            name: 'Datasource Pool Wait Time',
            id: triggerId,
            description: 'Pool Wait Time Responsiveness for DS ' + resId,
            autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
            autoEnable: true, // Enable trigger once an alert is resolved
            autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
            actions: {email: [this.defaultEmail]},
            tags: {
              resourceId: resId
            },
            context: {
              alertType: 'DSRESP',
              resourceType: 'DataSource',
              resourceName: resId,
              triggerType: 'Threshold'
            }
          },
          dampenings: [
            {
              triggerId: triggerId,
              evalTimeSetting: 7 * 60000,
              triggerMode: 'FIRING',
              type: 'STRICT_TIME'
            }
          ],
          conditions: [
            {
              triggerId: triggerId,
              type: 'THRESHOLD',
              dataId: dataId,
              threshold: AppServerDatasourcesDetailsController.DEFAULT_WAIT_THRESHOLD,
              operator: 'GT',
              context: {
                description: 'Average Wait Time',
                unit: 'ms'
              }
            }
          ]
        };

        return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
          this.$log.error('Error on Trigger creation for ' + triggerId);
        });
      });

      let createTimeTriggerPromise = this.HawkularAlertsManager.existTrigger(resId + '_ds_create').then(() => {
        /// Datasource create time trigger exists, nothing to do
        this.$log.debug('Datasource create time trigger exists, nothing to do');
      }, () => {
        /// trigger doesn't exist, need to create one
        let triggerId:string = resId + '_ds_create';
        let dataId:string = 'MI~R~[' + resId + ']~MT~Datasource Pool Metrics~Average Creation Time';
        let fullTrigger = {
          trigger: {
            name: 'Datasource Pool Create Time',
            id: triggerId,
            description: 'Pool Create Time Responsiveness for DS ' + resId,
            autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
            autoEnable: true, // Enable trigger once an alert is resolved
            autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
            actions: {email: [this.defaultEmail]},
            tags: {
              resourceId: resId
            },
            context: {
              alertType: 'DSCREATE',
              resourceType: 'DataSource',
              resourceName: resId,
              triggerType: 'Threshold'
            }
          },
          dampenings: [
            {
              triggerId: triggerId,
              evalTimeSetting: 7 * 60000,
              triggerMode: 'FIRING',
              type: 'STRICT_TIME'
            }
          ],
          conditions: [
            {
              triggerId: triggerId,
              type: 'THRESHOLD',
              dataId: dataId,
              threshold: AppServerDatasourcesDetailsController.DEFAULT_CREA_THRESHOLD,
              operator: 'GT',
              context: {
                description: 'Average Creation Time',
                unit: 'ms'
              }
            }
          ]
        };

        return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
          this.$log.error('Error on Trigger creation for ' + triggerId);
        });

      });

      this.$q.all([connTriggerPromise, waitTimeTriggerPromise, createTimeTriggerPromise]).then(() => {
        // do nothing
      }, () => {
        this.$log.error('Missing and unable to create new Datasource Alert triggers.');
      });

    }

    public encodeResourceId(resourceId:ResourceId):string {
      // for some reason using standard encoding is not working correctly in the route. So do something dopey...
      //let encoded = encodeURIComponent(resourceId);
      let encoded = resourceId;
      while (encoded.indexOf('/') > -1) {
        encoded = encoded.replace('/', '$');
      }
      return encoded;
    }

  }

  _module.controller('AppServerDatasourcesDetailsController', AppServerDatasourcesDetailsController);
}

