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

/// <reference path="metricsPlugin.ts"/>
/// <reference path="../../includes.ts"/>
/// <reference path="services/alertsManager.ts"/>
/// <reference path="services/errorsManager.ts"/>

module HawkularMetrics {

  export class AlertsCenterTriggerController {

    public static  $inject = ['$scope', 'HawkularAlertsManager',
      'ErrorsManager', '$log', '$q', '$rootScope', '$interval', '$filter', '$routeParams',
      'HkHeaderParser', '$location', '$modal'];

    public isWorking = false;
    public lastUpdateDate:Date = new Date();

    public triggersList:IAlertTrigger[];
    public selectedItems:IAlertTrigger[];
    public triggersPerPage = 10;
    public triggersCurPage = 0;
    public headerLinks:any = {};
    public selectCount = 0;
    public hasEnabledSelectedItems:boolean = false;
    public hasDisabledSelectedItems:boolean = false;
    public sortField:string = 'name';
    public sortAsc:boolean = true;
    public search: string;

    constructor(private $scope:any,
                private HawkularAlertsManager:IHawkularAlertsManager,
                private ErrorsManager:IErrorsManager,
                private $log:ng.ILogService,
                private $q:ng.IQService,
                private $rootScope:IHawkularRootScope,
                private $interval:ng.IIntervalService,
                private $filter:ng.IFilterService,
                private $routeParams:any,
                private HkHeaderParser:any,
                private $location:ng.ILocationService,
                private $modal:any) {
      $scope.ac = this;

      // store this route so we can come back to it when canceling out of trigger detail
      this.$rootScope.prevLocation = $location.url();

      this.autoRefresh(120);

      if ($rootScope.currentPersona) {
        this.getTriggers();
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) =>
        currentPersona && this.getTriggers());
      }

      $scope.$on('SwitchedPersona', () => this.getTriggers());
    }

    private autoRefresh(intervalInSeconds:number):void {
      let autoRefreshPromise = this.$interval(()  => {
        this.$log.debug('autoRefresh .... ' + new Date());
        this.getTriggers();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(autoRefreshPromise);
      });
    }

    public getTriggers():void {

      let ordering = 'asc';
      if (!this.sortAsc) {
        ordering = 'desc';
      }

      let resourceId:string = this.$routeParams.resourceId ?  this.decodeResourceId(this.$routeParams.resourceId) : '';
      let tagValue = resourceId ?resourceId : '*';
      this.HawkularAlertsManager.queryTriggers({
        tags: 'resourceId|' + tagValue,
        currentPage: this.triggersCurPage,
        perPage: this.triggersPerPage,
        sort: this.sortField,
        order: ordering
      })
        .then((queriedTriggers) => {
          this.headerLinks = this.HkHeaderParser.parse(queriedTriggers.headers);
          this.triggersList = queriedTriggers.triggerList;
          this.lastUpdateDate = new Date();
          console.dir(this.headerLinks);
        }, (error) => {
          this.$log.warn(error);
        }).catch((error) => {
          this.$log.error('Error:' + error);
        }).finally(() => {
          this.lastUpdateDate = new Date();
        });
    }

    public enableSelected():void {
      this.$log.debug('Enable Selected Triggers');

      // Error notification done with callback function on error
      let errorCallback = (error:any, msg:string) => {
        this.$log.error('Error:' + error);
      };

      this.isWorking = true;
      let isError = false;
      // Check if email action exists

      let updateTriggersPromises = this.updateSelected(true, errorCallback);

      this.$q.all(updateTriggersPromises).finally(()=> {
        this.isWorking = false;
        this.resetAllUnselected();
        this.getTriggers();

        if (!isError) {
          // notify success ?
        }
      });
    }

    public disableSelected():void {
      this.$log.debug('Disable Selected Triggers');

      // Error notification done with callback function on error
      let errorCallback = (error:any, msg:string) => {
        this.$log.error('Error:' + error);
      };

      this.isWorking = true;
      let isError = false;
      // Check if email action exists

      let updateTriggersPromises = this.updateSelected(false, errorCallback);

      this.$q.all(updateTriggersPromises).finally(()=> {
        this.isWorking = false;
        this.resetAllUnselected();
        this.getTriggers();

        if (!isError) {
          // notify success ?
        }
      });
    }

    updateSelected(enabled, errorCallback):Array<ng.IPromise<any>> {

      let promises = [];

      this.triggersList.forEach((triggerItem:IAlertTrigger) => {
        if (triggerItem.selected && (triggerItem.enabled !== enabled)) {
          let triggerDefinition = {};
          let triggerBackup = {};
          triggerDefinition['trigger'] = angular.copy(triggerItem);
          delete triggerDefinition['trigger'].selected;
          triggerBackup['trigger'] = angular.copy(triggerDefinition['trigger']);
          triggerDefinition['trigger'].enabled = enabled;
          promises.push(this.HawkularAlertsManager.updateTrigger(triggerDefinition, errorCallback, triggerBackup));
        }
      });

      return promises;
    }

    public getDetailRoute(trigger:IAlertTrigger):string {
      let route = 'unknown-trigger-type';
      let encodedId = this.encodeResourceId(trigger.id);

      switch (trigger.context.triggerType) {
        case 'Availability' :
          route = '/hawkular-ui/alerts-center-triggers-availability/' + encodedId;
          break;
        case 'Event' :
          route = '/hawkular-ui/alerts-center-triggers-event/' + encodedId;
          break;
        case 'Range' :
          route = '/hawkular-ui/alerts-center-triggers-range/' + encodedId;
          break;
        case 'RangeByPercent' :
          route = '/hawkular-ui/alerts-center-triggers-range-percent/' + encodedId;
          break;
        case 'Threshold' :
          route = '/hawkular-ui/alerts-center-triggers-threshold/' + encodedId;
          break;
      }

      return route;
    }

    public getResourceRoute(trigger:IAlertTrigger):string {
      let route = 'unknown-resource-type';
      let encodedId = this.encodeResourceId(trigger.id);

      switch (trigger.context.resourceType) {
        case 'App Server' :
          route = '/hawkular-ui/app/app-details/' + trigger.context.resourceName + '/jvm';
          break;
        case 'App Server Deployment' :
          route = '/hawkular-ui/app/app-details/' + trigger.context.resourceName + '/deployments';
          break;
        case 'DataSource' :
          let resIdPart = trigger.context.resourceName.split('~/')[0];
          route = '/hawkular-ui/app/app-details/' + resIdPart + '/datasources';
          break;
        case 'URL' :
          let parts = trigger.id.split('_trigger_');
          let resourceId = parts[0];
          let segment = ( parts[1] === 'thres' ) ? 'response-time' : 'availability';
          route = '/hawkular-ui/url/' + segment + '/' + trigger.id.split('_trigger_')[0];
          break;
      }

      return route;
    }

    public setPage(page:number):void {
      this.triggersCurPage = page;
      this.getTriggers();
    }

    public selectItem(item:IAlertTrigger):void {
      item.selected = !item.selected;
      this.selectedItems = _.filter(this.triggersList, 'selected');
      this.selectCount = this.selectedItems.length;
      this.hasEnabledSelectedItems = _.some(this.selectedItems, {'enabled': true});
      this.hasDisabledSelectedItems = _.some(this.selectedItems, {'enabled': false});
    }

    private resetAllUnselected() {
      this.selectCount = 0;
      this.hasEnabledSelectedItems = false;
      this.hasDisabledSelectedItems = false;
      this.triggersList.forEach((item:IAlertTrigger) => {
        item.selected = false;
      });
    }

    public selectAll():void {
      let filteredList = this.$filter('filter')(this.triggersList, this.search);
      let toggleTo = this.selectCount !== filteredList.length;
      _.forEach(filteredList, (item:any) => {
        item.selected = toggleTo;
      });
      this.selectCount = toggleTo ? filteredList.length : 0;
    }

    public sortBy(field:string):void {
      this.sortField = field;
      this.sortAsc = !this.sortAsc;
      this.getTriggers();
      this.$log.debug('Sorting by ' + field + ' ascending ' + this.sortAsc + ' ' + new Date());
    }

    private encodeResourceId(resourceId:string):string {
      // for some reason using standard encoding is not working correctly in the route. So do something dopey...
      //let encoded = encodeURIComponent(resourceId);
      let encoded = resourceId;
      while (encoded.indexOf('/') > -1) {
        encoded = encoded.replace('/', '$');
      }
      return encoded;
    }

    private decodeResourceId(encodedResourceId:string):string {
      // for some reason using standard encoding is not working correctly in the route. So do something dopey...
      //let decoded = decodeURIComponent(encodedResourceId);
      let decoded = encodedResourceId;
      while (decoded.indexOf('$') > -1) {
        decoded = decoded.replace('$', '/');
      }
      return decoded;
    }

  }

  _module.controller('AlertsCenterTriggerController', AlertsCenterTriggerController);
}

