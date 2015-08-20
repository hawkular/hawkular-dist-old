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

      var connTriggerId = this.resourceId + '_ds_conn';

      var connDefinitionPromise = this.HawkularAlertsManager.getAlertDefinition(connTriggerId)
        .then((alertDefinitionData) => {
          this.$log.debug('alertDefinitionData', alertDefinitionData);
          this.triggerDefinition['conn'] = alertDefinitionData;

          this.adm['conn'] = {};
          this.adm.conn['email'] = alertDefinitionData.trigger.actions.email[0];
          this.adm.conn['responseDuration'] = alertDefinitionData.dampenings[0].evalTimeSetting;
          this.adm.conn['conditionThreshold'] = alertDefinitionData.conditions[0].threshold;
          this.adm.conn['conditionEnabled'] = alertDefinitionData.trigger.enabled;
        });


      var respTriggerId = this.resourceId + '_ds_resp';

      var respDefinitionPromise = this.HawkularAlertsManager.getAlertDefinition(respTriggerId)
        .then((alertDefinitionData) => {

          this.$log.debug('alertDefinitionData', alertDefinitionData);
          this.triggerDefinition['resp'] = alertDefinitionData;

          this.adm['resp'] = {};
          this.adm.resp['email'] = alertDefinitionData.trigger.actions.email[0];
          this.adm.resp['responseDuration'] = alertDefinitionData.dampenings[0].evalTimeSetting;

          var idCreation = 0,
            idWait = 1;

          if (alertDefinitionData.conditions[1].dataId.indexOf('Creation') > -1) {
            idCreation = 1;
            idWait = 0;
          }

          this.adm.resp['waitTimeThreshold'] = alertDefinitionData.conditions[idWait].threshold;
          this.adm.resp['waitTimeEnabled'] = !!alertDefinitionData.conditions[idWait].threshold;
          this.adm.resp['creationTimeThreshold'] = alertDefinitionData.conditions[idCreation].threshold;
          this.adm.resp['creationTimeEnabled'] = !!alertDefinitionData.conditions[idCreation].threshold;
        });


      return [connDefinitionPromise, respDefinitionPromise];
    }

    saveDefinitions(errorCallback):Array<ng.IPromise<any>> {
      // Connections part
      var connAlertDefinition = angular.copy(this.triggerDefinition.conn);
      connAlertDefinition.trigger.enabled = this.adm.conn.conditionEnabled;

      if (this.adm.conn.conditionEnabled) {
        connAlertDefinition.trigger.actions.email[0] = this.adm.conn.email;
        connAlertDefinition.dampenings[0].evalTimeSetting = this.adm.conn.responseDuration;
        connAlertDefinition.conditions[0].treshold = this.adm.conn.conditionThreshold;
      }

      var connSavePromise = this.HawkularAlertsManager.saveAlertDefinition(connAlertDefinition,
        errorCallback, this.triggerDefinition.conn);

      // Responsiveness part
      var respAlertDefinition = angular.copy(this.triggerDefinition.resp);

      var idCreation = 0,
        idWait = 1;
      if (respAlertDefinition.conditions[1].dataId.indexOf('Creation') > -1) {
        idCreation = 1;
        idWait = 0;
      }

      respAlertDefinition.trigger.actions.email[0] = this.adm.resp.email;
      respAlertDefinition.dampenings[0].evalTimeSetting = this.adm.resp.responseDuration;

      var respTriggerId = respAlertDefinition.trigger.id;

      // Handle changes in conditions

      var condWaitDefer = this.$q.defer();
      var condWaitPromise = condWaitDefer.promise;

      if (!this.adm.resp.waitTimeEnabled && this.admBak.resp.waitTimeEnabled) {
        // delete
        condWaitPromise = this.HawkularAlertsManager.deleteCondition(respTriggerId,
          respAlertDefinition.conditions[idWait].conditionId);

        delete respAlertDefinition.conditions[idWait];
      } else if (this.adm.resp.waitTimeEnabled && !this.adm.resp.waitTimeEnabled) {
        // create
        var resId = respTriggerId.slice(0,-8);

        condWaitPromise = this.HawkularAlertsManager.createCondition(respTriggerId, {
          triggerId: respTriggerId,
          type: 'THRESHOLD',
          dataId: 'MI~R~[' + resId + ']~MT~Datasource Pool Metrics~Average Get Time',
          threshold: respAlertDefinition.conditions[idWait].treshold,
          operator: 'GT'
        });
      } else {
        condWaitDefer.resolve();
      }

      var condCreaDefer = this.$q.defer();
      var condCreaPromise = condCreaDefer.promise;
      condCreaDefer.resolve();

      respAlertDefinition.conditions[idWait].treshhold = this.adm.resp.waitTimeThreshold;
      respAlertDefinition.conditions[idCreation].treshhold = this.adm.resp.creationTimeThreshold;

      var respSavePromise = this.HawkularAlertsManager.saveAlertDefinition(respAlertDefinition,
        errorCallback, this.triggerDefinition.resp);

      return [connSavePromise, respSavePromise, condWaitPromise, condCreaPromise];
    }
  }

  _module.controller('DatasourcesAlertSetupController', DatasourcesAlertSetupController);
}
