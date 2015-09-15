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

/// <reference path='metricsPlugin.ts'/>
/// <reference path='services/alertsManager.ts'/>
/// <reference path='services/paginationService.ts'/>
/// <reference path='services/errorsManager.ts'/>
/// <reference path='services/notificationsService.ts'/>

module HawkularMetrics {

  // work around https://github.com/Microsoft/TypeScript/issues/2583
  // re-declare the URL from lib.d.ts to conform to what's actually available from javascript runtime
  interface URLConstructor {
    hash: string;
    search: string;
    pathname: string;
    port: string;
    hostname: string;
    host: string;
    password: string;
    username: string;
    protocol: string;
    origin: string;
    href: string;
  }
  interface URL {
    revokeObjectURL(url:string): void;
    createObjectURL(object:any, options?:ObjectURLOptions): string;
    new(url:string, base?:string): URLConstructor;
  }
  declare var URL:URL;

  export class UrlListController {
    /// this is for minification purposes
    public static $inject = ['$location', '$scope', '$rootScope', '$interval', '$log', '$filter', '$modal',
      'HawkularInventory', 'HawkularMetric', 'HawkularAlert', 'HawkularAlertsManager', 'ErrorsManager', '$q',
      'md5', 'HkHeaderParser', 'NotificationsService'];

    private autoRefreshPromise:ng.IPromise<number>;
    private httpUriPart = 'http://';
    private resourceList;
    private resPerPage = 5;
    public resCurPage = 0;
    public alertList;
    public lastUpdateTimestamp:Date = new Date();
    public headerLinks: any = {};

    private updatingList: boolean = false;
    public loadingMoreItems: boolean = false;
    public addProgress: boolean = false;

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
                private HawkularAlertsManager:IHawkularAlertsManager,
                private ErrorsManager:IErrorsManager,
                private $q:ng.IQService,
                private md5:any,
                private HkHeaderParser:IHkHeaderParser,
                private NotificationsService:INotificationsService,
                public resourceUrl:string) {
      $scope.vm = this;
      this.resourceUrl = this.httpUriPart;

      if ($rootScope.currentPersona) {
        this.getResourceList(this.$rootScope.currentPersona.id);
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) =>
        currentPersona && this.getResourceList(currentPersona.id));
      }

      this.autoRefresh(20);
    }


    private autoRefresh(intervalInSeconds:number):void {
      this.autoRefreshPromise = this.$interval(()  => {
        this.getResourceList();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    public addUrl(url:string):void {

      if (this.$scope.addUrlForm.$invalid) {
        return;
      }

      this.addProgress = true;

      // prepare data for custom sorting of URLs.
      // We sort first by second and first levels and then by the rest of the levels in the order as they
      // lexicographically appear in the URL.
      // E.g. a.b.c.com will become c.com.a.b and we use this to sort the URLs instead of the URL strings
      // themselves.
      // Also, www is translated to a single space, so that it sorts before any other subdomain.

      var parsedUrl = new URL(url);
      var hostname = parsedUrl.hostname;
      var levels = hostname.split('.');
      if (levels.length > 1) {
        //doing this twice on a.b.redhat.com will produce redhat.com.a.b
        levels.unshift(levels.pop());
        levels.unshift(levels.pop());

        //replace all the www's with a space so that they sort before any other name
        levels = levels.map(function (s) {
          return s === 'www' ? ' ' : s;
        });
      }

      var domainSort = levels.join('.');

      var resourceId = this.md5.createHash(url || '');
      var resource = {
        resourceTypePath: '/URL',
        id: resourceId,
        properties: {
          url: url,
          'hwk-gui-domainSort': domainSort
        }
      };

      this.$log.info('Adding new Resource Url to Hawkular-inventory: ' + url);

      var metricId:string;
      var defaultEmail = this.$rootScope.userDetails.email || 'myemail@company.com';
      var err = (error:any, msg:string):void => this.ErrorsManager.errorHandler(error, msg);
      var currentTenantId:TenantId = this.$rootScope.currentPersona.id;

      /// Add the Resource and its metrics
      this.HawkularInventory.Resource.save({environmentId: globalEnvironmentId}, resource).$promise
        .then((newResource) => {
          this.getResourceList(currentTenantId);
          metricId = resourceId;
          console.dir(newResource);
          this.$log.info('New Resource ID: ' + metricId + ' created.');

          var metricsIds:string[] = [metricId + '.status.duration', metricId + '.status.code'];
          var metrics = [{
            id: metricsIds[0],
            metricTypePath: '/status.duration.type',
            properties: {
              description: 'Response Time in ms.'
            }
          }, {
            id: metricsIds[1],
            metricTypePath: '/status.code.type',
            properties: {
              description: 'Status Code'
            }
          }];

          var errMetric = (error:any) => err(error, 'Error saving metric.');
          var createMetric = (metric:any) =>
            this.HawkularInventory.Metric.save({
              environmentId: globalEnvironmentId
            }, metric).$promise;

          var associateResourceWithMetrics = () =>
            this.HawkularInventory.MetricOfResource.save({
              environmentId: globalEnvironmentId,
              resourcePath: resourceId
            }, ['../' + metricsIds[0], '../' + metricsIds[1]]).$promise;

          /// For right now we will just Register a couple of metrics automatically
          return this.$q.all([createMetric(metrics[0]), createMetric(metrics[1])])
            .then(associateResourceWithMetrics, errMetric)
            .catch((e) => err(e, 'Error associating metrics with resource.'));
        })

        // Find if a default email exists
        .then(() => this.HawkularAlertsManager.addEmailAction(defaultEmail),
        (e) => err(e, 'Error during saving metrics.'))

        // Create threshold trigger for newly created metrics
        .then(() => this.HawkularAlertsManager.createTrigger(metricId + '_trigger_thres', url, true, 'THRESHOLD',
          defaultEmail),
        (e) => err(e, 'Error saving email action.'))

        // Create availability trigger for newly created metrics
        .then((alert) => this.HawkularAlertsManager.createTrigger(metricId + '_trigger_avail', url, false,
          'AVAILABILITY', defaultEmail),
        (e) => err(e, 'Error saving threshold trigger.'))

        //this.$location.url('/hawkular/' + metricId);
        .then(() => this.NotificationsService.info('Your data is being collected. Please be patient (should be about ' +
          'another minute).'),
        (e) => err(e, 'Error saving availability trigger.'))

        .finally(()=> {
          this.resourceUrl = this.httpUriPart;
          this.$scope.addUrlForm.$setPristine();
          this.addProgress = false;
        });
    }

    public getResourceList(currentTenantId?:TenantId):any {
      this.updatingList = true;
      var tenantId:TenantId = currentTenantId || this.$rootScope.currentPersona.id;
      var sort = 'hwk-gui-domainSort';
      var order = 'asc';
      this.HawkularInventory.ResourceOfType.query(
        {resourceTypeId: 'URL', per_page: this.resPerPage, page: this.resCurPage, sort: sort, order: order},
        (aResourceList, getResponseHeaders) => {
          // FIXME: hack.. make expanded out of list
          this.headerLinks = this.HkHeaderParser.parse(getResponseHeaders());

          aResourceList.expanded = this.resourceList ? this.resourceList.expanded : [];
          this.HawkularAlert.Alert.query({statuses: 'OPEN'}, (anAlertList) => {
            this.alertList = anAlertList;
          }, this);
          var promises = [];
          angular.forEach(aResourceList, function (res) {
            var traitsArray:string[] = [];
            if (res.properties['trait-remote-address']) {
              traitsArray.push('IP: ' + res.properties['trait-remote-address']);
            }
            if (res.properties['trait-powered-by']) {
              traitsArray.push('Powered by: ' + res.properties['trait-powered-by']);
            }
            res['traits'] = traitsArray.join(' | ');
            promises.push(this.HawkularMetric.GaugeMetricData(tenantId).queryMetrics({
              resourcePath: res.id, gaugeId: (res.id + '.status.duration'),
              start: moment().subtract(1, 'hours').valueOf(), end: moment().valueOf()
            }, (resource) => {
              res['responseTime'] = resource;
            }).$promise);
            promises.push(this.HawkularMetric.AvailabilityMetricData(tenantId).query({
              availabilityId: res.id, distinct: true,
              start: 1, end: moment().valueOf()
            }, (resource) => {
              resource.reverse(); // FIXME: HAWKULAR-366
              res['isUp'] = (resource[0] && resource[0].value === 'up');
            }).$promise);
            promises.push(this.HawkularMetric.AvailabilityMetricData(tenantId).query({
              availabilityId: res.id,
              start: 1,
              end: moment().valueOf(),
              buckets: 1
            }, (resource) => {
              res['availability'] = resource[0].uptimeRatio * 100;
              res['downtimeDuration'] = Math.round(resource[0].downtimeDuration / 1000 / 60);
              res['lastDowntime'] = resource[0].lastDowntime;
            }).$promise);
            this.lastUpdateTimestamp = new Date();
          }, this);
          this.$q.all(promises).then(() => {
            this.resourceList = aResourceList;
            this.updatingList = this.loadingMoreItems = false;
            this.$scope.$emit('list:updated');
          });

        });
    }

    public deleteResource(resource:any):any {
      this.$modal.open({
        templateUrl: 'plugins/metrics/html/modals/delete-resource.html',
        controller: DeleteResourceModalController,
        resolve: {
          resource: () => resource
        }
      }).result.then(result => this.getResourceList());
    }

    public setPage(page:number):void {
      this.resCurPage = page;
      this.getResourceList();
    }

    public loadMoreItems() {
      if (!this.updatingList && this.resourceList && this.resourceList.length > 0 &&
        this.resourceList.length < parseInt(this.headerLinks.total, 10)) {
        this.loadingMoreItems = true;
        this.resPerPage += 5;
        this.getResourceList();
      }
    }

  }

  class DeleteResourceModalController {

    static $inject = ['$scope', '$rootScope', '$modalInstance', '$q', 'HawkularInventory', 'HawkularAlertsManager',
      'NotificationsService', 'resource'];

    constructor(private $scope:any,
                private $rootScope:any,
                private $modalInstance:any,
                private $q:ng.IQService,
                private HawkularInventory,
                private HawkularAlertsManager:HawkularMetrics.IHawkularAlertsManager,
                private NotificationsService:INotificationsService,
                public resource) {
      $scope.vm = this;
    }

    deleteResource() {
      var metricsIds:string[] = [this.resource.id + '.status.duration', this.resource.id + '.status.code'];
      var triggerIds:string[] = [this.resource.id + '_trigger_thres', this.resource.id + '_trigger_avail'];
      var deleteMetric = (metricId:string) =>
        this.HawkularInventory.Metric.delete({
          environmentId: globalEnvironmentId,
          metricId: metricId
        }).$promise;

      var removeResource = () =>
        this.HawkularInventory.Resource.delete({
          environmentId: globalEnvironmentId,
          resourcePath: this.resource.id
        }).$promise;

      this.$q.all([deleteMetric(metricsIds[0]),
        deleteMetric(metricsIds[1]),
        this.HawkularAlertsManager.deleteTrigger(triggerIds[0]),
        this.HawkularAlertsManager.deleteTrigger(triggerIds[1])])
        .then(removeResource)
        .then((res) => {
          this.NotificationsService.success('The URL ' + this.resource.properties.url +
            ' is no longer being monitored.');
          this.$modalInstance.close(res);
        });
    }

    public cancel() {
      this.$modalInstance.dismiss('cancel');
    }

  }
  _module.controller('UrlListController', UrlListController);

}
