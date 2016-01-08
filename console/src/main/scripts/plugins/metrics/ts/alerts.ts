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

  export class AlertSetupController {

    public static  $inject = ['$scope', 'HawkularAlertsManager', 'ErrorsManager', 'NotificationsService',
      '$log', '$q', '$rootScope', '$routeParams', '$modalInstance', 'resourceId'];

    public triggerDefinition:any = {};

    public adm:any = {};
    public admBak:any = {};
    public saveProgress:boolean = false;
    public isSettingChange:boolean = false;

    constructor(protected $scope:any,
                protected HawkularAlertsManager:HawkularMetrics.IHawkularAlertsManager,
                protected ErrorsManager:HawkularMetrics.IErrorsManager,
                protected NotificationsService:INotificationsService,
                protected $log:ng.ILogService,
                protected $q:ng.IQService,
                protected $rootScope:any,
                protected $routeParams:any,
                protected $modalInstance:any,
                protected resourceId) {
      // TODO - update the pfly notification service to support more and category based notifications containers.
      this.$rootScope.hkNotifications = {alerts: []};

      let triggersPromises = this.loadTriggers();

      this.$q.all(triggersPromises).then(() => {
        this.admBak = angular.copy(this.adm);
        this.isSettingChange = false;
      });

      this.$scope.$watch(angular.bind(this, () => {
        return this.adm;
      }), () => {
        this.isSettingChange = !angular.equals(this.adm, this.admBak);
      }, true);
    }

    public save():void {
      this.$log.debug('Saving Alert Settings');

      // Clear alerts notifications on save (discard previous success/error list)
      this.$rootScope.hkNotifications.alerts = [];

      // Error notification done with callback function on error
      let errorCallback = (error:any, msg:string) => {
        this.$rootScope.hkNotifications.alerts.push({
          type: 'error',
          message: msg
        });
      };

      this.saveProgress = true;
      let isError = false;
      // Check if email action exists

      let saveTriggersPromises = this.saveTriggers(errorCallback);

      this.$q.all(saveTriggersPromises).finally(()=> {
        this.saveProgress = false;

        if (!isError) {
          // notify success
          this.NotificationsService.alertSettingsSaved();
          this.$rootScope.hkNotifications.alerts.push({
            type: 'success',
            message: 'Changes saved successfully.'
          });
        }

        this.cancel();
      });
    }

    public cancel():void {
      this.$modalInstance.dismiss('cancel');
    }

    loadTriggers():Array<ng.IPromise<any>> {
      throw new Error('This method is abstract');
    }

    saveTriggers(errorCallback):Array<ng.IPromise<any>> {
      throw new Error('This method is abstract');
    }
  }

  export class TriggerSetupController {

    public static  $inject = ['$scope', 'HawkularAlertsManager', 'ErrorsManager', 'NotificationsService',
      '$log', '$q', '$rootScope', '$routeParams', '$location', 'MetricsService'];

    public fullTrigger:any = {};

    public adm:any = {};
    public admBak:any = {};
    public saveProgress:boolean = false;
    public isSettingChange:boolean = false;

    public alertList:any = [];

    constructor(protected $scope:any,
                protected HawkularAlertsManager:HawkularMetrics.IHawkularAlertsManager,
                protected ErrorsManager:HawkularMetrics.IErrorsManager,
                protected NotificationsService:INotificationsService,
                protected $log:ng.ILogService,
                protected $q:ng.IQService,
                protected $rootScope:any,
                protected $routeParams:any,
                protected $location:any,
                protected MetricsService:IMetricsService) {
      // TODO - update the pfly notification service to support more and category based notifications containers.
      this.$rootScope.hkNotifications = {alerts: []};

      let triggerId = this.decodeResourceId(this.$routeParams.triggerId);
      let triggerPromise = this.loadTrigger(triggerId);

      this.$q.all(triggerPromise).then(() => {
        this.admBak = angular.copy(this.adm);
        this.isSettingChange = false;

        this.getAlerts(triggerId);
      });

      this.$scope.$watch(angular.bind(this, () => {
        return this.adm;
      }), () => {
        this.isSettingChange = !angular.equals(this.adm, this.admBak);
      }, true);

      $scope.$on('SwitchedPersona', () => $location.path('/hawkular-ui/alerts-center-triggers/'));
    }

    public cancel():string {
      if (this.$rootScope.prevLocation) {
        return this.$rootScope.prevLocation;
      }

      return '/hawkular-ui/alerts-center-triggers';
    }

    public save():void {
      this.$log.debug('Saving Settings');

      // Clear alerts notifications on save (discard previous success/error list)
      this.$rootScope.hkNotifications.alerts = [];

      // Error notification done with callback function on error
      let errorCallback = (error:any, msg:string) => {
        this.$rootScope.hkNotifications.alerts.push({
          type: 'error',
          message: msg
        });
      };

      this.saveProgress = true;
      let isError = false;
      // Check if email action exists

      let saveTriggerPromise = this.saveTrigger(errorCallback);

      this.$q.all(saveTriggerPromise).finally(()=> {
        this.saveProgress = false;

        if (!isError) {
          // notify success
          this.NotificationsService.alertSettingsSaved();
          this.$rootScope.hkNotifications.alerts.push({
            type: 'success',
            message: 'Changes saved successfully.'
          });
        }

      });
    }

    public getAlerts(triggerId:string):void {
      this.HawkularAlertsManager.queryAlerts({
        statuses: 'OPEN,ACKNOWLEDGED', triggerIds: triggerId,
        currentPage: 0, perPage: 10, thin: true
      })  // just the top 10
        .then((queriedAlerts)=> {
          this.alertList = queriedAlerts.alertList;
        }, (error) => {
          return this.ErrorsManager.errorHandler(error, 'Error fetching alerts for trigger:' + triggerId);
        });
    }

    public getAlertRoute(alertId:AlertId):string {
      let route = 'unknown-trigger-type';
      let encodedId = this.encodeResourceId(alertId);
      route = '/hawkular-ui/alerts-center-detail/' + encodedId;

      return route;
    }

    loadTrigger(triggerId:string):Array<ng.IPromise<any>> {
      throw new Error('This method is abstract');
    }

    saveTrigger(errorCallback):Array<ng.IPromise<any>> {
      throw new Error('This method is abstract');
    }

    protected encodeResourceId(resourceId:string):string {
      // for some reason using standard encoding is not working correctly in the route. So do something dopey...
      //let encoded = encodeURIComponent(resourceId);
      let encoded = resourceId;
      while (encoded.indexOf('/') > -1) {
        encoded = encoded.replace('/', '$');
      }
      return encoded;
    }

    protected decodeResourceId(encodedResourceId:string):string {
      // for some reason using standard encoding is not working correctly in the route. So do something dopey...
      //let decoded = decodeURIComponent(encodedResourceId);
      let decoded = encodedResourceId;
      while (decoded.indexOf('$') > -1) {
        decoded = decoded.replace('$', '/');
      }
      return decoded;
    }

    // 0 indicates we should use default dampening (alert every time), anything above 0 is time-based dampening
    protected getEvalTimeSetting(evalTimeSetting:any):number {
      if ((undefined === evalTimeSetting ) || (null === evalTimeSetting) || (0 > evalTimeSetting)) {
        return 0;
      }
      return evalTimeSetting;
    }
  }

  export class MetricsAlertController {
    public static  $inject = ['$scope', 'HawkularAlertsManager', 'ErrorsManager', 'NotificationsService', '$log', '$q',
      '$rootScope', '$routeParams', '$modal', '$interval', '$location', 'HkHeaderParser'];

    public alertList:any = [];
    public openSetup:any;
    public isResolvingAll:boolean = false;

    public alertsTimeStart:TimestampInMillis;
    public alertsTimeEnd:TimestampInMillis;
    public alertsTimeOffset:TimestampInMillis;

    public resCurPage:number = 0;
    public resPerPage:number = 5;
    public headerLinks:any;

    constructor(private $scope:any,
                private HawkularAlertsManager:HawkularMetrics.IHawkularAlertsManager,
                private ErrorsManager:HawkularMetrics.IErrorsManager,
                private NotificationsService:INotificationsService,
                private $log:ng.ILogService,
                private $q:ng.IQService,
                private $rootScope:IHawkularRootScope,
                private $routeParams:any,
                private $modal:any,
                private $interval:ng.IIntervalService,
                private $location:ng.ILocationService,
                private HkHeaderParser:any) {

      this.$log.debug('querying data');
      this.$log.debug('$routeParams', $routeParams);

      this.alertsTimeOffset = $routeParams.timeOffset || 3600000;
      // If the end time is not specified in URL use current time as end time
      this.alertsTimeEnd = $routeParams.endTime ? $routeParams.endTime : (new Date()).getTime();
      this.alertsTimeStart = this.alertsTimeEnd - this.alertsTimeOffset;
      this.getAlerts();
      $scope.$on('SwitchedPersona', () => $location.path('/hawkular-ui/url/url-list'));
      this.autoRefresh(20);
    }

    private autoRefresh(intervalInSeconds:number):void {
      let autoRefreshPromise = this.$interval(()  => {
        this.getAlerts();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(autoRefreshPromise);
      });
    }

    public getAlerts():void {
      this.alertsTimeEnd = this.$routeParams.endTime ? this.$routeParams.endTime : (new Date()).getTime();
      this.alertsTimeStart = this.alertsTimeEnd - this.alertsTimeOffset;

      let resourceId:string = this.$routeParams.resourceId;
      let triggerIds:string = resourceId + '_trigger_avail,' + resourceId + '_trigger_thres';

      this.HawkularAlertsManager.queryAlerts({
        statuses: 'OPEN', triggerIds: triggerIds, startTime: this.alertsTimeStart,
        endTime: this.alertsTimeEnd, currentPage: this.resCurPage, perPage: this.resPerPage
      }).then((queriedAlerts)=> {
        this.headerLinks = this.HkHeaderParser.parse(queriedAlerts.headers);
        _.forEach(queriedAlerts.alertList, (item) => {
          if (item['type'] === 'THRESHOLD') {
            item['alertType'] = 'PINGRESPONSE';
          } else if (item['type'] === 'AVAILABILITY') {
            item['alertType'] = 'PINGAVAIL';
          }
        });
        this.alertList = queriedAlerts.alertList;
        this.alertList.$resolved = true; // FIXME
      }, (error) => {
        return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.');
      });
    }

    public setPage(page:number):void {
      this.resCurPage = page;
      this.getAlerts();
    }

    public resolveAll():void {
      this.isResolvingAll = true;
      let alertIdList = '';
      for (let i = 0; i < this.alertList.length; i++) {
        alertIdList = alertIdList + this.alertList[i].id + ',';
      }
      alertIdList = alertIdList.slice(0, -1);

      let resolvedAlerts = {
        alertIds: alertIdList,
        resolvedBy: this.$rootScope.currentPersona.name,
        resolvedNotes: 'Manually resolved'
      };

      this.HawkularAlertsManager.resolveAlerts(resolvedAlerts).then(() => {
        this.alertList.length = 0;
        this.isResolvingAll = false;
      });
    }

  }

  _module.controller('MetricsAlertController', MetricsAlertController);

  export class AlertUrlAvailabilitySetupController extends AlertSetupController {

    loadTriggers():Array<ng.IPromise<any>> {
      let availabilityTriggerId = this.$routeParams.resourceId + '_trigger_avail';

      let availabilityTriggerPromise = this.HawkularAlertsManager.getTrigger(availabilityTriggerId)
        .then((triggerData) => {
          this.$log.debug('triggerData', triggerData);
          this.triggerDefinition['avail'] = triggerData;

          this.adm['avail'] = {};
          this.adm.avail['email'] = triggerData.trigger.actions.email[0];
          this.adm.avail['responseDuration'] = triggerData.dampenings[0].evalTimeSetting;
          this.adm.avail['conditionEnabled'] = triggerData.trigger.enabled;
        });

      return [availabilityTriggerPromise];
    }

    saveTriggers(errorCallback):Array<ng.IPromise<any>> {
      // Set the actual object to save
      let availabilityTrigger = angular.copy(this.triggerDefinition.avail);
      availabilityTrigger.trigger.actions.email[0] = this.adm.avail.email;
      availabilityTrigger.trigger.enabled = this.adm.avail.conditionEnabled;
      availabilityTrigger.dampenings[0].evalTimeSetting = this.adm.avail.responseDuration;
      availabilityTrigger.dampenings[1].evalTimeSetting = this.adm.avail.responseDuration;

      let availabilitySavePromise = this.HawkularAlertsManager.updateTrigger(availabilityTrigger,
        errorCallback, this.triggerDefinition.avail);

      return [availabilitySavePromise];
    }
  }

  _module.controller('AlertUrlAvailabilitySetupController', AlertUrlAvailabilitySetupController);

  export class AlertUrlResponseSetupController extends AlertSetupController {
    loadTriggers():Array<ng.IPromise<any>> {
      let responseTriggerId = this.$routeParams.resourceId + '_trigger_thres';

      let responseTriggerPromise = this.HawkularAlertsManager.getTrigger(responseTriggerId).then(
        (triggerData) => {
          this.$log.debug('triggerData', triggerData);
          this.triggerDefinition['thres'] = triggerData;

          this.adm['thres'] = {};
          this.adm.thres['email'] = triggerData.trigger.actions.email[0];
          this.adm.thres['responseDuration'] = triggerData.dampenings[0].evalTimeSetting;
          this.adm.thres['conditionEnabled'] = triggerData.trigger.enabled;
          this.adm.thres['conditionThreshold'] = triggerData.conditions[0].threshold;
        });

      return [responseTriggerPromise];
    }

    saveTriggers(errorCallback):Array<ng.IPromise<any>> {
      // Set the actual object to save
      let responseTrigger = angular.copy(this.triggerDefinition.thres);
      responseTrigger.trigger.enabled = this.adm.thres.conditionEnabled;

      if (this.adm.thres.conditionEnabled) {
        responseTrigger.trigger.actions.email[0] = this.adm.thres.email;
        responseTrigger.dampenings[0].evalTimeSetting = this.adm.thres.responseDuration;
        responseTrigger.dampenings[1].evalTimeSetting = this.adm.thres.responseDuration;
        responseTrigger.conditions[0].threshold = this.adm.thres.conditionThreshold;
        responseTrigger.conditions[1].threshold = this.adm.thres.conditionThreshold;
      }

      let responseSavePromise = this.HawkularAlertsManager.updateTrigger(responseTrigger,
        errorCallback, this.triggerDefinition.thres);

      return [responseSavePromise];
    }
  }

  _module.controller('AlertUrlResponseSetupController', AlertUrlResponseSetupController);

  // TODO - update the pfly notification service to support other methods of notification container dismissal.
  export interface IHkClearNotifications extends ng.IScope {
    hkClearNotifications: Array<any>;
  }

  export class HkClearNotifications {
    public link:(scope:IHkClearNotifications, element:ng.IAugmentedJQuery, attrs:ng.IAttributes) => void;
    public scope = {
      hkClearNotifications: '='
    };

    constructor() {
      this.link = (scope:IHkClearNotifications, element:ng.IAugmentedJQuery, attrs:ng.IAttributes) => {
        angular.element('html').on('click', () => {
          if (scope.hkClearNotifications &&
            scope.hkClearNotifications.length &&
            scope.hkClearNotifications.length > 0) {
            scope.$apply(()=> {
              scope.hkClearNotifications = [];
            });
          }
        });
      };
    }

    public static Factory() {
      let directive = () => {
        return new HkClearNotifications();
      };

      directive['$inject'] = [];

      return directive;
    }
  }

  _module.directive('hkClearNotifications', HkClearNotifications.Factory());
}

