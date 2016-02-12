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

  export class AppServerDatasourcesDetailsController implements IRefreshable {
    public static AVAILABLE_COLOR = '#1884c7'; /// blue
    public static IN_USE_COLOR = '#49a547'; /// green
    public static TIMED_OUT_COLOR = '#515252'; /// dark gray
    public static WAIT_COLOR = '#bcb932'; /// yellow
    public static CREATION_COLOR = '#95489c'; /// purple

    private static BASE_URL = '/hawkular-ui/app/app-details';

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
    public driversList;

    public resolvedAvailData = {};
    public resolvedRespData = {};

    public defaultEmail: string;

    public startTimeStamp: TimestampInMillis;
    public endTimeStamp: TimestampInMillis;

    private feedId: FeedId;
    private resourceId: ResourceId;

    constructor(private $scope: any,
      private $rootScope: IHawkularRootScope,
      private $routeParams: any,
      private $interval: ng.IIntervalService,
      private $q: ng.IQService,
      private $filter: any,
      private HawkularInventory: any,
      private HawkularMetric: any,
      private HawkularNav: any,
      private HawkularAlertsManager: HawkularMetrics.IHawkularAlertsManager,
      private HawkularAlertRouterManager: IHawkularAlertRouterManager,
      private ErrorsManager: IErrorsManager,
      private MetricsService: IMetricsService,
      private $log: ng.ILogService,
      private $location: ng.ILocationService,
      private $modal: any) {
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
      this.$scope.$on('ChartTimeRangeChanged', (event, data: Date[]) => {
        this.startTimeStamp = data[0].getTime();
        this.endTimeStamp = data[1].getTime();
        this.HawkularNav.setTimestampStartEnd(this.startTimeStamp, this.endTimeStamp);
        this.refresh();
      });

      if ($rootScope.currentPersona) {
        this.refresh();
      } else {
        /// currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) => currentPersona && this.refresh());
      }

      this.autoRefresh(20);
    }

    public showDriverAddDialog(): void {

      /// create a new isolate scope for dialog inherited from current scope instead of default $rootScope
      let driverAddDialog = this.$modal.open({
        templateUrl: 'plugins/metrics/html/app-details/modals/detail-datasources-driver-add.html',
        controller: 'AppServerDatasourcesDriverAddDialogController as dac',
        scope: this.$scope.$new()
      });

      driverAddDialog.result.then((modalValue) => {
        this.refresh();
      }, (reason) => {
        // handle any returned cancel reason if required
      });
    }

    public showDatasourceAddDialog(): void {

      /// create a new isolate scope for dialog inherited from current scope instead of default $rootScope
      let datasourceAddDialog = this.$modal.open({
        templateUrl: 'plugins/metrics/html/app-details/modals/detail-datasources-add.html',
        controller: 'AppServerDatasourcesAddDialogController as dac',
        scope: this.$scope.$new()
      });

      datasourceAddDialog.result.then((modalValue) => {
        console.log('sdfsdf');
        this.refresh();
      }, (reason) => {
        console.log('sdfsdf');
        // handle any returned cancel reason if required
      });
    }

    /* tslint:disable:no-unused-variable */

    public showDatasourceEditDialog(datasource: any): void {
      /// create a new isolate scope for dialog inherited from current scope instead of default $rootScope
      let datasourceEditDialog = this.$modal.open({
        templateUrl: 'plugins/metrics/html/app-details/modals/detail-datasources-edit.html',
        controller: 'AppServerDatasourcesEditDialogController as mvm',
        resolve: {
          datasource: () => datasource
        }
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
        this.refresh();
      }, (reason) => {
        // handle any returned cancel reason if required
      });
    }

    public deleteDriver(driver: any): void {
      /// create a new isolate scope for dialog inherited from current scope instead of default $rootScope
      let driverDeleteDialog = this.$modal.open({
        templateUrl: 'plugins/metrics/html/app-details/modals/detail-datasources-driver-delete.html',
        controller: 'AppServerDatasourcesDriverDeleteDialogController as mvm',
        resolve: {
          driver: () => driver
        }
      });
    }

    public autoRefresh(intervalInSeconds: number): void {
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

      this.getDatasources();

      this.$rootScope.lastUpdateTimestamp = new Date();
    }

    private getDSMetrics(resourceLists, currentTenantId?: TenantId) {
      let tenantId: TenantId = currentTenantId || this.$rootScope.currentPersona.id;
      let promises = [];
      let tmpResourceList = [];

      if (!resourceLists.length || _.every(resourceLists, { 'length': 0 })) {
        this.resourceList = [];
        this.resourceList.$resolved = true;
      }

      angular.forEach(resourceLists, (aResourceList) => {
        angular.forEach(aResourceList, (res: IResource) => {
          if (res.id.indexOf(this.$routeParams.resourceId + '~/') === 0) {
            res.feedId = this.feedId;
            tmpResourceList.push(res);
            promises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
              gaugeId: MetricsService.getMetricId('M', this.feedId, res.id, 'Datasource Pool Metrics~Available Count'),
              distinct: true
            }, (data: number[]) => {
              res.availableCount = data[0];
            }).$promise);
            promises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
              gaugeId: MetricsService.getMetricId('M', this.feedId, res.id, 'Datasource Pool Metrics~In Use Count'),
              distinct: true
            }, (data: number[]) => {
              res.inUseCount = data[0];
            }).$promise);
            this.HawkularAlertRouterManager.registerForAlerts(
              res.feedId + '/' + res.id,
              'datasource',
              _.bind(AppServerDatasourcesDetailsController.filterAlerts, this, _, res)
            );
            this.getAlerts(res);
          }
        });
        this.$q.all(promises).then(() => {
          _.each(tmpResourceList, (item) => {
            this.initPie(item);
          });
          this.resourceList = tmpResourceList;
          this.resourceList.$resolved = true;
        });
      });
    }

    public getDatasources(currentTenantId?: TenantId): void {
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

    public static filterAlerts(alertData: IHawkularAlertQueryResult, res: IResource) {
      let currentAlertList = alertData.alertList;
      _.forEach(currentAlertList, (item: IAlert) => {
        item.alertType = item.context.alertType;
      });
      res.alertList = currentAlertList;
      return currentAlertList;
    }

    private getAlerts(res: IResource): void {
      this.HawkularAlertRouterManager.getAlertsForResourceId(
        res.feedId + '/' + res.id,
        this.startTimeStamp,
        this.endTimeStamp
      );
    }

    public getDrivers(currentTenantId?: TenantId): void {
      this.HawkularInventory.ResourceOfTypeUnderFeed.query({
        feedId: this.$routeParams.feedId,
        resourceTypeId: 'JDBC Driver'
      }, (aResourceList, getResponseHeaders) => {
        this.driversList = aResourceList;
      });

    }

    // FIXME: This should be simplified
    public redirectToDataSource(resource, event) {
      if (this.canRedirect(event.target)) {
        this.$location.path(
          [
            AppServerDatasourcesDetailsController.BASE_URL,
            this.$routeParams.feedId,
            this.$routeParams.resourceId,
            this.$routeParams.tabId,
            Utility.encodeResourceId(resource.id),
            this.$routeParams.timeOffset || 3600000 * 12,
            this.$routeParams.endTime || +moment()
          ].join('/')
        );
        //let newLocation = `${AppServerDatasourcesDetailsController.BASE_URL}/${this.$routeParams.feedId}/` +
        //  `${this.$routeParams.resourceId}/${this.$routeParams.tabId}/${Utility.encodeResourceId(resource.id)}`;
        //newLocation += this.$routeParams.timeOffset ? `/${this.$routeParams.timeOffset}` : '';
        //newLocation += this.$routeParams.endTime ? `/${this.$routeParams.endTime}` : '';
        //console.log(newLocation);
        //this.$location.path(newLocation);
      }
    }

    private canRedirect(clickedElement): boolean {
      let tags = ['button', 'a'];
      return !(
        tags.indexOf(clickedElement.tagName.toLowerCase()) !== -1 ||
        clickedElement.classList.contains('caret')
      );
    }

    public isDefinedAndValue(value) {
      return typeof value !== 'undefined' && value != null;
    }

    public initPie(data) {
      if (data && data.inUseCount) {
        let used = data.inUseCount.value / (data.inUseCount.value + data.availableCount.value) * 100 || 0;
        used = Math.round(used * 100) / 100;
        data.chartConfig = {
          multiLineTitle: [
            { text: this.$filter('number')(used, used ? 1 : 0) + '%', dy: -10, classed: 'donut-title-big-pf' },
            { text: 'Connections', dy: 20, classed: 'donut-title-small-pf' },
            { text: 'Used', dy: 15, classed: 'donut-title-small-pf' }
          ],
          type: 'donut',
          donut: {
            label: {
              show: false
            },
            title: used + '%',
            width: 15
          },
          size: {
            height: 171
          },
          legend: {
            show: false
          },
          color: {
            pattern: ['#0088CE', '#D1D1D1']
          },
          data: {
            type: 'donut',
            columns: [
              ['Used', used],
              ['Available', 100 - used]
            ],
            groups: [
              ['used', 'available']
            ],
            order: null
          }
        };
      }
    }
  }

  _module.controller('AppServerDatasourcesDetailsController', AppServerDatasourcesDetailsController);
}
