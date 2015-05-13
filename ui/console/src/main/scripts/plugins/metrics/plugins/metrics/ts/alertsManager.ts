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

module HawkularMetrics {

  export interface IHawkularAlertsManager {
    addEmailAction(email: string): ng.IPromise<void>;
    createAction(email: string): ng.IPromise<void>;
    updateTrigger(triggerId: string, data: any): ng.IPromise<void>;
    createTrigger(triggerName: string, enabled: boolean, conditionType: string, email: string): ng.IPromise<void>;
    createCondition(triggerId: string, condition: any): ng.IPromise<void>;
    updateCondition(triggerId: string, conditionId: string, condition: any): ng.IPromise<void>;
    createDampening(triggerId: string, duration: number): ng.IPromise<void>;
    updateDampening(triggerId: string, dampeningId: string, dampening: any): ng.IPromise<void>;
    getAction(email: string): ng.IPromise<void>;
    getActions(triggerId: string): ng.IPromise<void>;
    getTrigger(triggerId: string): ng.IPromise<void>;
    setEmail(triggerId: string, email: string): ng.IPromise<void>;
    setResponseTime(triggerId: string, treshold: number, duration: number, enabled: boolean): ng.IPromise<void>;
    setDowntime(triggerId: string, duration: number, enabled: boolean): ng.IPromise<void>;
    queryConsoleAlerts(metricId: string): ng.IPromise<void>;
  }

  export class HawkularAlertsManager implements IHawkularAlertsManager{

    public static $inject = ['HawkularAlert', '$q', '$log', '$moment'];

    constructor(private HawkularAlert: any,
                private $q: ng.IQService,
                private $log: ng.ILogService,
                private $moment: any) {
    }

    public createTrigger(triggerName: string, enabled: boolean, conditionType: string, email: string): ng.IPromise<void> {
      // Create a trigger
      var triggerId: string;

      return this.HawkularAlert.Trigger.save({
        name: triggerName,
        id: triggerName,
        description: 'Created on ' + Date(),
        firingMatch: 'ALL',
        safetyMatch: 'ALL',
        enabled: enabled,
        safetyEnabled: false,
        actions: [email]
      }).$promise.then((trigger)=> {

          triggerId = trigger.id;

          // Parse metrics id from the trigger name
          var dataId: string = trigger.name.slice(0,-14) + '.status.duration';

          // Create a conditions for that trigger
          if (conditionType === 'THRESHOLD') {
            return this.createCondition(triggerId,{
              type: conditionType,
              triggerId: triggerId,
              threshold: 1000,
              dataId: dataId,
              operator: 'GT'
            });
          } else if (conditionType === 'AVAILABILITY') {
            return this.createCondition(triggerId, {
              type: conditionType,
              triggerId: triggerId,
              dataId: trigger.name.slice(0,-14),
              operator: 'DOWN'
            });
          }
        }).then(() => {
          // Create dampening for that trigger
          return this.createDampening(triggerId, 7 * 60000);
        });
    }

    public updateTrigger(triggerId: string, data: any): ng.IPromise<void> {
      data.id = triggerId;
      return this.HawkularAlert.Trigger.put({triggerId: triggerId}, data).$promise;
    }

    getAction(email: string): ng.IPromise<void> {
      return this.HawkularAlert.Action.get({
        actionId: email
      }).$promise;
    }

    createAction(email: string): ng.IPromise<void> {
      return this.HawkularAlert.Action.save({
        actionPlugin: 'email',
        actionId: email,
        description: 'Created on ' + Date(),
        to: email
      }).$promise;
    }

    addEmailAction(email: string): ng.IPromise<void> {
      return this.getAction(email).then((data: any)=> {
        // Create a default email action
        this.$log.debug('Action', data, ' for email ', email);
        if (!data.actionId) {
          this.$log.debug('Action does not exist, creating one');
          return this.createAction(email);
        }

        this.$log.debug('Action does already exist');
      });
    }

    updateAction(email: string): ng.IPromise<void> {
      return this.HawkularAlert.Action.put({
        actionPlugin: 'email',
        actionId: email,
        description: 'Created on ' + Date(),
        to: email
      }).$promise;
    }

    createCondition(triggerId: string, condition: any): ng.IPromise<void> {
      return this.HawkularAlert.Condition.save({triggerId: triggerId}, condition).$promise;
    }

    updateCondition(triggerId: string, conditionId: string, condition: any): ng.IPromise<void> {
      return this.HawkularAlert.Condition.put({triggerId: triggerId, conditionId: conditionId}, condition).$promise;
    }

    createDampening(triggerId: string, duration: number): ng.IPromise<void> {
      return this.HawkularAlert.Dampening.save({ triggerId: triggerId }, {
        triggerId: triggerId,
        evalTimeSetting: duration,
        type: 'STRICT_TIME'
      }).$promise;
    }

    updateDampening(triggerId: string, dampeningId: string, dampening: any): ng.IPromise<void> {
      dampening.dampeningId = dampeningId;
      return this.HawkularAlert.Dampening.put({ triggerId: triggerId, dampeningId: dampeningId }, dampening).$promise;
    }

    getActions(triggerId:string): ng.IPromise<void> {
      return undefined;
    }

    getTrigger(triggerId: string): ng.IPromise<void> {
      return this.HawkularAlert.Trigger.get({ triggerId: triggerId }).$promise;
    }

    setEmail(triggerId:string, email:string):ng.IPromise<void> {
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

    setResponseTime(triggerId:string, treshold:number, duration:number, enabled:boolean):ng.IPromise<void> {
      return undefined;
    }

    setDowntime(triggerId:string, duration:number, enabled:boolean):ng.IPromise<void> {
      return undefined;
    }

    queryConsoleAlerts(metricId: string): ng.IPromise<void> {

      var alertList = [];

      /* Format of Alerts:

       alert: {
       type: 'THRESHOLD' or 'AVAILABILITY'
       avg: Average value based on the evalSets 'values'
       start: The time of the first data ('dataTimestamp') in evalSets
       threshold: The threshold taken from condition.threshold
       end: The time when the alert was sent ('ctime')
       }

       */

      return this.HawkularAlert.Alert.query({triggerIds:metricId+'_trigger_avail,' + metricId+'_trigger_thres'}).$promise.then((serverAlerts: any) => {

        var momentNow = this.$moment();

        this.$log.debug('querying data finished', serverAlerts);

        for (var i = 0; i < serverAlerts.length; i++) {
          var consoleAlert: any = {};
          var serverAlert = serverAlerts[i];

          this.$log.debug('server Alert to inspect: ', serverAlert);

          consoleAlert.end = serverAlert.ctime;

          var sum: number = 0.0;
          var count: number = 0.0;

          for (var j = 0; j < serverAlert.evalSets.length; j++) {
            var eval = serverAlert.evalSets[j][0];

            if (!consoleAlert.start && eval.dataTimestamp) {
              consoleAlert.start = eval.dataTimestamp;
            }

            if (!consoleAlert.threshold && eval.condition.threshold) {
              consoleAlert.threshold = eval.condition.threshold;
            }

            if (!consoleAlert.type && eval.condition.type) {
              consoleAlert.type = eval.condition.type;
            }

            var momentAlert = this.$moment(consoleAlert.end);

            if (momentAlert.year() === momentNow.year()) {
              consoleAlert.isThisYear = true;
              if (momentAlert.dayOfYear() === momentNow.dayOfYear()) {
                consoleAlert.isToday = true;
              }
            }

            sum += eval.value;
            count++;
          }

          consoleAlert.avg = sum/count;

          alertList.push(consoleAlert);
        }
      }, (error) => {
        this.$log.debug('querying data error', error);
      }).then(()=> {
        return alertList;
      });
    }
  }

  _module.service('HawkularAlertsManager', HawkularAlertsManager);
}
