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

module HawkularMetrics {

  export enum AlertType {
    AVAILABILITY,
    THRESHOLD,
    RANGE
  }

  export interface IHawkularAlertsManager {
    addEmailAction(email: EmailType): ng.IPromise<void>;
    createAction(email: EmailType): ng.IPromise<void>;

    getAction(email: EmailType): ng.IPromise<void>;
    getActions(triggerId: TriggerId): ng.IPromise<void>;
    setEmail(triggerId: TriggerId, email: EmailType): ng.IPromise<void>;
    queryConsoleAlerts(metricId: MetricId, startTime?:TimestampInMillis, endTime?:TimestampInMillis, type?:AlertType,
                       currentPage?:number, perPage?:number): any;
    queryAlerts(metricId: MetricId, startTime?:TimestampInMillis,
                endTime?:TimestampInMillis, currentPage?:number, perPage?:number): any;

    // Triggers

    /**
     * @name existTrigger
     * @desc Check if a trigger exists
     * @param {TriggerId} triggerId - The id of the trigger to check
     * @returns {ng.IPromise}
     */
    existTrigger(triggerId: TriggerId): any;

    /**
     * @name getTrigger
     * @desc Fetch a full Trigger with Dampening and Conditions object attached
     * @param {TriggerId} triggerId - The id of the trigger to fetch
     * @returns {ng.IPromise} with value:
     *
     *    promiseValue = {
     *      trigger: <The trigger object>,
     *      dampenings: <List of dampenings linked with the trigger>,
     *      conditions: <List of conditions linked with the trigger>
     *    }
     */
    getTrigger(triggerId: TriggerId): any;

    /**
     * @name createTrigger
     * @desc Create a Trigger with Dampenings and Conditions
     * @param fullTrigger - A full trigger representation where
     *
     *    fullTrigger = {
     *      trigger: <The trigger object>,
     *      dampenings: <List of dampenings linked with the trigger>,
     *      conditions: <List of conditions linked with the trigger>
     *    }
     *
     * @param errorCallback - Function to be called on error
     */
    createTrigger(fullTrigger: any, errorCallback: any): ng.IPromise<void>;

    /**
     * @name deleteTrigger
     * @desc Delete a Trigger with associated Dampenings and Conditions
     * @param {TriggerId} triggerId - The id of the trigger to delete
     */
    deleteTrigger(triggerId: TriggerId): ng.IPromise<any>;

    /**
     * @name updateTrigger
     * @desc Update an existing Trigger with Dampenings and Conditions
     * @param fullTrigger - An existing full trigger representation where
     *
     *    fullTrigger = {
     *      trigger: <The trigger object>,
     *      dampenings: <List of dampenings linked with the trigger>,
     *      conditions: <List of conditions linked with the trigger>
     *    }
     *
     * @param errorCallback - Function to be called on error
     * @param backup - A backup of the fullTrigger, it updates only the trigger, dampenings or conditions
     * that have been changed
     *
     *    backupTrigger = {
     *      trigger: <The trigger object>,
     *      dampenings: <List of dampenings linked with the trigger>,
     *      conditions: <List of conditions linked with the trigger>
     *    }
     */
    updateTrigger(fullTrigger: any, errorCallback: any, backupTrigger?: any): ng.IPromise<any>;
  }

  export class HawkularAlertsManager implements IHawkularAlertsManager{

    public static $inject = ['HawkularAlert', '$q', '$log', '$moment', 'NotificationsService', 'ErrorsManager'];

    constructor(private HawkularAlert: any,
                private $q: ng.IQService,
                private $log: ng.ILogService,
                private $moment: any,
                private NotificationsService:INotificationsService,
                private ErrorsManager: HawkularMetrics.IErrorsManager) {
    }

    public existTrigger(triggerId: TriggerId): any {
      return this.HawkularAlert.Trigger.get({triggerId: triggerId}).$promise;
    }

    public getTrigger(triggerId: TriggerId): any {
      var deffered = this.$q.defer();
      var trigger = {};

      this.HawkularAlert.Trigger.get({triggerId: triggerId}).$promise.then((triggerData) => {
        trigger['trigger'] = triggerData;
        return this.HawkularAlert.Dampening.query({triggerId: triggerId}).$promise;
      }).then((dampeningData) => {
        trigger['dampenings'] = dampeningData;
        return this.HawkularAlert.Condition.query({triggerId: triggerId}).$promise;
      }).then((conditionData)=> {
        trigger['conditions'] = conditionData;
        deffered.resolve(trigger);
      });

      return deffered.promise;
    }

    public createTrigger(fullTrigger: any, errorCallback: any): ng.IPromise<void> {

      var triggerDefaults = {
        description: 'Created on ' + Date(),
        firingMatch: 'ALL',
        autoResolveMatch: 'ALL',
        enabled: true,
        autoResolve: true,
        actions: {}
      };

      var trigger = angular.extend(triggerDefaults, fullTrigger.trigger);

      return this.HawkularAlert.Trigger.save(trigger).$promise.then((savedTrigger) => {

        var dampeningPromises = [];
        for (var i = 0; fullTrigger.dampenings && i < fullTrigger.dampenings.length; i++) {
          if (fullTrigger.dampenings[i]) {
            var dampeningPromise = this.HawkularAlert.Dampening.save({triggerId: savedTrigger.id},
              fullTrigger.dampenings[i]).$promise.then(null, (error) => {
                return this.ErrorsManager.errorHandler(error, 'Error creating dampening.', errorCallback);
              });
            dampeningPromises.push(dampeningPromise);
          }
        }

        var conditionDefaults: any = {
          triggerId: savedTrigger.id
        };

        var conditionPromises = [];
        for (var j = 0; fullTrigger.conditions && j < fullTrigger.conditions.length; j++) {
          if (fullTrigger.conditions[j]) {
            var conditionPromise = this.HawkularAlert.Condition.save({triggerId: savedTrigger.id},
              fullTrigger.conditions[j]).$promise.then(null, (error) => {
                return this.ErrorsManager.errorHandler(error, 'Error creating condition.', errorCallback);
              });
            conditionPromises.push(conditionPromise);
          }
        }

        return this.$q.all(Array.prototype.concat(dampeningPromises, conditionPromises));
      });

    }

    public deleteTrigger(triggerId: TriggerId): ng.IPromise<void> {
      return this.HawkularAlert.Trigger.delete({triggerId: triggerId}).$promise;
    }

    public updateTrigger(fullTrigger: any, errorCallback: any, backupTrigger?: any): ng.IPromise<any> {

      var emailPromise = this.addEmailAction(fullTrigger.trigger.actions.email[0]).then(()=> {
        if (angular.equals(fullTrigger.trigger, backupTrigger.trigger) || !fullTrigger.trigger) {
          return;
        }
        return this.HawkularAlert.Trigger.put({triggerId: fullTrigger.trigger.id}, fullTrigger.trigger).$promise;
      }, (error)=> {
        return this.ErrorsManager.errorHandler(error, 'Error saving email action.', errorCallback);
      });

      var dampeningPromises = [];
      for (var i = 0; fullTrigger.dampenings && i < fullTrigger.dampenings.length; i++) {
        if (fullTrigger.dampenings[i] && !angular.equals(fullTrigger.dampenings[i], backupTrigger.dampenings[i])) {
          var triggerId = fullTrigger.trigger.id;
          var dampeningId = fullTrigger.dampenings[i].dampeningId;
          var dampeningPromise = this.HawkularAlert.Dampening.put({triggerId: triggerId, dampeningId: dampeningId },
            fullTrigger.dampenings[i]).$promise.then(null, (error)=> {
              return this.ErrorsManager.errorHandler(error, 'Error saving dampening.', errorCallback);
            });

          dampeningPromises.push(dampeningPromise);
        }
      }

      var conditionPromises = [];
      for (var j = 0; fullTrigger.conditions && j < fullTrigger.conditions.length; j++) {
        if (fullTrigger.conditions[j] && !angular.equals(fullTrigger.conditions[j], backupTrigger.conditions[j])) {
          triggerId = fullTrigger.trigger.id;
          var conditionId = fullTrigger.conditions[j].conditionId;
          var conditionPromise =  this.HawkularAlert.Condition.put({triggerId: triggerId,
            conditionId: conditionId}, fullTrigger.conditions[j]).$promise.then(null, (error)=> {
              return this.ErrorsManager.errorHandler(error, 'Error saving condition.', errorCallback);
            });

          conditionPromises.push(conditionPromise);
        }
      }

      return this.$q.all(Array.prototype.concat(emailPromise, dampeningPromises, conditionPromises));
    }

    public getAction(email: EmailType): ng.IPromise<void> {
      return this.HawkularAlert.Action.get({
        pluginId: 'email',
        actionId: email
      }).$promise;
    }

    public createAction(email: EmailType): ng.IPromise<void> {
      return this.HawkularAlert.Action.save({
        actionPlugin: 'email',
        actionId: email,
        description: 'Created on ' + Date(),
        to: email
      }).$promise;
    }

    public addEmailAction(email: EmailType): ng.IPromise<void> {
      return this.getAction(email).then((promiseValue: any) => {
        return promiseValue;
      }, (reason: any) => {
        // Create a default email action
        if (reason.status === 404) {
          this.$log.debug('Action does not exist, creating one');
          return this.createAction(email);
        }
      });
    }

    public updateAction(email: EmailType): ng.IPromise<void> {
      return this.HawkularAlert.Action.put({
        actionPlugin: 'email',
        actionId: email,
        description: 'Created on ' + Date(),
        to: email
      }).$promise;
    }

    public getActions(triggerId:TriggerId): ng.IPromise<void> {
      return undefined;
    }

    public setEmail(triggerId:TriggerId, email:EmailType):ng.IPromise<void> {
      var actions = this.getActions(triggerId);
      return actions.then((actions)=> {

        if (!actions) {
          // If action for this email does not exist, create one
          return this.HawkularAlert.Action.save({

          }).$promise;

        } else {
          // If it exists, just use it
          return this.HawkularAlert.Action.put({
            actionId: ''
          }, {

          }).$promise;
        }

      });
    }

    public queryConsoleAlerts(metricId: MetricId, startTime?:TimestampInMillis,
                              endTime?:TimestampInMillis, alertType?:AlertType,
                       currentPage?:number, perPage?:number): any {
      var alertList = [];
      var headers;

      /* Format of Alerts:

       alert: {
       type: 'THRESHOLD' or 'AVAILABILITY'
       avg: Average value based on the evalSets 'values'
       start: The time of the first data ('dataTimestamp') in evalSets
       threshold: The threshold taken from condition.threshold
       end: The time when the alert was sent ('ctime')
       }

       */

      var queryParams = {
        statuses:'OPEN'
      };

      if (currentPage || currentPage === 0) {
        queryParams['page'] = currentPage;
      }

      if (perPage) {
        queryParams['per_page'] = perPage;
      }

      if (alertType === AlertType.AVAILABILITY) {
        queryParams['triggerIds'] = metricId+'_trigger_avail';
      } else if (alertType === AlertType.THRESHOLD) {
        queryParams['triggerIds'] = metricId+'_trigger_thres';
      } else {
        queryParams['triggerIds'] = metricId+'_trigger_avail,' + metricId+'_trigger_thres';
      }

      if (startTime) {
        queryParams['startTime'] = startTime;
      }

      if (endTime) {
        queryParams['endTime'] = endTime;
      }

      return this.HawkularAlert.Alert.query(queryParams, (serverAlerts: any, getHeaders: any) => {

        headers = getHeaders();
        var momentNow = this.$moment();

        for (var i = 0; i < serverAlerts.length; i++) {
          var consoleAlert: any = {};
          var serverAlert = serverAlerts[i];

          consoleAlert.id = serverAlert.alertId;
          consoleAlert.end = serverAlert.ctime;

          var sum: number = 0.0;
          var count: number = 0.0;

          for (var j = 0; j < serverAlert.evalSets.length; j++) {
            var evalItem = serverAlert.evalSets[j][0];

            if (!consoleAlert.start && evalItem.dataTimestamp) {
              consoleAlert.start = evalItem.dataTimestamp;
            }

            if (!consoleAlert.threshold && evalItem.condition.threshold) {
              consoleAlert.threshold = evalItem.condition.threshold;
            }

            if (!consoleAlert.type && evalItem.condition.type) {
              consoleAlert.type = evalItem.condition.type;
            }

            var momentAlert = this.$moment(consoleAlert.end);

            if (momentAlert.year() === momentNow.year()) {
              consoleAlert.isThisYear = true;
              if (momentAlert.dayOfYear() === momentNow.dayOfYear()) {
                consoleAlert.isToday = true;
              }
            }

            sum += evalItem.value;
            count++;
          }

          consoleAlert.avg = sum/count;

          consoleAlert.durationTime = consoleAlert.end - consoleAlert.start;

          alertList.push(consoleAlert);
        }
      }, (error) => {
        this.$log.debug('querying data error', error);
      }).$promise.then(()=> {
        return {
          alertList: alertList,
          headers: headers
        };
      });
    }


    public queryAlerts(metricId: MetricId, startTime?:TimestampInMillis, endTime?:TimestampInMillis,
                       currentPage?:number, perPage?:number): any {
      var alertList = [];
      var headers;

      /* Format of Alerts:

       alert: {
       type: 'THRESHOLD' or 'AVAILABILITY'
       avg: Average value based on the evalSets 'values'
       start: The time of the first data ('dataTimestamp') in evalSets
       threshold: The threshold taken from condition.threshold
       end: The time when the alert was sent ('ctime')
       }

       */

      var queryParams = {
        statuses:'OPEN'
      };

      if (currentPage || currentPage === 0) {
        queryParams['page'] = currentPage;
      }

      if (perPage) {
        queryParams['per_page'] = perPage;
      }

      queryParams['triggerIds'] = metricId;

      if (startTime) {
        queryParams['startTime'] = startTime;
      }

      if (endTime) {
        queryParams['endTime'] = endTime;
      }

      return this.HawkularAlert.Alert.query(queryParams, (serverAlerts: any, getHeaders: any) => {

        headers = getHeaders();
        var momentNow = this.$moment();

        for (var i = 0; i < serverAlerts.length; i++) {
          var consoleAlert: any = {};
          var serverAlert = serverAlerts[i];

          consoleAlert.id = serverAlert.alertId;

          consoleAlert.dataId = serverAlert.evalSets[0][0].condition.dataId;

          consoleAlert.end = serverAlert.ctime;

          var sum: number = 0.0;
          var count: number = 0.0;

          for (var j = 0; j < serverAlert.evalSets.length; j++) {
            var evalItem = serverAlert.evalSets[j][0];

            if (!consoleAlert.start && evalItem.dataTimestamp) {
              consoleAlert.start = evalItem.dataTimestamp;
            }

            if (!consoleAlert.threshold && evalItem.condition.threshold) {
              consoleAlert.threshold = evalItem.condition.threshold;
            }

            if (!consoleAlert.type && evalItem.condition.type) {
              consoleAlert.type = evalItem.condition.type;
            }

            var momentAlert = this.$moment(consoleAlert.end);

            if (momentAlert.year() === momentNow.year()) {
              consoleAlert.isThisYear = true;
              if (momentAlert.dayOfYear() === momentNow.dayOfYear()) {
                consoleAlert.isToday = true;
              }
            }

            sum += evalItem.value;
            count++;
          }

          consoleAlert.avg = sum/count;

          consoleAlert.durationTime = consoleAlert.end - consoleAlert.start;

          alertList.push(consoleAlert);
        }
      }, (error) => {
        this.$log.debug('querying data error', error);
      }).$promise.then(()=> {
          return {
            alertList: alertList,
            headers: headers
          };
        });
    }


  }

  _module.service('HawkularAlertsManager', HawkularAlertsManager);
}
