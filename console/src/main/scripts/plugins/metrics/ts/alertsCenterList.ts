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

  export class AlertsCenterController {

    public isWorking = false;
    public alertsTimeStart: TimestampInMillis;
    public alertsTimeEnd: TimestampInMillis;
    public alertsTimeOffset: TimestampInMillis;
    public lastUpdateDate: Date = new Date();

    public alertsList: IAlert[];
    public selectedItems: IAlert[];
    public alertsPerPage = 10;
    public alertsCurPage = 0;
    public headerLinks: any = {};
    public selectCount = 0;
    public hasOpenSelectedItems: boolean = false;
    public hasResolvedAlerts: boolean = false;
    public alertsStatuses: string = 'OPEN,ACKNOWLEDGED';
    public sortField: string = 'ctime';
    public sortAsc: boolean = false;
    public search: string;

    constructor(private $scope: any,
      private HawkularAlertsManager: IHawkularAlertsManager,
      private ErrorsManager: IErrorsManager,
      private $log: ng.ILogService,
      private $q: ng.IQService,
      private $rootScope: IHawkularRootScope,
      private $interval: ng.IIntervalService,
      private $filter: ng.IFilterService,
      private $routeParams: any,
      private HkHeaderParser: any,
      private $location: ng.ILocationService) {
      $scope.ac = this;

      $routeParams.timeOffset = $routeParams.timeOffset || $scope.hkParams.timeOffset || 3600000 * 12;

      this.alertsTimeOffset = $routeParams.timeOffset;

      // If the end time is not specified in URL use current time as end time
      this.alertsTimeEnd = $routeParams.endTime ? $routeParams.endTime : Date.now();
      this.alertsTimeStart = this.alertsTimeEnd - this.alertsTimeOffset;

      this.autoRefresh(120);
      if ($rootScope.currentPersona) {
        this.getAlerts();
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) =>
          currentPersona && this.getAlerts());
      }

      $scope.$on('SwitchedPersona', () => this.getAlerts());

    }

    private autoRefresh(intervalInSeconds: number): void {
      let autoRefreshPromise = this.$interval(() => {
        this.$log.debug('autoRefresh .... ' + new Date());
        this.getAlerts();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(autoRefreshPromise);
      });
    }

    public getAlerts(): void {

      this.alertsTimeEnd = this.$routeParams.endTime ? this.$routeParams.endTime : Date.now();
      this.alertsTimeStart = this.alertsTimeEnd - this.alertsTimeOffset;

      let ordering = 'asc';
      if (!this.sortAsc) {
        ordering = 'desc';
      }

      this.HawkularAlertsManager.queryAlerts({
        statuses: this.alertsStatuses,
        startTime: this.alertsTimeStart,
        endTime: this.alertsTimeEnd,
        thin: true,
        currentPage: this.alertsCurPage,
        perPage: this.alertsPerPage,
        sort: this.sortField,
        order: ordering
      })
        .then((queriedAlerts) => {
          this.headerLinks = this.HkHeaderParser.parse(queriedAlerts.headers);
          this.alertsList = queriedAlerts.alertList;
          this.lastUpdateDate = new Date();
        }, (error) => {
          this.$log.warn(error);
        }).catch((error) => {
          this.$log.error('Error:' + error);
        }).finally(() => {
          this.lastUpdateDate = new Date();
        });
    }

    public showDetailPage(alertId: AlertId): void {
      //let timeOffset = this.alertsTimeOffset;
      //let endTime = this.alertsTimeEnd;
      //this.$location.url(`/hawkular-ui/alerts-center-detail/${alertId}/${timeOffset}/${endTime}`);
      this.$location.url(`/hawkular-ui/alerts-center-detail/${alertId}`);
    }

    public resolveSelected(): void {
      this.$log.log('ResolveSelected: ' + this.selectCount);
      this.isWorking = true;
      let resolveIdList = '';
      this.alertsList.forEach((alertItem: IAlert) => {
        if (alertItem.selected) {
          resolveIdList = resolveIdList + alertItem.id + ',';
        }
      });
      resolveIdList = resolveIdList.slice(0, -1);

      if (resolveIdList.length > 0) {
        let resolvedAlerts = {
          alertIds: resolveIdList,
          resolvedBy: this.$rootScope.currentPersona.name,
          resolvedNotes: 'Manually resolved'
        };

        this.HawkularAlertsManager.resolveAlerts(resolvedAlerts).then(() => {
          this.isWorking = false;
          this.resetAllUnselected();
          this.getAlerts();
        });
      }
    }

    public getResourceRoute(trigger: IAlertTrigger): string {
      let route = 'unknown-resource-type';

      switch (trigger.context.resourceType) {
        case 'App Server':
          route = '/hawkular-ui/app/app-details/' + trigger.context.resourceName + '/jvm';
          break;
        case 'App Server Deployment':
          route = '/hawkular-ui/app/app-details/' + trigger.context.resourceName + '/deployments';
          break;
        case 'DataSource':
          let resIdPart = trigger.context.resourceName.split('~/')[0];
          route = '/hawkular-ui/app/app-details/' + resIdPart + '/datasources';
          break;
        case 'URL':
          let parts = trigger.id.split('_trigger_');
          //let resourceId = parts[0];
          let segment = (parts[1] === 'thres') ? 'response-time' : 'availability';
          route = '/hawkular-ui/url/' + segment + '/' + trigger.id.split('_trigger_')[0];
          break;
      }

      return route;
    }

    //private encodeResourceId(resourceId: string): string {
    //  // for some reason using standard encoding is not working correctly in the route. So do something dopey...
    //  //let encoded = encodeURIComponent(resourceId);
    //  let encoded = resourceId;
    //  while (encoded.indexOf('/') > -1) {
    //    encoded = encoded.replace('/', '$');
    //  }
    //  return encoded;
    //}

    public ackSelected() {
      this.$log.log('Ack Selected: ' + this.selectCount);
      this.isWorking = true;
      let ackIdList = '';
      this.alertsList.forEach((alertItem: IAlert) => {
        if (alertItem.selected && (alertItem.status !== 'ACKNOWLEDGED' || alertItem.status !== 'RESOLVED')) {
          ackIdList = ackIdList + alertItem.id + ',';
        }
      });
      ackIdList = ackIdList.slice(0, -1);

      if (ackIdList.length > 0) {
        let ackAlerts = {
          alertIds: ackIdList,
          ackBy: this.$rootScope.currentPersona.name,
          ackNotes: 'Manually acknowledged'
        };

        this.HawkularAlertsManager.ackAlerts(ackAlerts).then(() => {
          this.isWorking = false;
          this.resetAllUnselected();
          this.getAlerts();
        });
      }
    }

    public setPage(page: number): void {
      this.alertsCurPage = page;
      this.getAlerts();
    }

    public selectItem(item: IAlert): void {
      item.selected = !item.selected;
      this.selectedItems = _.filter(this.alertsList, 'selected');
      this.selectCount = this.selectedItems.length;
      this.hasOpenSelectedItems = _.some(this.selectedItems, { 'status': 'OPEN' });
    }

    public hasResolvedItems(): boolean {
      return _.some(this.selectedItems, { 'status': 'RESOLVED' });
    }

    private resetAllUnselected() {
      this.selectCount = 0;
      this.hasOpenSelectedItems = false;
      this.alertsList.forEach((item: IAlert) => {
        item.selected = false;
      });

    }

    public selectAll(): void {
      let filteredList = this.$filter('filter')(this.alertsList, this.search);
      let toggleTo = this.selectCount !== filteredList.length;
      _.forEach(filteredList, (item: any) => {
        item.selected = toggleTo;
      });
      this.selectCount = toggleTo ? filteredList.length : 0;
    }

    public changeResolvedFilter(): void {
      if (this.hasResolvedAlerts) {
        this.alertsStatuses = 'OPEN,ACKNOWLEDGED,RESOLVED';
      } else {
        this.alertsStatuses = 'OPEN,ACKNOWLEDGED';
      }
      this.getAlerts();
    }

    public sortBy(field: string): void {
      this.sortField = field;
      this.sortAsc = !this.sortAsc;
      this.getAlerts();
      this.$log.debug('Sorting by ' + field + ' ascending ' + this.sortAsc + ' ' + new Date());
    }

  }

  _module.controller('AlertsCenterController', AlertsCenterController);
}
