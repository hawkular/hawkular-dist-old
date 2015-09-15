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

  export class AppServerDeploymentsDetailsController {
    /// this is for minification purposes
    public static $inject = ['$location', '$scope', '$rootScope', '$interval', '$log', '$filter', '$routeParams',
      '$modal', 'HawkularInventory', 'HawkularMetric', 'HawkularAlert', 'HawkularOps', 'HawkularAlertsManager',
      'ErrorsManager', '$q', 'NotificationsService'];

    private autoRefreshPromise:ng.IPromise<number>;
    private resourceList;
    public modalInstance;
    public alertList;
    public selectCount:number = 0;
    public lastUpdateTimestamp:Date;
    public startTimeStamp:TimestampInMillis;
    public endTimeStamp:TimestampInMillis;

    constructor(private $location:ng.ILocationService,
                private $scope:any,
                private $rootScope:IHawkularRootScope,
                private $interval:ng.IIntervalService,
                private $log:ng.ILogService,
                private $filter:ng.IFilterService,
                private $routeParams:any,
                private $modal:any,
                private HawkularInventory:any,
                private HawkularMetric:any,
                private HawkularAlert:any,
                private HawkularOps:any,
                private HawkularAlertsManager:IHawkularAlertsManager,
                private ErrorsManager:IErrorsManager,
                private $q:ng.IQService,
                private NotificationsService:INotificationsService) {
      $scope.vm = this;
      HawkularOps.init(this.NotificationsService);

      this.startTimeStamp = +moment().subtract(1, 'hours');
      this.endTimeStamp = +moment();

      if ($rootScope.currentPersona) {
        this.getResourceList(this.$rootScope.currentPersona.id);
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) => currentPersona &&
        this.getResourceList(currentPersona.id));
      }

      this.autoRefresh(20);
    }


    private autoRefresh(intervalInSeconds:number):void {
      this.autoRefreshPromise = this.$interval(() => {
        this.getResourceList();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    public showDeploymentAddDialog():void {

      this.$log.debug('Starting Show Add Dialog');

      /// create a new isolate scope for dialog inherited from current scope instead of default $rootScope
      let deployAddDialog = this.$modal.open({
        templateUrl: 'plugins/metrics/html/app-details/modals/detail-deployments-add.html',
        controller: 'AppServerDeploymentsAddDialogController as dac',
        scope: this.$scope.$new()
      });


      let logger = this.$log;
      deployAddDialog.result.then((modalValue) => {
        logger.debug('Modal Closed: ' + modalValue);

      }, (reason) => {
        logger.debug('Modal cancelled at: ' + new Date());
      });
    }


    public getResourceList(currentTenantId?: TenantId): any {
      this.alertList = []; // FIXME: when we have alerts for app server
      let tenantId:TenantId = currentTenantId || this.$rootScope.currentPersona.id;
      let idParts = this.$routeParams.resourceId.split('~');
      let feedId = idParts[0];
      this.HawkularInventory.ResourceOfTypeUnderFeed.query({
          environmentId: globalEnvironmentId,
          feedId: feedId,
          resourceTypeId: 'Deployment'}, (aResourceList, getResponseHeaders) => {
          let promises = [];
          let tmpResourceList = [];
          angular.forEach(aResourceList, (res: any) => {
            if (res.id.startsWith(new RegExp(this.$routeParams.resourceId + '~/'))) {
              tmpResourceList.push(res);
              res.selected = _.result(_.find(this.resourceList, {'id': res.id}), 'selected');
              promises.push(this.HawkularMetric.AvailabilityMetricData(this.$rootScope.currentPersona.id).query({
                tenantId: tenantId,
                availabilityId: 'AI~R~[' + res.id + ']~AT~Deployment Status~Deployment Status',
                distinct: true}, (resource) => {
                let latestData = resource[resource.length-1];
                if (latestData) {
                  res['state'] = latestData['value'];
                  res['updateTimestamp'] = latestData['timestamp'];
                }
              }).$promise);
            }
            this.lastUpdateTimestamp = new Date();
          }, this);
          this.$q.all(promises).then((notUsed) => {
            this.resourceList = tmpResourceList;
            this.resourceList.$resolved = true;
          });
        },
        () => { // error
          if (!this.resourceList) {
            this.resourceList = [];
            this.resourceList.$resolved = true;
            this.lastUpdateTimestamp = new Date();
          }
        });
    }


    public performOperation(operationName:string, resourceId:ResourceId):void {
      this.$log.info(`performOperation: ${operationName} for resourceId: ${resourceId} `);
      let operation = {operationName: operationName, resourceId: resourceId};
      this.HawkularOps.performOperation(operation);
    }

    public performOperationMulti(operationName:string, resourceList:any):void {
      let selectedList = _.filter(this.resourceList, 'selected');
      this.$log.info(`performOperationMulti for operation: ${operationName}`);
      _.forEach(selectedList, (item:any) => {
        let operation = {operationName: operationName, resourceId: item.id};
        this.HawkularOps.performOperation(operation);
      });
    }

    public selectItem(item):void {
      item.selected = !item.selected;
      this.selectCount = _.filter(this.resourceList, 'selected').length;
    }

    public selectAll():void {
      let toggleTo = this.selectCount !== this.resourceList.length;
      _.forEach(this.resourceList, (item:any) => {
        item.selected = toggleTo;
      });
      this.selectCount = toggleTo ? this.resourceList.length : 0;
    }
  }

  _module.controller('AppServerDeploymentsDetailsController', AppServerDeploymentsDetailsController);

}
