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

  export class AppServerDeploymentsDetailsController {
    /// this is for minification purposes
    public static $inject = ['$location', '$scope', '$rootScope', '$interval', '$log', '$filter', '$routeParams',
      '$modal', 'HawkularInventory', 'HawkularMetric', 'HawkularAlert', 'HawkularAlertsManager', 'HawkularErrorManager',
      '$q', 'md5'];

    private resourceList;
    private metricsList;
    public alertList;

    constructor(private $location: ng.ILocationService,
      private $scope: any,
      private $rootScope: any,
      private $interval: ng.IIntervalService,
      private $log: ng.ILogService,
      private $filter: ng.IFilterService,
      private $routeParams: any,
      private $modal: any,
      private HawkularInventory: any,
      private HawkularMetric: any,
      private HawkularAlert: any,
      private HawkularAlertsManager: HawkularMetrics.IHawkularAlertsManager,
      private HawkularErrorManager: HawkularMetrics.IHawkularErrorManager,
      private $q: ng.IQService,
      private md5: any,
      public startTimeStamp:TimestampInMillis,
      public endTimeStamp:TimestampInMillis,
      public resourceUrl: string) {
        $scope.vm = this;

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

    private autoRefreshPromise: ng.IPromise<number>;

    cancelAutoRefresh(): void {
      this.$interval.cancel(this.autoRefreshPromise);
      toastr.info('Canceling Auto Refresh');
    }

    autoRefresh(intervalInSeconds: number): void {
      this.autoRefreshPromise = this.$interval(() => {
        this.getResourceList();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    getResourceList(currentTenantId?: TenantId): any {
      this.alertList = []; // FIXME: when we have alerts for app server
      var tenantId:TenantId = currentTenantId || this.$rootScope.currentPersona.id;
      this.HawkularInventory.ResourceOfType.query({resourceTypeId: 'Deployment'},
          (aResourceList, getResponseHeaders) => {
        var promises = [];
        var tmpResourceList = [];
        angular.forEach(aResourceList, function(res, idx) {
          if (res.id.startsWith(new RegExp('\\[' + this.$routeParams.resourceId + '~/'))) {
            tmpResourceList.push(res);
            promises.push(this.HawkularMetric.AvailabilityMetricData(this.$rootScope.currentPersona.id).query({
              tenantId: tenantId,
              availabilityId: 'AI~R~' + res.id + '~AT~Deployment Status~Deployment Status',
              distinct: true}, (resource) => {
                var latestData = resource[resource.length-1];
                if (latestData) {
                  res['state'] = latestData['value'];
                  res['updateTimestamp'] = latestData['timestamp'];
                }
            }).$promise);
          }
          this.lastUpdateTimestamp = new Date();
        }, this);
        this.$q.all(promises).then((result) => {
          this.resourceList = tmpResourceList;
          this.resourceList.$resolved = true;
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

  }

  _module.controller('HawkularMetrics.AppServerDeploymentsDetailsController', AppServerDeploymentsDetailsController);

}
