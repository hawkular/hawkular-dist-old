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
/// <reference path="../../includes.ts"/>
/// <reference path="../services/alertsManager.ts"/>
/// <reference path="../services/errorsManager.ts"/>

module HawkularMetrics {

  export class WebAlertController {
    public static  $inject = ['$scope', 'HawkularAlertsManager', 'ErrorsManager', 'NotificationsService',
      '$log', '$q', '$rootScope', '$routeParams', '$modal', '$interval', 'HkHeaderParser'];

    private resourceId:string;
    public alertList:any = [];
    public defaultEmail:string;

    public isResolvingAll:boolean = false;

    public alertsTimeStart:TimestampInMillis;
    public alertsTimeEnd:TimestampInMillis;
    public alertsTimeOffset:TimestampInMillis;

    public resCurPage:number = 0;
    public resPerPage:number = 5;
    public headerLinks:any;

    constructor(private $scope:any,
                private HawkularAlertsManager:IHawkularAlertsManager,
                private ErrorsManager:IErrorsManager,
                private NotificationsService:INotificationsService,
                private $log:ng.ILogService,
                private $q:ng.IQService,
                private $rootScope:IHawkularRootScope,
                private $routeParams:any,
                private $modal:any,
                private $interval:ng.IIntervalService,
                private HkHeaderParser:any) {

      this.resourceId = $routeParams.resourceId;
      this.alertsTimeOffset = $routeParams.timeOffset || 3600000;
      // If the end time is not specified in URL use current time as end time
      this.alertsTimeEnd = $routeParams.endTime ? $routeParams.endTime : (new Date()).getTime();
      this.alertsTimeStart = this.alertsTimeEnd - this.alertsTimeOffset;

      this.defaultEmail = this.$rootScope.userDetails.email || 'myemail@company.com';

      this.getAlerts();
      this.autoRefresh(20);
    }

    public openSetup():void {
      // Check if trigger exists on alerts setup modal open. If not, create the trigger before opening the modal

      let defaultEmail = this.$rootScope.userDetails.email || 'myemail@company.com';

      let defaultEmailPromise = this.HawkularAlertsManager.addEmailAction(defaultEmail);

      let activeSessionsTriggerPromise = this.HawkularAlertsManager
        .existTrigger(this.resourceId + '_web_active_sessions').then(() => {
        // Active Web Sessions trigger exists, nothing to do
        this.$log.debug('Active Web Sessions trigger exists, nothing to do');
      }, () => {
        // Active Web Sessions trigger doesn't exist, need to create one

        let triggerId:string = this.resourceId + '_web_active_sessions';
        let resourceId:string = triggerId.slice(0, -20);
        let dataId:string = 'MI~R~[' + resourceId +
          '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Active Web Sessions';

        let fullTrigger = {
          trigger: {
            name: resourceId,
            id: triggerId,
            description: 'Active Web Sessions for ' + resourceId,
            autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
            autoEnable: true, // Enable trigger once an alert is resolved
            autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
            severity: 'MEDIUM',
            actions: {email: [this.defaultEmail]},
            context: {
              resourceType: 'App Server',
              resourceName: resourceId,
              resourcePath: this.$rootScope.resourcePath
            }
          },
          dampenings: [
            {
              triggerId: triggerId,
              evalTimeSetting: 7 * 60000,
              triggerMode: 'FIRING',
              type: 'STRICT_TIME'
            }
          ],
          conditions: [
            {
              triggerId: triggerId,
              type: 'RANGE',
              dataId: dataId,
              operatorLow: 'INCLUSIVE',
              operatorHigh: 'INCLUSIVE',
              thresholdLow: AppServerWebDetailsController.DEFAULT_MIN_SESSIONS,
              thresholdHigh: AppServerWebDetailsController.DEFAULT_MAX_SESSIONS,
              inRange: false,
              context: {
                description: 'Active Web Sessions',
                unit: 'sessions'
              }
            }
          ]
        };

        return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
          this.$log.error('Error on Trigger creation for ' + triggerId);
        });
      });

      let expiredSessionsTriggerPromise = this.HawkularAlertsManager
        .existTrigger(this.resourceId + '_web_expired_sessions').then(() => {
          // Expired Web Sessions trigger exists, nothing to do
          this.$log.debug('Expired Web Sessions trigger exists, nothing to do');
        }, () => {
          // Active Web Sessions trigger doesn't exist, need to create one

          let triggerId:string = this.resourceId + '_web_expired_sessions';
          let resourceId:string = triggerId.slice(0, -21);
          let dataId:string = 'MI~R~[' + resourceId +
            '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Expired Web Sessions';

          let fullTrigger = {
            trigger: {
              name: resourceId,
              id: triggerId,
              description: 'Expired Web Sessions for ' + resourceId,
              autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
              autoEnable: true, // Enable trigger once an alert is resolved
              autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
              severity: 'LOW',
              actions: {email: [this.defaultEmail]},
              context: {
                resourceType: 'App Server',
                resourceName: resourceId,
                resourcePath: this.$rootScope.resourcePath
              }
            },
            dampenings: [
              {
                triggerId: triggerId,
                evalTimeSetting: 7 * 60000,
                triggerMode: 'FIRING',
                type: 'STRICT_TIME'
              }
            ],
            conditions: [
              {
                triggerId: triggerId,
                type: 'THRESHOLD',
                dataId: dataId,
                threshold: AppServerWebDetailsController.DEFAULT_EXPIRED_SESSIONS_THRESHOLD,
                operator: 'GT',
                context: {
                  description: 'Expired Web Sessions',
                  unit: 'sessions'
                }
              }
            ]
          };

          return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
            this.$log.error('Error on Trigger creation for ' + triggerId);
          });
        });


      let rejectedSessionsTriggerPromise = this.HawkularAlertsManager
        .existTrigger(this.resourceId + '_web_rejected_sessions').then(() => {
          // Web Sessions trigger exists, nothing to do
          this.$log.debug('Rejected Web Sessions trigger exists, nothing to do');
        }, () => {
          // Rejected Web Sessions trigger doesn't exist, need to create one

          let triggerId:string = this.resourceId + '_web_rejected_sessions';
          let resourceId:string = triggerId.slice(0, -22);
          let dataId:string = 'MI~R~[' + resourceId +
            '~~]~MT~WildFly Aggregated Web Metrics~Aggregated Rejected Web Sessions';

          let fullTrigger = {
            trigger: {
              name: resourceId,
              id: triggerId,
              description: 'Rejected Web Sessions for ' + resourceId,
              autoDisable: true, // Disable trigger after firing, to not have repeated alerts of same issue
              autoEnable: true, // Enable trigger once an alert is resolved
              autoResolve: false, // Don't change into AUTORESOLVE mode as we don't have AUTORESOLVE conditions
              severity: 'LOW',
              actions: {email: [this.defaultEmail]},
              context: {
                resourceType: 'App Server',
                resourceName: resourceId,
                resourcePath: this.$rootScope.resourcePath
              }
            },
            dampenings: [
              {
                triggerId: triggerId,
                evalTimeSetting: 7 * 60000,
                triggerMode: 'FIRING',
                type: 'STRICT_TIME'
              }
            ],
            conditions: [
              {
                triggerId: triggerId,
                type: 'THRESHOLD',
                dataId: dataId,
                threshold: AppServerWebDetailsController.DEFAULT_REJECTED_SESSIONS_THRESHOLD,
                operator: 'GT',
                context: {
                  description: 'Rejected Web Sessions',
                  unit: 'sessions'
                }
              }
            ]
          };

          return this.HawkularAlertsManager.createTrigger(fullTrigger, () => {
            this.$log.error('Error on Trigger creation for ' + triggerId);
          });
        });

      let log = this.$log;

      this.$q.all([defaultEmailPromise, activeSessionsTriggerPromise, expiredSessionsTriggerPromise,
        rejectedSessionsTriggerPromise]).then(() => {
        let modalInstance = this.$modal.open({
          templateUrl: 'plugins/metrics/html/modals/alerts-web-setup.html',
          controller: 'WebAlertSetupController as was',
          resolve: {
            resourceId: () => {
              return this.resourceId;
            }
          }
        });

        modalInstance.result.then(angular.noop, () => {
          log.debug('Web Alert Setup modal dismissed at: ' + new Date());
        });
      }, () => {
        this.$log.error('Missing and unable to create new Web Alert triggers.');
      });

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
      // Done in appServerWebDetails.ts#getAlerts()
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

  _module.controller('WebAlertController', WebAlertController);

  export class WebAlertSetupController extends AlertSetupController {

    public maxUsage:number = AppServerWebDetailsController.MAX_SESSIONS;

    loadTriggers():Array<ng.IPromise<any>> {

      let activeSessionsTriggerId:string = this.$routeParams.resourceId + '_web_active_sessions';

      let activeSessionsTriggerPromise = this.HawkularAlertsManager.getTrigger(activeSessionsTriggerId).then(
        (triggerData) => {
          this.triggerDefinition['active'] = triggerData;

          this.adm.active = {};
          this.adm.active['email'] = triggerData.trigger.actions.email[0];
          this.adm.active['responseDuration'] = triggerData.dampenings[0].evalTimeSetting;

          this.adm.active['activeMaxEnabled'] = false;
          this.adm.active['activeMaxThreshold'] = AppServerWebDetailsController.DEFAULT_MAX_SESSIONS;

          this.adm.active['activeMinEnabled'] = false;
          this.adm.active['activeMinThreshold'] = AppServerWebDetailsController.DEFAULT_MIN_SESSIONS;

          if (triggerData.conditions[0].context.description === 'Active Web Sessions') {
            this.adm.active['activeMaxEnabled'] = triggerData.conditions[0].thresholdHigh < this.maxUsage;
            this.adm.active['activeMaxThreshold'] = triggerData.conditions[0].thresholdHigh;
            this.adm.active['activeMinEnabled'] = triggerData.conditions[0].thresholdLow > 0;
            this.adm.active['activeMinThreshold'] = triggerData.conditions[0].thresholdLow;
          }

          if (!triggerData.trigger.enabled) {
            this.adm.active['activeMaxEnabled'] = false;
            this.adm.active['activeMinEnabled'] = false;
          }

        });

      let expiredSessionsTriggerId:string = this.$routeParams.resourceId + '_web_expired_sessions';

      let expiredSessionsTriggerPromise = this.HawkularAlertsManager.getTrigger(expiredSessionsTriggerId).then(
        (triggerData) => {
          this.triggerDefinition['expired'] = triggerData;

          this.adm.expired = {};

          // Dampening and Notification will be shared from the active threshold

          this.adm.expired['expiredEnabled'] = triggerData.trigger.enabled;;
          this.adm.expired['expiredThreshold'] = AppServerWebDetailsController.DEFAULT_EXPIRED_SESSIONS_THRESHOLD;

          if (triggerData.conditions[0].context.description === 'Expired Web Sessions') {
            this.adm.expired['expiredThreshold'] = triggerData.conditions[0].threshold;
          }

        });

      let rejectedSessionsTriggerId:string = this.$routeParams.resourceId + '_web_rejected_sessions';

      let rejectedSessionsTriggerPromise = this.HawkularAlertsManager.getTrigger(rejectedSessionsTriggerId).then(
        (triggerData) => {
          this.triggerDefinition['rejected'] = triggerData;

          this.adm.rejected = {};

          // Dampening and Notification will be shared from the active threshold

          this.adm.rejected['rejectedEnabled'] = triggerData.trigger.enabled;;
          this.adm.rejected['rejectedThreshold'] = AppServerWebDetailsController.DEFAULT_REJECTED_SESSIONS_THRESHOLD;

          if (triggerData.conditions[0].context.description === 'Rejected Web Sessions') {
            this.adm.rejected['rejectedThreshold'] = triggerData.conditions[0].threshold;
          }

        });

      return [activeSessionsTriggerPromise,expiredSessionsTriggerPromise,rejectedSessionsTriggerPromise];
    }

    saveTriggers(errorCallback):Array<ng.IPromise<any>> {

      let activeSessionsTrigger = angular.copy(this.triggerDefinition.active);
      activeSessionsTrigger.trigger.actions.email[0] = this.adm.active.email;
      activeSessionsTrigger.dampenings[0].evalTimeSetting = this.adm.active.responseDuration;

      activeSessionsTrigger.trigger.enabled = true;
      if (this.adm.active['activeMaxEnabled'] && this.adm.active['activeMinEnabled']) {
        activeSessionsTrigger.conditions[0].thresholdLow = this.adm.active['activeMinThreshold'];
        activeSessionsTrigger.conditions[0].thresholdHigh = this.adm.active['activeMaxThreshold'];
      } else if (!this.adm.active['activeMaxEnabled'] && this.adm.active['activeMinEnabled']) {
        activeSessionsTrigger.conditions[0].thresholdLow = this.adm.active['activeMinThreshold'];
        activeSessionsTrigger.conditions[0].thresholdHigh = AppServerWebDetailsController.DEFAULT_MAX_SESSIONS;
      } else if (this.adm.active['activeMaxEnabled'] && !this.adm.active['activeMinEnabled']) {
        activeSessionsTrigger.conditions[0].thresholdLow = 0;
        activeSessionsTrigger.conditions[0].thresholdHigh = this.adm.active['activeMaxThreshold'];
      } else {
        activeSessionsTrigger.trigger.enabled = false;
      }

      let activeSessionsSavePromise = this.HawkularAlertsManager.updateTrigger(activeSessionsTrigger, errorCallback,
        this.triggerDefinition.active);


      let expiredSessionsTrigger = angular.copy(this.triggerDefinition.expired);
      expiredSessionsTrigger.trigger.actions.email[0] = this.adm.active.email;
      expiredSessionsTrigger.dampenings[0].evalTimeSetting = this.adm.active.responseDuration;

      expiredSessionsTrigger.trigger.enabled = true;
      if (this.adm.expired['expiredEnabled']) {
        expiredSessionsTrigger.conditions[0].threshold = this.adm.expired['expiredThreshold'];
      } else {
        expiredSessionsTrigger.trigger.enabled = false;
      }

      let expiredSessionsSavePromise = this.HawkularAlertsManager.updateTrigger(expiredSessionsTrigger, errorCallback,
        this.triggerDefinition.expired);


      let rejectedSessionsTrigger = angular.copy(this.triggerDefinition.rejected);
      rejectedSessionsTrigger.trigger.actions.email[0] = this.adm.active.email;
      rejectedSessionsTrigger.dampenings[0].evalTimeSetting = this.adm.active.responseDuration;

      rejectedSessionsTrigger.trigger.enabled = true;
      if (this.adm.rejected['rejectedEnabled']) {
        rejectedSessionsTrigger.conditions[0].threshold = this.adm.rejected['rejectedThreshold'];
      } else {
        rejectedSessionsTrigger.trigger.enabled = false;
      }

      let rejectedSessionsSavePromise = this.HawkularAlertsManager.updateTrigger(rejectedSessionsTrigger, errorCallback,
        this.triggerDefinition.rejected);

      return [activeSessionsSavePromise,expiredSessionsSavePromise,rejectedSessionsSavePromise];
    }
  }

  _module.controller('WebAlertSetupController', WebAlertSetupController);
}
