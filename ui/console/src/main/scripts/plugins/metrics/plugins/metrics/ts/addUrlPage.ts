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

/// <reference path="metricsPlugin.ts"/>
/// <reference path="alertsManager.ts"/>
/// <reference path="pagination.ts"/>
/// <reference path="errorManager.ts"/>

module HawkularMetrics {


  export class AddUrlController {
    /// this is for minification purposes
    public static $inject = ['$location', '$scope', '$rootScope', '$interval', '$log', '$filter', '$modal', 'HawkularInventory', 'HawkularMetric', 'HawkularAlert', 'HawkularAlertsManager','HawkularErrorManager', '$q', 'md5', 'HkHeaderParser'];

    private httpUriPart = 'http://';
    public addProgress: boolean = false;
    private resourceList;
    public alertList;
    public lastUpdateTimestamp:Date = new Date();
    private resPerPage = 5;
    public resCurPage = 0;
    public headerLinks = {};

    constructor(private $location:ng.ILocationService,
                private $scope:any,
                private $rootScope:any,
                private $interval:ng.IIntervalService,
                private $log:ng.ILogService,
                private $filter:ng.IFilterService,
                private $modal:any,
                private HawkularInventory:any,
                private HawkularMetric:any,
                private HawkularAlert:any,
                private HawkularAlertsManager: HawkularMetrics.IHawkularAlertsManager,
                private HawkularErrorManager: HawkularMetrics.IHawkularErrorManager,
                private $q: ng.IQService,
                private md5: any,
                private HkHeaderParser: HawkularMetrics.IHkHeaderParser,
                public resourceUrl:string
                ) {
      $scope.vm = this;
      this.resourceUrl = this.httpUriPart;

      if ($rootScope.currentPersona) {
        this.getResourceList(this.$rootScope.currentPersona.id);
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) => currentPersona && this.getResourceList(currentPersona.id));
      }

      this.autoRefresh(20);
    }
    private autoRefreshPromise:ng.IPromise<number>;


    cancelAutoRefresh():void {
      this.$interval.cancel(this.autoRefreshPromise);
      toastr.info('Canceling Auto Refresh');
    }

    autoRefresh(intervalInSeconds:number):void {
      this.autoRefreshPromise = this.$interval(()  => {
        this.getResourceList();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    addUrl(url:string):void {
      this.addProgress = true;

      var resourceId = this.md5.createHash(url || '');
      var resource = {
        resourceTypeId: 'URL',
        id: resourceId,
        properties: {
          url: url
        }
      };

      this.$log.info('Adding new Resource Url to Hawkular-inventory: ' + url);

      var metricId: string;
      var defaultEmail = this.$rootScope.userDetails.email || 'myemail@company.com';
      var err = (error: any, msg: string): void => this.HawkularErrorManager.errorHandler(error, msg);
      var currentTenantId: TenantId = this.$rootScope.currentPersona.id;

      /// Add the Resource and its metrics
      this.HawkularInventory.Resource.save({tenantId: currentTenantId, environmentId: globalEnvironmentId}, resource).$promise
        .then((newResource) => {
          this.getResourceList(currentTenantId);
          metricId = resourceId;
          console.dir(newResource);
          this.$log.info('New Resource ID: ' + metricId + ' created.');

          var metricsIds: string[] = [metricId + '.status.duration', metricId + '.status.code'];
          var metrics = [{
            id: metricsIds[0],
            metricTypeId: 'status.duration.type',
            properties: {
              description: 'Response Time in ms.'
            }
          }, {
            id: metricsIds[1],
            metricTypeId: 'status.code.type',
            properties: {
              description: 'Status Code'
            }
          }];

          var errMetric = (error: any) => err(error, 'Error saving metric.');
          var createMetric = (metric: any) =>
            this.HawkularInventory.Metric.save({
              tenantId: currentTenantId,
              environmentId: globalEnvironmentId
            }, metric).$promise;

          var associateResourceWithMetrics = () =>
            this.HawkularInventory.ResourceMetric.save({
              tenantId: currentTenantId,
              environmentId: globalEnvironmentId,
              resourceId: resourceId
            }, metricsIds).$promise;

          /// For right now we will just Register a couple of metrics automatically
          return this.$q.all([createMetric(metrics[0]), createMetric(metrics[1])])
            .then(associateResourceWithMetrics, errMetric)
            .catch((e) => err(e, 'Error associating metrics with resource.'));
        })

        // Find if a default email exists
        .then(() => this.HawkularAlertsManager.addEmailAction(defaultEmail),
          (e) => err(e, 'Error during saving metrics.'))

        // Create threshold trigger for newly created metrics
        .then(() => this.HawkularAlertsManager.createTrigger(metricId + '_trigger_thres', true, 'THRESHOLD', defaultEmail),
          (e) => err(e, 'Error saving email action.'))

        // Create availability trigger for newly created metrics
        .then((alert) => this.HawkularAlertsManager.createTrigger(metricId + '_trigger_avail', false, 'AVAILABILITY', defaultEmail),
          (e) => err(e, 'Error saving threshold trigger.'))

        //this.$location.url('/hawkular/' + metricId);
        .then(() => toastr.info('Your data is being collected. Please be patient (should be about another minute).'),
          (e) => err(e, 'Error saving availability trigger.'))

        .finally(()=> {
          this.resourceUrl = this.httpUriPart;
          this.$scope.addUrlForm.$setPristine();
          this.addProgress = false;
        });
    }

    getResourceList(currentTenantId?: TenantId):any {
      var tenantId:TenantId = currentTenantId || this.$rootScope.currentPersona.id;
      this.HawkularInventory.ResourceOfType.query({tenantId: tenantId, resourceTypeId: 'URL', per_page: this.resPerPage, page: this.resCurPage}, (aResourceList, getResponseHeaders) => {
        // FIXME: hack.. make expanded out of list
        this.headerLinks = this.HkHeaderParser.parse(getResponseHeaders());

        var pages = getResponseHeaders().link ? getResponseHeaders().link.split(', ') : [];
        for (var p = 0; p < pages.length; p++) {
          if (pages[p].indexOf('')) {
            // get things
          }
        }
        var expanded = this.resourceList ? this.resourceList.expanded : [];
        aResourceList.expanded = expanded;
        this.HawkularAlert.Alert.query({statuses:'OPEN'}, (anAlertList) => {
          this.alertList = anAlertList;
        }, this);
        var promises = [];
        angular.forEach(aResourceList, function(res, idx) {
          promises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
            resourceId: res.id, numericId: (res.id + '.status.duration'),
            start: moment().subtract(1, 'hours').valueOf(), end: moment().valueOf()}, (resource) => {
            // FIXME: Work data so it works for chart ?
            res['responseTime'] = resource;
          }).$promise);
          promises.push(this.HawkularMetric.AvailabilityMetricData(tenantId).query({
            availabilityId: res.id, distinct: true,
            start: 1, end: moment().valueOf()}, (resource) => {
            res['isUp'] = (resource[0] && resource[0].value === 'up');
          }).$promise);
          promises.push(this.HawkularMetric.AvailabilityMetricData(tenantId).query({
            availabilityId: res.id,
            start: 1,
            end: moment().valueOf(),
            buckets: 1}, (resource) => {
            res['availability'] = resource[0].uptimeRatio * 100;
            res['downtimeDuration'] = Math.round(resource[0].downtimeDuration / 1000 / 60);
            res['lastDowntime'] = resource[0].lastDowntime;
          }).$promise);
          this.lastUpdateTimestamp = new Date();
        }, this);
        this.$q.all(promises).then((result) => {
          this.resourceList = aResourceList;
        });

      });
    }

    getAverage(data:any, field:string):number {
      if (data) {
        var sum = 0;
        for (var i = 0; i < data.length; i++) {
          sum += parseInt(data[i][field], 10);
        }
        return Math.round(sum / data.length);
      }
    }

    deleteResource(resource:any):any {
      this.$modal.open({
        templateUrl: 'plugins/metrics/html/modals/delete-resource.html',
        controller: DeleteResourceModalController,
        resolve: {
          resource: () => resource
        }
      }).result.then(result => this.getResourceList());
    }

    setPage(page:number):void {
      this.resCurPage = page;
      this.getResourceList();
    }
  }

  class DeleteResourceModalController {

    static $inject = ['$scope', '$rootScope', '$modalInstance', '$q', 'HawkularInventory', 'HawkularAlertsManager', 'resource'];

    constructor(private $scope: any,
                private $rootScope: any,
                private $modalInstance: any,
                private $q: ng.IQService,
                private HawkularInventory,
                private HawkularAlertsManager: HawkularMetrics.IHawkularAlertsManager,
                public resource) {
      $scope.vm = this;
    }

    deleteResource() {
      var metricsIds: string[] = [this.resource.id + '.status.duration', this.resource.id + '.status.code'];
      var triggerIds: string[] = [this.resource.id + '_trigger_thres', this.resource.id + '_trigger_avail'];
      var deleteMetric = (metricId: string) =>
        this.HawkularInventory.Metric.delete({
          tenantId: this.$rootScope.currentPersona.id,
          environmentId: globalEnvironmentId,
          metricId: metricId
        }).$promise;

      var removeResource = () =>
        this.HawkularInventory.Resource.delete({
          tenantId: this.$rootScope.currentPersona.id,
          environmentId: globalEnvironmentId,
          resourceId: this.resource.id
        }).$promise;

      this.$q.all([deleteMetric(metricsIds[0]),
                   deleteMetric(metricsIds[1]),
                   this.HawkularAlertsManager.deleteTrigger(triggerIds[0]),
                   this.HawkularAlertsManager.deleteTrigger(triggerIds[1])])
      .then(removeResource)
      .then((res) => {
          toastr.success('The site ' + this.resource.properties.url + ' is no longer being monitored.');
          this.$modalInstance.close(res);
      });
    }

    cancel() {
      this.$modalInstance.dismiss('cancel');
    }

  }
  _module.controller('HawkularMetrics.AddUrlController', AddUrlController);

}
