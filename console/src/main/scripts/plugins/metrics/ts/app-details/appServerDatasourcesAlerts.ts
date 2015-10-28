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
/// <reference path="../services/alertsManager.ts"/>
/// <reference path="../services/errorsManager.ts"/>

module HawkularMetrics {

  export class DatasourcesAlertSetupController extends AlertSetupController {

    loadTriggers():Array<ng.IPromise<any>> {
      console.log('this.resourceId', this.resourceId);

      let connTriggerId = this.resourceId + '_ds_conn';

      let connTriggerPromise = this.HawkularAlertsManager.getTrigger(connTriggerId)
        .then((triggerData) => {
          this.$log.debug('triggerData', 'conn', triggerData);
          this.triggerDefinition['conn'] = triggerData;

          this.adm['conn'] = {};
          this.adm.conn['email'] = triggerData.trigger.actions.email[0];
          this.adm.conn['responseDuration'] = triggerData.dampenings[0].evalTimeSetting;
          this.adm.conn['conditionThreshold'] = triggerData.conditions[0].threshold;
          this.adm.conn['conditionEnabled'] = triggerData.trigger.enabled;
        });


      let waitTriggerId = this.resourceId + '_ds_wait';

      let waitTriggerPromise = this.HawkularAlertsManager.getTrigger(waitTriggerId)
        .then((triggerData) => {

          this.$log.debug('triggerData', 'wait', triggerData);
          this.triggerDefinition['wait'] = triggerData;

          this.adm['wait'] = {};
          this.adm.wait['email'] = triggerData.trigger.actions.email[0];
          this.adm.wait['responseDuration'] = triggerData.dampenings[0].evalTimeSetting;
          this.adm.wait['conditionThreshold'] = triggerData.conditions[0].threshold;
          this.adm.wait['conditionEnabled'] = triggerData.trigger.enabled;
        });

      let createTriggerId = this.resourceId + '_ds_create';

      let createTriggerPromise = this.HawkularAlertsManager.getTrigger(createTriggerId)
        .then((triggerData) => {

          this.$log.debug('triggerData', 'create', triggerData);
          this.triggerDefinition['create'] = triggerData;

          this.adm['create'] = {};
          this.adm.create['email'] = triggerData.trigger.actions.email[0];
          this.adm.create['responseDuration'] = triggerData.dampenings[0].evalTimeSetting;
          this.adm.create['conditionThreshold'] = triggerData.conditions[0].threshold;
          this.adm.create['conditionEnabled'] = triggerData.trigger.enabled;
        });


      return [connTriggerPromise, waitTriggerPromise, createTriggerPromise];
    }

    saveTriggers(errorCallback):Array<ng.IPromise<any>> {
      // Connections part
      let connTrigger = angular.copy(this.triggerDefinition.conn);
      connTrigger.trigger.enabled = this.adm.conn.conditionEnabled;

      if (this.adm.conn.conditionEnabled) {
        connTrigger.trigger.actions.email[0] = this.adm.conn.email;
        connTrigger.dampenings[0].evalTimeSetting = this.adm.conn.responseDuration;
        connTrigger.conditions[0].threshold = this.adm.conn.conditionThreshold;
      }

      let connSavePromise = this.HawkularAlertsManager.updateTrigger(connTrigger,
        errorCallback, this.triggerDefinition.conn);

      // Responsiveness part
      let waitTrigger = angular.copy(this.triggerDefinition.wait);
      waitTrigger.trigger.enabled = this.adm.wait.conditionEnabled;

      if (this.adm.wait.conditionEnabled) {
        waitTrigger.trigger.actions.email[0] = this.adm.wait.email;
        waitTrigger.dampenings[0].evalTimeSetting = this.adm.wait.responseDuration;
        waitTrigger.conditions[0].threshold = this.adm.wait.conditionThreshold;
      }

      let waitSavePromise = this.HawkularAlertsManager.updateTrigger(waitTrigger,
        errorCallback, this.triggerDefinition.wait);

      let createTrigger = angular.copy(this.triggerDefinition.create);
      createTrigger.trigger.enabled = this.adm.create.conditionEnabled;

      if (this.adm.create.conditionEnabled) {
        createTrigger.trigger.actions.email[0] = this.adm.create.email;
        createTrigger.dampenings[0].evalTimeSetting = this.adm.create.responseDuration;
        createTrigger.conditions[0].threshold = this.adm.create.conditionThreshold;
      }

      let createSavePromise = this.HawkularAlertsManager.updateTrigger(createTrigger,
        errorCallback, this.triggerDefinition.create);

      console.log('@PROMISES', connSavePromise, waitSavePromise, createSavePromise);
      return [connSavePromise, waitSavePromise, createSavePromise];
    }
  }

  _module.controller('DatasourcesAlertSetupController', DatasourcesAlertSetupController);
}
