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

    loadDefinitions():Array<ng.IPromise<any>> {
      console.log('this.resourceId', this.resourceId);

      let connTriggerId = this.resourceId + '_ds_conn';

      let connDefinitionPromise = this.HawkularAlertsManager.getTrigger(connTriggerId)
        .then((alertDefinitionData) => {
          this.$log.debug('alertDefinitionData', 'conn', alertDefinitionData);
          this.triggerDefinition['conn'] = alertDefinitionData;

          this.adm['conn'] = {};
          this.adm.conn['email'] = alertDefinitionData.trigger.actions.email[0];
          this.adm.conn['responseDuration'] = alertDefinitionData.dampenings[0].evalTimeSetting;
          this.adm.conn['conditionThreshold'] = alertDefinitionData.conditions[0].threshold;
          this.adm.conn['conditionEnabled'] = alertDefinitionData.trigger.enabled;
        });


      let respTriggerId = this.resourceId + '_ds_resp';

      let respDefinitionPromise = this.HawkularAlertsManager.getTrigger(respTriggerId)
        .then((alertDefinitionData) => {

          this.$log.debug('alertDefinitionData', 'resp', alertDefinitionData);
          this.triggerDefinition['resp'] = alertDefinitionData;

          this.adm['resp'] = {};
          this.adm.resp['email'] = alertDefinitionData.trigger.actions.email[0];
          this.adm.resp['responseDuration'] = alertDefinitionData.dampenings[0].evalTimeSetting;

          if (alertDefinitionData.conditions.length > 0) {
            let idCreation = 0,
              idWait = 1;

            if (alertDefinitionData.conditions[0].dataId.indexOf('Creation') === -1) {
              idCreation = 1;
              idWait = 0;
            }

            if (alertDefinitionData.conditions[idWait]) {
              this.adm.resp['waitTimeThreshold'] = alertDefinitionData.conditions[idWait].threshold;
              this.adm.resp['waitTimeEnabled'] = !!alertDefinitionData.conditions[idWait].threshold;
            }
            if (alertDefinitionData.conditions[idCreation]) {
              this.adm.resp['creationTimeThreshold'] = alertDefinitionData.conditions[idCreation].threshold;
              this.adm.resp['creationTimeEnabled'] = !!alertDefinitionData.conditions[idCreation].threshold;
            }
          }

          this.adm.resp['waitTimeThreshold'] = this.adm.resp['waitTimeThreshold'] ||
            AppServerDatasourcesDetailsController.DEFAULT_WAIT_THRESHOLD;
          this.adm.resp['creationTimeThreshold'] = this.adm.resp['creationTimeThreshold'] ||
            AppServerDatasourcesDetailsController.DEFAULT_CREA_THRESHOLD;
        });


      return [connDefinitionPromise, respDefinitionPromise];
    }

    saveDefinitions(errorCallback):Array<ng.IPromise<any>> {
      // Connections part
      let connAlertDefinition = angular.copy(this.triggerDefinition.conn);
      connAlertDefinition.trigger.enabled = this.adm.conn.conditionEnabled;

      if (this.adm.conn.conditionEnabled) {
        connAlertDefinition.trigger.actions.email[0] = this.adm.conn.email;
        connAlertDefinition.dampenings[0].evalTimeSetting = this.adm.conn.responseDuration;
        connAlertDefinition.conditions[0].threshold = this.adm.conn.conditionThreshold;
      }

      let connSavePromise = this.HawkularAlertsManager.updateTrigger(connAlertDefinition,
        errorCallback, this.triggerDefinition.conn);

      // Responsiveness part
      let respAlertDefinition = angular.copy(this.triggerDefinition.resp);

      let idCreation = 0,
        idWait = 1;
      if (respAlertDefinition.conditions[0] && respAlertDefinition.conditions[0].dataId.indexOf('Creation') === -1) {
        idCreation = 1;
        idWait = 0;
      }

      respAlertDefinition.trigger.actions.email[0] = this.adm.resp.email;
      respAlertDefinition.dampenings[0].evalTimeSetting = this.adm.resp.responseDuration;

      let respTriggerId = respAlertDefinition.trigger.id;

      // Handle changes in conditions

      let condWaitDefer = this.$q.defer();
      let condWaitPromise = condWaitDefer.promise;

      if (!this.adm.resp.waitTimeEnabled && this.admBak.resp.waitTimeEnabled) {
        /*
          FIXME: To update the trigger without this condition
          NOTE: This is commented here, as in alerts 0.4.x conditions are managed as a block in one call

         */
        // delete
        /*
        condWaitPromise = this.HawkularAlertsManager.deleteCondition(respTriggerId,
          respAlertDefinition.conditions[idWait].conditionId);
        */
        delete respAlertDefinition.conditions[idWait];
      } else if (this.adm.resp.waitTimeEnabled && !this.admBak.resp.waitTimeEnabled) {
        /*
          FIXME: To update the trigger with a new condition
          NOTE: This si commented here, as in alerts 0.4.x conditions are managed as a block in one call
         */
        // create
        let resId = respTriggerId.slice(0,-8);
        /*
        condWaitPromise = this.HawkularAlertsManager.createCondition(respTriggerId, {
          triggerId: respTriggerId,
          type: 'THRESHOLD',
          dataId: 'MI~R~[' + resId + ']~MT~Datasource Pool Metrics~Average Get Time',
          threshold: this.adm.resp.waitTimeThreshold,
          operator: 'GT'
        });
        */
      } else {
        condWaitDefer.resolve();
      }

      let condCreaDefer = this.$q.defer();
      let condCreaPromise = condCreaDefer.promise;
      let self = this;

      // FIXME: The condition id changes if previous was added/deleted ..
      if (!self.adm.resp.creationTimeEnabled && self.admBak.resp.creationTimeEnabled) {
        /*
         FIXME: To update the trigger without this condition
         NOTE: This is commented here, as in alerts 0.4.x conditions are managed as a block in one call
         */
        // delete
        /*
        condCreaPromise = self.HawkularAlertsManager.deleteCondition(respTriggerId,
          respAlertDefinition.conditions[idCreation].conditionId);
        */
        delete respAlertDefinition.conditions[idCreation];
      } else if (self.adm.resp.creationTimeEnabled && !self.admBak.resp.creationTimeEnabled) {
        /*
         FIXME: To update the trigger with a new condition
         NOTE: This si commented here, as in alerts 0.4.x conditions are managed as a block in one call
         */
        // create
        let resId = respTriggerId.slice(0,-8);
        /*
        condCreaPromise = self.HawkularAlertsManager.createCondition(respTriggerId, {
          triggerId: respTriggerId,
          type: 'THRESHOLD',
          dataId: 'MI~R~[' + resId + ']~MT~Datasource Pool Metrics~Average Creation Time',
          threshold: self.adm.resp.creationTimeThreshold,
          operator: 'GT'
        });
        */
      } else {
        condCreaDefer.resolve();
      }

      if (respAlertDefinition.conditions[idWait]) {
        respAlertDefinition.conditions[idWait].threshold = this.adm.resp.waitTimeThreshold;
      }
      if (respAlertDefinition.conditions[idCreation]) {
        respAlertDefinition.conditions[idCreation].threshold = this.adm.resp.creationTimeThreshold;
      }

      let respSavePromise = this.HawkularAlertsManager.updateTrigger(respAlertDefinition,
        errorCallback, this.triggerDefinition.resp);

      console.log('@PROMISES', connSavePromise, respSavePromise, condWaitPromise, condCreaPromise);
      return [connSavePromise, respSavePromise, condWaitPromise, condCreaPromise];
    }
  }

  _module.controller('DatasourcesAlertSetupController', DatasourcesAlertSetupController);
}
