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
/// <reference path="../../includes.ts"/>
/// <reference path="services/alertsManager.ts"/>
/// <reference path="services/errorsManager.ts"/>

module HawkularMetrics {

  export class AlertSetupController {

    public static  $inject = ['$scope', 'HawkularAlertsManager', 'ErrorsManager', '$log', '$q',
      '$rootScope', '$routeParams', '$modalInstance'];

    public triggerDefinition:any = {};

    public adm:any = {};
    public admBak:any = {};
    public saveProgress:boolean = false;
    public isSettingChange:boolean = false;

    constructor(public $scope:any,
                public HawkularAlertsManager:HawkularMetrics.IHawkularAlertsManager,
                public ErrorsManager:HawkularMetrics.IErrorsManager,
                public $log:ng.ILogService,
                public $q:ng.IQService,
                public $rootScope:any,
                public $routeParams:any,
                public $modalInstance:any) {
      // TODO - update the pfly notification service to support more and category based notifications containers.
      this.$rootScope.hkNotifications = {alerts: []};

      var definitionPromises = this.loadDefinitions();

      this.$q.all(definitionPromises).then(() => {
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
      var errorCallback = (error:any, msg:string) => {
        this.$rootScope.hkNotifications.alerts.push({
          type: 'error',
          message: msg
        });
      };

      this.saveProgress = true;
      var isError = false;
      // Check if email action exists

      var saveDefinitionPromises = this.saveDefinitions(errorCallback);

      this.$q.all(saveDefinitionPromises).finally(()=> {
        this.saveProgress = false;

        if (!isError) {
          // notify success
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

    loadDefinitions():Array<ng.IPromise<any>> {
      throw new Error('This method is abstract');
    }

    saveDefinitions(errorCallback):Array<ng.IPromise<any>> {
      throw new Error('This method is abstract');
    }
  }


  export class MetricsAlertController {
    public static  $inject = ['$scope', 'HawkularAlert', 'HawkularAlertsManager', 'ErrorsManager', '$log', '$q',
      '$rootScope', '$routeParams', '$modal', '$interval', 'HkHeaderParser'];

    private metricId: string; /// @todo: use MetricId
    public alertList: any  = [];
    public openSetup: any;
    public isResolvingAll: boolean = false;

    public alertsTimeStart: TimestampInMillis;
    public alertsTimeEnd: TimestampInMillis;
    public alertsTimeOffset: TimestampInMillis;

    public resCurPage: number = 0;
    public resPerPage: number = 5;
    public headerLinks: any;

    constructor(private $scope:any,
                private HawkularAlert:any,
                private HawkularAlertsManager: HawkularMetrics.IHawkularAlertsManager,
                private ErrorsManager: HawkularMetrics.IErrorsManager,
                private $log: ng.ILogService,
                private $q: ng.IQService,
                private $rootScope: IHawkularRootScope,
                private $routeParams: any,
                private $modal: any,
                private $interval: ng.IIntervalService,
                private HkHeaderParser: any) {

      this.$log.debug('querying data');
      this.$log.debug('$routeParams', $routeParams);

      this.metricId = $routeParams.resourceId;

      this.alertsTimeOffset = $routeParams.timeOffset || 3600000;
      // If the end time is not specified in URL use current time as end time
      this.alertsTimeEnd = $routeParams.endTime ? $routeParams.endTime : (new Date()).getTime();
      this.alertsTimeStart = this.alertsTimeEnd - this.alertsTimeOffset;
      this.getAlerts();
      this.autoRefresh(20);
    }

    public openResponseSetup() {
      var modalInstance = this.$modal.open({
        templateUrl: 'plugins/metrics/html/modals/alerts-url-response-setup.html',
        controller: 'AlertUrlResponseSetupController as mas'
      });

      var logger = this.$log;

      modalInstance.result.then(function (selectedItem) {
        this.selected = selectedItem;
      }, function () {
        logger.info('Modal dismissed at: ' + new Date());
      });
    }

    private autoRefresh(intervalInSeconds:number):void {
      var autoRefreshPromise = this.$interval(()  => {
        this.getAlerts();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(autoRefreshPromise);
      });
    }

    public getAlerts():void {
      this.alertsTimeEnd = this.$routeParams.endTime ? this.$routeParams.endTime : (new Date()).getTime();
      this.alertsTimeStart = this.alertsTimeEnd - this.alertsTimeOffset;

      this.HawkularAlertsManager.queryConsoleAlerts(this.metricId, this.alertsTimeStart, this.alertsTimeEnd, undefined,
        this.resCurPage, this.resPerPage).then((queriedAlerts)=> {
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
        }, (error) => { return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.'); });
    }

    public setPage(page:number):void {
      this.resCurPage = page;
      this.getAlerts();
    }


    public resolveAll(): void {
      this.isResolvingAll = true;
      var alertIdList = '';
      for (var i = 0; i < this.alertList.length; i++) {
        alertIdList = alertIdList + this.alertList[i].id + ',';
      }
      alertIdList = alertIdList.slice(0, - 1);

      this.HawkularAlert.Alert.resolve({alertIds: alertIdList}, {}).$promise.then( () => {
        this.alertList.length = 0;
        this.isResolvingAll = false;
      });
    }

  }

  _module.controller('MetricsAlertController', MetricsAlertController);

  export class AlertUrlAvailabilitySetupController extends AlertSetupController {

    loadDefinitions():Array<ng.IPromise<any>> {
      var availabilityTriggerId = this.$routeParams.resourceId + '_trigger_avail';

      var availabilityDefinitionPromise = this.HawkularAlertsManager.getAlertDefinition(availabilityTriggerId)
        .then((alertDefinitionData) => {
          this.$log.debug('alertDefinitionData', alertDefinitionData);
          this.triggerDefinition['avail'] = alertDefinitionData;

          this.adm['avail'] = {};
          this.adm.avail['email'] = alertDefinitionData.trigger.actions.email[0];
          this.adm.avail['responseDuration'] = alertDefinitionData.dampenings[0].evalTimeSetting;
          this.adm.avail['conditionEnabled'] = alertDefinitionData.trigger.enabled;
        });

      return [availabilityDefinitionPromise];
    }

    saveDefinitions(errorCallback):Array<ng.IPromise<any>> {
      // Set the actual object to save
      var availabilityAlertDefinition = angular.copy(this.triggerDefinition.avail);
      availabilityAlertDefinition.trigger.actions.email[0] = this.adm.avail.email;
      availabilityAlertDefinition.trigger.enabled = this.adm.avail.conditionEnabled;
      availabilityAlertDefinition.dampenings[0].evalTimeSetting = this.adm.avail.responseDuration;
      availabilityAlertDefinition.dampenings[1].evalTimeSetting = this.adm.avail.responseDuration;

      var availabilitySavePromise = this.HawkularAlertsManager.saveAlertDefinition(availabilityAlertDefinition,
        errorCallback, this.triggerDefinition.avail);

      return [availabilityConditionDelete, availabilitySavePromise];
    }
  }

  _module.controller('AlertUrlAvailabilitySetupController', AlertUrlAvailabilitySetupController);

  export class AlertUrlResponseSetupController extends AlertSetupController {
    loadDefinitions():Array<ng.IPromise<any>> {
      var responseTriggerId = this.$routeParams.resourceId + '_trigger_thres';

      var responseDefinitionPromise = this.HawkularAlertsManager.getAlertDefinition(responseTriggerId).then(
        (alertDefinitionData) => {
          this.$log.debug('alertDefinitionData', alertDefinitionData);
          this.triggerDefinition['thres'] = alertDefinitionData;

          this.adm['thres'] = {};
          this.adm.thres['email'] = alertDefinitionData.trigger.actions.email[0];
          this.adm.thres['responseDuration'] = alertDefinitionData.dampenings[0].evalTimeSetting;
          this.adm.thres['conditionEnabled'] = !!(alertDefinitionData.conditions && alertDefinitionData.conditions[0]);

          if (this.adm.thres.conditionEnabled) {
            this.adm.thres['conditionThreshold'] = alertDefinitionData.conditions[0].threshold;
          } else {
            this.adm.thres['conditionThreshold'] = 0;
          }
        });

      return [responseDefinitionPromise];
    }

    saveDefinitions(errorCallback):Array<ng.IPromise<any>> {
      // Set the actual object to save
      var responseAlertDefinition = angular.copy(this.triggerDefinition.thres);
      responseAlertDefinition.trigger.actions.email[0] = this.adm.thres.email;
      responseAlertDefinition.dampenings[0].evalTimeSetting = this.adm.thres.responseDuration;
      responseAlertDefinition.dampenings[1].evalTimeSetting = this.adm.thres.responseDuration;

      // Conditions
      var responseCondition1Defer = this.$q.defer();
      var responseCondition2Defer = this.$q.defer();
      var responseConditionPromise1:any = responseCondition1Defer.promise;
      var responseConditionPromise2:any = responseCondition2Defer.promise;

      // If the condition was newly created
      var triggerId:string = responseAlertDefinition.trigger.id;
      var dataId:string = triggerId.slice(0, -14) + '.status.duration';

      if (!this.admBak.thres.conditionEnabled && this.adm.thres.conditionEnabled) {
        responseConditionPromise1 = this.HawkularAlertsManager.createCondition(triggerId, {
          type: 'THRESHOLD',
          triggerId: triggerId,
          threshold: this.adm.thres.conditionThreshold,
          dataId: dataId,
          operator: 'GT'
        });

        responseConditionPromise2 = this.HawkularAlertsManager.createCondition(triggerId, {
          type: 'THRESHOLD',
          triggerId: triggerId,
          triggerMode: 'AUTORESOLVE',
          threshold: this.adm.thres.conditionThreshold,
          dataId: dataId,
          operator: 'LT'
        });
      }
      // If the condition was deleted
      else if (this.admBak.thres.conditionEnabled && !this.adm.thres.conditionEnabled) {
        responseConditionPromise1 = this.HawkularAlertsManager.deleteCondition(responseAlertDefinition.trigger.id,
          responseAlertDefinition.conditions[0].conditionId);
        responseConditionPromise2 = this.HawkularAlertsManager.deleteCondition(responseAlertDefinition.trigger.id,
          responseAlertDefinition.conditions[1].conditionId);
        delete responseAlertDefinition.conditions;
      }
      // If the condition stays deleted
      else if (!this.admBak.thres.conditionEnabled && !this.admBak.thres.conditionEnabled) {
        var idleMsg = 'Not deleted nor created';
        responseCondition1Defer.resolve(idleMsg);
        responseCondition2Defer.resolve(idleMsg);
      }
      // If the condition was just updated
      else {
        responseAlertDefinition.conditions[0].threshold = this.adm.thres.conditionThreshold;
        responseAlertDefinition.conditions[1].threshold = this.adm.thres.conditionThreshold;
      }

      var responseSavePromise = this.HawkularAlertsManager.saveAlertDefinition(responseAlertDefinition,
        errorCallback, this.triggerDefinition.thres);

      return [responseConditionPromise1, responseConditionPromise2, responseSavePromise];
    }
  }

  _module.controller('AlertUrlResponseSetupController', AlertUrlResponseSetupController);

  // TODO - update the pfly notification service to support other methods of notification container dismissal.
  export interface IHkClearNotifications extends ng.IScope {
    hkClearNotifications: Array<any>;
  }

  export class HkClearNotifications {
    public link: (scope: IHkClearNotifications, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => void;
    public scope = {
      hkClearNotifications: '='
    };

    constructor() {
      this.link = (scope: IHkClearNotifications, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => {
        angular.element('html').on('click', () => {
          if (scope.hkClearNotifications &&
              scope.hkClearNotifications.length &&
              scope.hkClearNotifications.length > 0 ) {
            scope.$apply(()=> {
              scope.hkClearNotifications = [];
            });
          }
        });
      };
    }

    public static Factory() {
      var directive = () => {
        return new HkClearNotifications();
      };

      directive['$inject'] = [];

      return directive;
    }
  }

  _module.directive('hkClearNotifications', HkClearNotifications.Factory());
}

