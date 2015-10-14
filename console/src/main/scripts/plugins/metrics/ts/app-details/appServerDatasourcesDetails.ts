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

  export class AppServerDatasourcesDetailsController {

    /// for minification only
    public static  $inject = ['$scope','$rootScope','$routeParams','$interval','$q','HawkularInventory',
      'HawkularMetric', 'HawkularAlertsManager', '$log', '$modal'];

    public static AVAILABLE_COLOR = '#1884c7'; /// blue
    public static IN_USE_COLOR = '#49a547'; /// green
    public static TIMED_OUT_COLOR = '#515252'; /// dark gray
    public static WAIT_COLOR = '#d5d026'; /// yellow
    public static CREATION_COLOR = '#95489c'; /// purple

    public static DEFAULT_CONN_THRESHOLD = 200; // < 200 # connections available
    public static DEFAULT_WAIT_THRESHOLD = 200; // > 200 ms average wait time
    public static DEFAULT_CREA_THRESHOLD = 200; // > 200 ms average creatiion time

    private autoRefreshPromise: ng.IPromise<number>;
    private resourceList;
    ///private expandedList;
    public alertList;
    public chartAvailData;
    public chartRespData;
    // will contain in the format: 'metric name' : true | false
    public skipChartData = {};

    public resolvedAvailData = {};
    public resolvedRespData = {};

    public defaultEmail: string;

    constructor(private $scope: any,
                private $rootScope: any,
                private $routeParams: any,
                private $interval: ng.IIntervalService,
                private $q: ng.IQService,
                private HawkularInventory: any,
                private HawkularMetric: any,
                private HawkularAlertsManager: HawkularMetrics.IHawkularAlertsManager,
                private $log: any,
                private $modal: any,
                public startTimeStamp:TimestampInMillis,
                public endTimeStamp:TimestampInMillis) {
      $scope.vm = this;

      this.startTimeStamp = +moment().subtract(($routeParams.timeOffset || 3600000), 'milliseconds');
      this.endTimeStamp = +moment();
      this.chartAvailData = {};
      this.chartRespData = {};

      this.defaultEmail = this.$rootScope.userDetails.email || 'myemail@company.com';

      if ($rootScope.currentPersona) {
        this.getDatasources(this.$rootScope.currentPersona.id);
      } else {
        /// currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) => currentPersona &&
        this.getDatasources(currentPersona.id));
      }

      this.autoRefresh(20);
    }

    private getAlerts(metricIdPrefix:string, startTime:TimestampInMillis, endTime:TimestampInMillis, res:any):void {
      let connArray: any, respArray: any;
      let connPromise = this.HawkularAlertsManager.queryAlerts({statuses: 'OPEN',
        triggerIds: metricIdPrefix + '_ds_conn', startTime: startTime, endTime: endTime}).then((connData)=> {
          _.forEach(connData.alertList, (item) => {
            item['alertType']='DSCONN';
            item['condition']=item['dataId'].substr(item['dataId'].lastIndexOf('~')+1);
          });
          connArray = connData.alertList;
        }, (error) => {
          //return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.');
        });

      let respPromise = this.HawkularAlertsManager.queryAlerts({statuses: 'OPEN',
        triggerIds: metricIdPrefix + '_ds_resp', startTime: startTime, endTime: endTime}).then((respData)=> {
          _.forEach(respData.alertList, (item) => {
            item['alertType']='DSRESP';
            item['condition']=item['dataId'].substr(item['dataId'].lastIndexOf('~')+1);
          });
          respArray = respData.alertList;
        }, (error) => {
          //return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.');
        });


      this.$q.all([connPromise, respPromise]).finally(()=> {
        res.alertList = [].concat(connArray, respArray);
      });
    }

    public openSetup(resId):void {
      // Check if trigger exists on alerts setup modal open. If not, create the trigger before opening the modal

      let connTriggerPromise = this.HawkularAlertsManager.existTrigger(resId + '_ds_conn').then(() => {
        // Datasource connection trigger exists, nothing to do
        this.$log.debug('Datasource connection trigger exists, nothing to do');
      }, () => {
        /// Datasource connection trigger doesn't exist, need to create one

        let triggerId:string = resId + '_ds_conn';
        let dataId:string = 'MI~R~[' + resId + ']~MT~Datasource Pool Metrics~Available Count';
        let fullTrigger = {
          trigger: {
            name: triggerId,
            id: triggerId,
            description: 'Available Count for Datasource ' + resId,
            actions: {email: [this.defaultEmail]},
            context: {
              resourceType: 'DataSource',
              resourceName: resId,
              resourcePath: this.$rootScope.resourcePath
            }
          },
          dampenings: [
            {
              triggerId: triggerId,
              evalTimeSetting: 7 * 60000,
              triggerMode: 'FIRING',
              type: 'STRICT_TIME',
              context: {
                description: 'Available Count',
                unit: 'connections'
              }
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

      let respTriggerPromise = this.HawkularAlertsManager.existTrigger(resId + '_ds_resp').then(() => {
        /// Datasource responsiveness trigger exists, nothing to do
        this.$log.debug('Datasource responsiveness trigger exists, nothing to do');
      }, () => {
        /// Datasource responsiveness trigger doesn't exist, need to create one
        let triggerId:string = resId + '_ds_resp';
        let dataId1:string = 'MI~R~[' + resId + ']~MT~Datasource Pool Metrics~Average Get Time';
        let dataId2:string = 'MI~R~[' + resId + ']~MT~Datasource Pool Metrics~Average Creation Time';
        let fullTrigger = {
          trigger: {
            name: triggerId,
            id: triggerId,
            firingMatch: 'ANY',
            actions: {email: [this.defaultEmail]},
            context: {
              resourceType: 'DataSource',
              resourceName: resId
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
              dataId: dataId1,
              threshold: AppServerDatasourcesDetailsController.DEFAULT_WAIT_THRESHOLD,
              operator: 'GT',
              context: {
                description: 'Average Get Time',
                unit: 'ms'
              }
            },
            {
              triggerId: triggerId,
              type: 'THRESHOLD',
              dataId: dataId2,
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

      let log = this.$log;

      this.$q.all([connTriggerPromise, respTriggerPromise]).then(() => {
        let modalInstance = this.$modal.open({
          templateUrl: 'plugins/metrics/html/modals/alerts-ds-setup.html',
          controller: 'DatasourcesAlertSetupController as das',
          resolve: {
            resourceId: () => {
              return resId;
            }
          }
        });

        modalInstance.result.then(angular.noop, () => {
          log.debug('Datasource Alert Setup modal dismissed at: ' + new Date());
        });
      }, () => {
        this.$log.error('Missing and unable to create new Datasource Alert triggers.');
      });

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

    public deleteDatasource(datasource: any): void {
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

    public autoRefresh(intervalInSeconds: number): void {
      this.autoRefreshPromise = this.$interval(() => {
        this.getDatasources();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    public getDatasources(currentTenantId?: TenantId): any {
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      let tenantId:TenantId = currentTenantId || this.$rootScope.currentPersona.id;
      let idParts = this.$routeParams.resourceId.split('~');
      let feedId = idParts[0];

      this.HawkularInventory.ResourceOfTypeUnderFeed.query({
        environmentId: globalEnvironmentId,
        feedId: feedId,
        resourceTypeId: 'Datasource'}, (aResourceList, getResponseHeaders) => {
        let promises = [];
        let tmpResourceList = [];
        angular.forEach(aResourceList, (res:any) => {
          if (res.id.startsWith(new RegExp(this.$routeParams.resourceId + '~/'))) {
            tmpResourceList.push(res);
            promises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
              gaugeId: 'MI~R~[' + res.id + ']~MT~Datasource Pool Metrics~Available Count',
              distinct: true}, (data) => {
              res.availableCount = data[0];
            }).$promise);
            promises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
              gaugeId: 'MI~R~[' + res.id + ']~MT~Datasource Pool Metrics~In Use Count',
              distinct: true}, (data) => {
              res.inUseCount = data[0];
            }).$promise);
            this.getAlerts(res.id, this.startTimeStamp, this.endTimeStamp, res);
          }
        }, this);
        this.$q.all(promises).then(() => {
          this.resourceList = tmpResourceList;
          this.resourceList.$resolved = true;
          this.getDatasourceChartData();
        });
      },
      () => { // error
        if (!this.resourceList) {
          this.resourceList = [];
          this.resourceList.$resolved = true;
          this['lastUpdateTimestamp'] = new Date();
        }
      });
    }

    public getDatasourceChartData(currentTenantId?: TenantId): any {
      this.endTimeStamp = this.$routeParams.endTime || +moment();
      this.startTimeStamp = this.endTimeStamp - (this.$routeParams.timeOffset || 3600000);

      let tenantId:TenantId = currentTenantId || this.$rootScope.currentPersona.id;

      let availPromises = [];
      let respPromises = [];

      let tmpChartAvailData = {};
      let tmpChartRespData = {};

      angular.forEach(this.resourceList, function(res, idx) {

        if (!this.skipChartData[res.id + '_Available Count']) {
          availPromises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
            gaugeId: 'MI~R~[' + res.id + ']~MT~Datasource Pool Metrics~Available Count',
            start: this.startTimeStamp,
            end: this.endTimeStamp, buckets: 60
          }, (data) => {
            tmpChartAvailData[res.id] = tmpChartAvailData[res.id] || [];
            tmpChartAvailData[res.id][tmpChartAvailData[res.id].length] = {
              key: 'Available Count',
              color: AppServerDatasourcesDetailsController.AVAILABLE_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          }, this).$promise);
        }
        if (!this.skipChartData[res.id + '_In Use Count']) {
          availPromises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
            gaugeId: 'MI~R~[' + res.id + ']~MT~Datasource Pool Metrics~In Use Count',
            start: this.startTimeStamp,
            end: this.endTimeStamp, buckets: 60
          }, (data) => {
            tmpChartAvailData[res.id] = tmpChartAvailData[res.id] || [];
            tmpChartAvailData[res.id][tmpChartAvailData[res.id].length] = {
              key: 'In Use',
              color: AppServerDatasourcesDetailsController.IN_USE_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          }, this).$promise);
        }
        if (!this.skipChartData[res.id + '_Timed Out']) {
          availPromises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
            gaugeId: 'MI~R~[' + res.id + ']~MT~Datasource Pool Metrics~Timed Out',
            start: this.startTimeStamp,
            end: this.endTimeStamp, buckets: 60
          }, (data) => {
            tmpChartAvailData[res.id] = tmpChartAvailData[res.id] || [];
            tmpChartAvailData[res.id][tmpChartAvailData[res.id].length] = {
              key: 'Timed Out',
              color: AppServerDatasourcesDetailsController.TIMED_OUT_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          }, this).$promise);
        }
        this.$q.all(availPromises).finally(()=> {
          this.chartAvailData[res.id] = tmpChartAvailData[res.id] || [];
          this.resolvedAvailData[res.id] = true;
        });

        if (!this.skipChartData[res.id + '_Average Get Time']) {
          respPromises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
            gaugeId: 'MI~R~[' + res.id + ']~MT~Datasource Pool Metrics~Average Get Time',
            start: this.startTimeStamp,
            end: this.endTimeStamp, buckets: 60
          }, (data) => {
            tmpChartRespData[res.id] = tmpChartRespData[res.id] || [];
            tmpChartRespData[res.id][tmpChartRespData[res.id].length] = {
              key: 'Wait Time (Avg.)',
              color: AppServerDatasourcesDetailsController.WAIT_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          }, this).$promise);
        }
        if (!this.skipChartData[res.id + '_Average Creation Time']) {
          respPromises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
            gaugeId: 'MI~R~[' + res.id + ']~MT~Datasource Pool Metrics~Average Creation Time',
            start: this.startTimeStamp,
            end: this.endTimeStamp, buckets: 60
          }, (data) => {
            tmpChartRespData[res.id] = tmpChartRespData[res.id] || [];
            tmpChartRespData[res.id][tmpChartRespData[res.id].length] = {
              key: 'Creation Time (Avg.)',
              color: AppServerDatasourcesDetailsController.CREATION_COLOR,
              values: MetricsService.formatBucketedChartOutput(data)
            };
          }, this).$promise);
        }
        this.$q.all(respPromises).finally(()=> {
          this.chartRespData[res.id] = tmpChartRespData[res.id] || [];
          this.resolvedRespData[res.id] = true;
        });
      }, this);
    }

    public toggleChartData(name): void {
      this.skipChartData[name] = !this.skipChartData[name];
      this.getDatasourceChartData();
    }

  }

  _module.controller('AppServerDatasourcesDetailsController', AppServerDatasourcesDetailsController);
}
