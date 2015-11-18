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
/// <reference path="services/alertsManager.ts"/>
/// <reference path="services/errorsManager.ts"/>

module HawkularMetrics {

  export class ServerStatus {

    constructor (public value:string, public state: string, public icon: string) {
    }

    static SERVER_UP = new ServerStatus('Up', 'up', 'fa-arrow-up');
    static SERVER_DOWN = new ServerStatus('Down', 'down', 'fa-arrow-down');
    static SERVER_UNKNOW = new ServerStatus('Unknown', 'unknown', 'fa-chain-broken');
    static SERVER_STARTING = new ServerStatus('Starting', 'starting', 'fa-spinner');
    static SERVER_RESTART_REQUIRED = new ServerStatus('Restart Required', 'restart required', 'fa-repeat');

    toString = () => {
      return this.value;
    };
  }

  export class ServerType {
    constructor (public value:string, public type:string) {
    }

    static SERVER_EAP = new ServerType('EAP', 'eap');
    static SERVER_WILDFLY = new ServerType('WildFly', 'wildfly');

    toString = () => {
      return this.value;
    };
  }


  export class AppServerListController {
    /// this is for minification purposes
    public static $inject = ['$location', '$scope', '$rootScope', '$interval', '$log', '$filter', '$modal',
        'HawkularInventory', 'HawkularMetric', 'HawkularAlertsManager', 'ErrorsManager', '$q',
        'md5', 'HkHeaderParser'];

    private resourceList;
    private filteredResourceList;
    private resPerPage = 10;
    private resCurPage = 0;
    private autoRefreshPromise: ng.IPromise<number>;
    public alertList;
    public headerLinks = {};
    public activeFilters:any[];
    public serverStatusArray:ServerStatus[];

    constructor(private $location: ng.ILocationService,
                private $scope: any,
                private $rootScope: any,
                private $interval: ng.IIntervalService,
                private $log: ng.ILogService,
                private $filter: ng.IFilterService,
                private $modal: any,
                private HawkularInventory: any,
                private HawkularMetric: any,
                private HawkularAlertsManager: HawkularMetrics.IHawkularAlertsManager,
                private ErrorsManager: HawkularMetrics.IErrorsManager,
                private $q: ng.IQService,
                private md5: any,
                private HkHeaderParser: HawkularMetrics.IHkHeaderParser,
                public startTimeStamp:TimestampInMillis,
                public endTimeStamp:TimestampInMillis,
                public resourceUrl: string) {
      $scope.vm = this;

      if ($rootScope.currentPersona) {
        this.getResourceList(this.$rootScope.currentPersona.id);
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) => currentPersona &&
        this.getResourceList(currentPersona.id));
      }
      this.serverStatusArray = Object.keys(ServerStatus).map(function(type) {
        return ServerStatus[type];
      });

      this.setConfigForDataTable();
      this.autoRefresh(20);
    }

    private arrayWithAll(orginalArray:string[]):string[] {
      let arrayWithAll = orginalArray;
      arrayWithAll.unshift('All');
      return arrayWithAll;
    }

    private setConfigForDataTable():void {
      let _self = this;
      _self.activeFilters = [{
        id: 'type',
        title:  'Type',
        placeholder: 'Filter by type',
        filterType: 'select',
        filterValues: _self.arrayWithAll(Object.keys(ServerType).map(function(type) {
          return ServerType[type].value;
        }))
      },
        {
          id: 'state',
          title:  'State',
          placeholder: 'Filter by State',
          filterType: 'select',
          filterValues: _self.arrayWithAll(Object.keys(ServerStatus).map(function(type) {
            return ServerStatus[type].value;
          }))
        },
        {
          id: 'byText',
          title: 'By text',
          placeholder: 'Containts text',
          filterType: 'text'
        }];
    }

    public filterBy(filters:any):void {
      let _self = this;
      let filterObj = _self.resourceList;
      _self['search'] = '';
      filters.forEach(function (filter) {
        filterObj = filterObj.filter(function(item){
          if (filter.value === 'All') {
            return true;
          }
          switch(filter.id) {
            case 'type':
              return item.type.id.toLowerCase().indexOf(filter.value.toLowerCase()) !== -1;
            case 'state':
              return item.state.toLowerCase() === filter.value.toLowerCase();
            case 'byText':
              _self['search'] = filter.value;
              return true;
          }
        });
      });
      _self.filteredResourceList = filterObj;
    }

    public setPage(page): void {
      this.resCurPage = page;
      this.getResourceList();
    }


    private autoRefresh(intervalInSeconds: number): void {
      this.autoRefreshPromise = this.$interval(() => {
        this.getResourceList();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(this.autoRefreshPromise);
      });
    }

    public getResourceListForOneFeed(feedId: FeedId, currentTenantId?: TenantId):any {
      let tenantId:TenantId = currentTenantId || this.$rootScope.currentPersona.id;
      this.HawkularInventory.ResourceOfTypeUnderFeed.query({
        environmentId: globalEnvironmentId, feedId: feedId,
        resourceTypeId: 'WildFly Server', per_page: this.resPerPage,
        page: this.resCurPage}, (aResourceList, getResponseHeaders) => {
        this.headerLinks = this.HkHeaderParser.parse(getResponseHeaders());
        let promises = [];
        angular.forEach(aResourceList, function(res) {
          promises.push(this.HawkularMetric.AvailabilityMetricData(tenantId).query({
            availabilityId: 'AI~R~[' + res.id + ']~AT~Server Availability~App Server',
            distinct: true}, (resource) => {
              let latestData = resource[resource.length-1];
              if (latestData) {
                res['state'] = latestData['value'];
                res['updateTimestamp'] = latestData['timestamp'];
              }
          }).$promise);
          promises.push(this.HawkularInventory.ResourceUnderFeed.getData({
            environmentId: globalEnvironmentId,
            feedId: feedId,
            resourcePath: res.id}, (resource) => {
              res['resourceConfiguration'] = resource;
          }).$promise);
          this.lastUpdateTimestamp = new Date();
        }, this);
        this.$q.all(promises).then((result) => {
          // FIXME this needs to be revisited, this won't work for removed resources
          this.resourceList = _.uniq(_.union(this.resourceList, aResourceList), 'path');
          this.filteredResourceList = this.resourceList;
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

    public getResourceList(currentTenantId?: TenantId):any {
      // for each feed get all WF resources
      let tenantId:TenantId = currentTenantId || this.$rootScope.currentPersona.id;
      this.HawkularInventory.Feed.query({environmentId:globalEnvironmentId},
        (aFeedList) => {
          angular.forEach(aFeedList, (feed) => {
            this.getResourceListForOneFeed(feed.id, tenantId);
          });
          if (!aFeedList.length) {
            // there are no feeds, no app servers
            this.resourceList = [];
            this.resourceList.$resolved = true;
            this['lastUpdateTimestamp'] = new Date();
          }
        });
    }

  }

  _module.controller('AppServerListController', AppServerListController);

}
