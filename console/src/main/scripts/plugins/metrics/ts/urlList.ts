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

  export class UrlChartDataPoint implements IChartDataPoint {
    public date: Date;
    public min: number;
    public max: number;
    public percentile95th: number;
    public median: number;
    public timestamp: number;
    public value: number;
    public avg: number;
    public empty: boolean;
    public start: number;

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

  interface URL {
    revokeObjectURL(url: string): void;
    createObjectURL(object: any, options?: ObjectURLOptions): string;
    new (url: string, base?: string): URLConstructor;
  }
  declare var URL: URL;

  export class UrlListController {
    /// this is for minification purposes
    public static $inject = ['$location', '$scope', '$rootScope', '$interval', '$log', '$filter', '$modal',
      'HawkularInventory', 'HawkularMetric', 'HawkularAlertsManager', 'ErrorsManager', '$q', 'MetricsService',
      'md5', 'HkHeaderParser', 'NotificationsService', '$routeParams'];

    private autoRefreshPromise: ng.IPromise<number>;
    private static NUM_OF_POINTS = 30;
    private httpUriPart = 'http://';
    private resourceList;
    private resPerPage = 12;

    public filteredResourceList: any[] = [];
    public activeFilters: any[] = [];
    public resCurPage = 0;
    public lastUpdateTimestamp: Date = new Date();
    public headerLinks: any = {};

    private updatingList: boolean = false;
    public loadingMoreItems: boolean = false;
    public addProgress: boolean = false;

    public sorting: any;
    public currentSortIndex: number = 0;
    public startTimeStamp: TimestampInMillis;

    constructor(private $location: ng.ILocationService,
      private $scope: any,
      private $rootScope: any,
      private $interval: ng.IIntervalService,
      private $log: ng.ILogService,
      private $filter: ng.IFilterService,
      private $modal: any,
      private HawkularInventory: any,
      private HawkularMetric: any,
      private HawkularAlertsManager: IHawkularAlertsManager,
      private ErrorsManager: IErrorsManager,
      private $q: ng.IQService,
      private MetricsService: any,
      private md5: any,
      private HkHeaderParser: IHkHeaderParser,
      private NotificationsService: INotificationsService,
      private $routeParams: any,
      public resourceUrl: string) {
      $scope.vm = this;
      this.resourceUrl = this.httpUriPart;
      this.startTimeStamp = +moment().subtract((this.$routeParams.timeOffset || 3600000), 'milliseconds');

      if ($rootScope.currentPersona) {
        this.getResourceList(this.$rootScope.currentPersona.id);
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) =>
          currentPersona && this.getResourceList(currentPersona.id));
      }

      $scope.$on('SwitchedPersona', () => this.getResourceList());
      this.sorting = ['Sort A-Z', 'Sort Z-A'];
      this.setConfigForDataTable();
      this.autoRefresh(20);
    }

    private autoRefresh(intervalInSeconds: number): void {
      this.autoRefreshPromise = this.$interval(() => {
        this.getResourceList();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    public changeSortByIndex(index) {
      this.currentSortIndex = index;
      this.sortUrls();
    }

    public sortUrls() {
      switch (this.currentSortIndex) {
        case 1:
          this.filteredResourceList = this.sortFilteredResourceList().reverse();
          break;
        default:
          this.filteredResourceList = this.sortFilteredResourceList();
          break;
      }
    }

    private sortFilteredResourceList() {
      return _.sortBy(this.filteredResourceList, (a) => {
        return a.properties['hwk-gui-domainSort'];
      });
    }

    public addUrl(url: string): void {

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

      let parsedUrl = new URL(url);
      let hostname = parsedUrl.hostname;
      let levels = hostname.split('.');
      if (levels.length > 1) {
        //doing this twice on a.b.redhat.com will produce redhat.com.a.b
        levels.unshift(levels.pop());
        levels.unshift(levels.pop());

        //replace all the www's with a space so that they sort before any other name
        levels = levels.map(function(s) {
          return s === 'www' ? ' ' : s;
        });
      }

      let domainSort = levels.join('.');

      let resourceId = this.md5.createHash(url || '');
      let resource = {
        resourceTypePath: '/URL',
        id: resourceId,
        properties: {
          created: new Date().getTime(),
          url: url,
          'hwk-gui-domainSort': domainSort
        }
      };

      this.$log.info('Adding new Resource Url to Hawkular-inventory: ' + url);

      let metricId: string;
      let defaultEmail = this.$rootScope.userDetails.email || 'myemail@company.com';
      let err = (error: any, msg: string): void => this.ErrorsManager.errorHandler(error, msg);
      let currentTenantId: TenantId = this.$rootScope.currentPersona.id;
      let resourcePath: string;

      /// Add the Resource and its metrics
      this.HawkularInventory.Resource.save({ environmentId: globalEnvironmentId }, resource).$promise
        .then((newResource) => {
          this.getResourceList(currentTenantId);
          metricId = resourceId;
          this.$log.info('New Resource ID: ' + metricId + ' created.');

          let metricsIds: string[] = [metricId + '.status.duration', metricId + '.status.code'];
          let metrics = [{
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

          let errMetric = (error: any) => err(error, 'Error saving metric.');
          let createMetric = (metric: any) =>
            this.HawkularInventory.Metric.save({
              environmentId: globalEnvironmentId
            }, metric).$promise;

          let associateResourceWithMetrics = () =>
            this.HawkularInventory.MetricOfResource.save({
              environmentId: globalEnvironmentId,
              resourcePath: resourceId
            }, ['/e;' + globalEnvironmentId + '/m;' + metricsIds[0], '/e;' + globalEnvironmentId + '/m;' +
              metricsIds[1]]).$promise;

          /// For right now we will just Register a couple of metrics automatically
          return this.$q.all([createMetric(metrics[0]), createMetric(metrics[1])])
            .then(associateResourceWithMetrics, errMetric)
            .catch((e) => err(e, 'Error associating metrics with resource.'));
        })

        // Find if a default email exists
        .then(() => this.HawkularAlertsManager.addEmailAction(defaultEmail),
        (e) => err(e, 'Error during saving metrics.'))

        // Create threshold trigger for newly created metrics
        .then(() => {

          for (let i = 0; i < this.resourceList.length; i++) {
            if (metricId === this.resourceList[i].id) {
              resourcePath = this.resourceList[i].path;
              break;
            }
          }

          let triggerId = metricId + '_trigger_thres';
          let dataId: string = triggerId.slice(0, -14) + '.status.duration';
          let fullTrigger = {
            trigger: {
              id: triggerId,
              name: 'URL Response [' + url + ']',
              description: 'Response Time for URL ' + url,
              autoEnable: true, // Enable trigger once an alert is resolved
              autoResolve: true, // We do support AUTORESOLVE mode as an inverse of the firing conditions
              severity: 'HIGH',
              actions: { email: [defaultEmail] },
              tags: {
                resourceId: resourceId
              },
              context: {
                alertType: 'PINGRESPONSE',
                resourceType: 'URL',
                resourceName: url,
                resourcePath: resourcePath,
                triggerType: 'Threshold'
              }
            },
            dampenings: [
              {
                triggerId: triggerId,
                evalTimeSetting: 7 * 60000,
                triggerMode: 'FIRING',
                type: 'STRICT_TIME'
              },
              {
                triggerId: triggerId,
                evalTimeSetting: 5 * 60000,
                triggerMode: 'AUTORESOLVE',
                type: 'STRICT_TIME'
              }
            ],
            conditions: [
              {
                triggerId: triggerId,
                triggerMode: 'FIRING',
                type: 'THRESHOLD',
                dataId: dataId,
                operator: 'GT',
                threshold: 1000,
                context: {
                  description: 'Response Time',
                  unit: 'ms'
                }
              },
              {
                triggerId: triggerId,
                triggerMode: 'AUTORESOLVE',
                type: 'THRESHOLD',
                dataId: dataId,
                operator: 'LTE',
                threshold: 1000,
                context: {
                  description: 'Response Time',
                  unit: 'ms'
                }
              }
            ]
          };
          return this.HawkularAlertsManager.createTrigger(fullTrigger,
            (e) => err(e, 'Error saving threshold trigger.')
          );
        })

        // Create availability trigger for newly created metrics
        .then(() => {
          let triggerId = metricId + '_trigger_avail';
          let dataId: string = triggerId.slice(0, -14);
          let fullTrigger = {
            trigger: {
              id: triggerId,
              name: 'URL Down [' + url + ']',
              description: 'Availability for URL ' + url,
              autoEnable: true, // Enable trigger once an alert is resolved
              autoResolve: true, // We do support AUTORESOLVE mode as an inverse of the firing conditions
              severity: 'CRITICAL',
              actions: { email: [defaultEmail] },
              tags: {
                resourceId: resourceId
              },
              context: {
                alertType: 'PINGAVAIL',
                resourceType: 'URL',
                resourceName: url,
                resourcePath: resourcePath,
                triggerType: 'Availability'
              }
            },
            dampenings: [
              {
                triggerId: triggerId,
                evalTimeSetting: 7 * 60000,
                triggerMode: 'FIRING',
                type: 'STRICT_TIME'
              },
              {
                triggerId: triggerId,
                evalTimeSetting: 5 * 60000,
                triggerMode: 'AUTORESOLVE',
                type: 'STRICT_TIME'
              }
            ],
            conditions: [
              {
                triggerId: triggerId,
                triggerMode: 'FIRING',
                type: 'AVAILABILITY',
                dataId: dataId,
                operator: 'DOWN',
                context: {
                  description: 'Availability'
                }
              },
              {
                triggerId: triggerId,
                triggerMode: 'AUTORESOLVE',
                type: 'AVAILABILITY',
                dataId: dataId,
                operator: 'UP',
                context: {
                  description: 'Availability'
                }
              }
            ]
          };

          return this.HawkularAlertsManager.createTrigger(fullTrigger,
            (e) => err(e, 'Error saving availability trigger.')
          );
        })

        //this.$location.url('/hawkular/' + metricId);
        .then(() => this.$log.log('Your data is being collected.'),
        (e) => err(e, 'Error saving availability trigger.'))

        .finally(() => {
          this.resourceUrl = this.httpUriPart;
          this.$scope.addUrlForm.$setPristine();
          this.addProgress = false;
        });
    }

    public getResourceList(currentTenantId?: TenantId): any {
      this.updatingList = true;
      let tenantId: TenantId = currentTenantId || this.$rootScope.currentPersona.id;
      let sort = 'hwk-gui-domainSort';
      let order = 'asc';
      this.HawkularInventory.ResourceOfType.query(
        { resourceTypeId: 'URL', per_page: this.resPerPage, page: this.resCurPage, sort: sort, order: order },
        (aResourceList, getResponseHeaders) => {
          // FIXME: hack.. make expanded out of list
          this.headerLinks = this.HkHeaderParser.parse(getResponseHeaders());

          aResourceList.expanded = this.resourceList ? this.resourceList.expanded : [];
          let promises = [];
          angular.forEach(aResourceList, function(res) {
            let traitsArray: string[] = [];
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
              let chartData = [];
              _.forEach(resource.slice(0, UrlListController.NUM_OF_POINTS), (item) => {
                if (item.hasOwnProperty('value') && item.hasOwnProperty('timestamp')) {
                  chartData.push(new UrlChartDataPoint(item['value'], item['timestamp']));
                }
              });
              res['graphResponseTime'] = MetricsService.formatResponseTimeData(chartData);
            }).$promise);
            promises.push(this.HawkularMetric.AvailabilityMetricData(tenantId).query({
              availabilityId: res.id, distinct: true,
              start: 1, end: moment().valueOf()
            }, (resource) => {
              resource.reverse(); // FIXME: HAWKULAR-366
              res['isUp'] = (resource[0] && resource[0].value === 'up');
            }).$promise);
            let availPromise = this.MetricsService.retrieveAvailabilityMetrics(this.$rootScope.currentPersona.id,
              res.id, 1, moment().valueOf(), 1);
            promises.push(availPromise);
            availPromise.then((resource) => {
              res['availability'] = resource[0].uptimeRatio * 100;
              res['downtimeDuration'] = Math.round(resource[0].downtimeDuration / 1000 / 60);
              res['lastDowntime'] = resource[0].lastDowntime;
            });
            this.lastUpdateTimestamp = new Date();
          }, this);
          this.$q.all(promises).then(() => {
            this.resourceList = aResourceList;
            this.updatingList = this.loadingMoreItems = false;
            this.$scope.$emit('list:updated');
          });

        });
    }

    public deleteResource(resource: any): any {
      this.$modal.open({
        templateUrl: 'plugins/metrics/html/modals/delete-resource.html',
        controller: DeleteResourceModalController,
        resolve: {
          resource: () => resource
        }
      }).result.then(result => this.getResourceList());
    }

    public setPage(page: number): void {
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

    private arrayWithAll(orginalArray: string[]): string[] {
      let arrayWithAll = orginalArray;
      arrayWithAll.unshift('All');
      return arrayWithAll;
    }

    private setConfigForDataTable(): void {
      this.activeFilters = [{
        id: 'byText',
        title: 'Name',
        placeholder: 'Containts text',
        filterType: 'text'
      },
        {
          id: 'state',
          title: 'State',
          placeholder: 'Filter by State',
          filterType: 'select',
          filterValues: this.arrayWithAll(
            Object.keys(DatasourceStatus).map(
              type => DatasourceStatus[type].value
            )
          )
        }];
    }

    public filterBy(filters: any): void {
      let filterObj = this.resourceList;
      this['search'] = '';
      filters.forEach((filter) => {
        filterObj = filterObj.filter((item: any) => {
          if (filter.value === 'All') {
            return true;
          }
          switch (filter.id) {
            case 'state':
              return item.isUp && filter.value === 'Up' || !item.isUp && filter.value === 'Down';
            case 'byText':
              return (item.properties.url.indexOf(filter.value)) !== -1;
          }
        });
      });
      this.filteredResourceList = filterObj;
      this.sortUrls();
    }
  }

  class DeleteResourceModalController {

    public static $inject = ['$scope', '$rootScope', '$modalInstance', '$q', 'HawkularInventory',
      'HawkularAlertsManager', 'NotificationsService', 'resource'];

    constructor(private $scope: any,
      private $rootScope: any,
      private $modalInstance: any,
      private $q: ng.IQService,
      private HawkularInventory,
      private HawkularAlertsManager: HawkularMetrics.IHawkularAlertsManager,
      private NotificationsService: INotificationsService,
      public resource) {
      $scope.vm = this;
    }

    public deleteResource() {
      let metricsIds: string[] = [this.resource.id + '.status.duration', this.resource.id + '.status.code'];
      let triggerIds: string[] = [this.resource.id + '_trigger_thres', this.resource.id + '_trigger_avail'];
      let deleteMetric = (metricId: string) =>
        this.HawkularInventory.Metric.delete({
          environmentId: globalEnvironmentId,
          metricId: metricId
        }).$promise;

      let removeResource = () =>
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
          this.$modalInstance.close(res);
        });
    }

    public cancel() {
      this.$modalInstance.dismiss('cancel');
    }

  }
  _module.controller('UrlListController', UrlListController);

}
