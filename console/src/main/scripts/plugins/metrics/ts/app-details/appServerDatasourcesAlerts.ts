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


      let respTriggerId = this.resourceId + '_ds_resp';

      let respTriggerPromise = this.HawkularAlertsManager.getTrigger(respTriggerId)
        .then((triggerData) => {

          this.$log.debug('triggerData', 'resp', triggerData);
          this.triggerDefinition['resp'] = triggerData;

          this.adm['resp'] = {};
          this.adm.resp['email'] = triggerData.trigger.actions.email[0];
          this.adm.resp['responseDuration'] = triggerData.dampenings[0].evalTimeSetting;

          if (triggerData.conditions.length > 0) {
            let idCreation = 0,
              idWait = 1;

            if (triggerData.conditions[0].dataId.indexOf('Creation') === -1) {
              idCreation = 1;
              idWait = 0;
            }

            if (triggerData.conditions[idWait]) {
              this.adm.resp['waitTimeThreshold'] = triggerData.conditions[idWait].threshold;
              this.adm.resp['waitTimeEnabled'] = !!triggerData.conditions[idWait].threshold;
            }
            if (triggerData.conditions[idCreation]) {
              this.adm.resp['creationTimeThreshold'] = triggerData.conditions[idCreation].threshold;
              this.adm.resp['creationTimeEnabled'] = !!triggerData.conditions[idCreation].threshold;
            }
          }

          this.adm.resp['waitTimeThreshold'] = this.adm.resp['waitTimeThreshold'] ||
            AppServerDatasourcesDetailsController.DEFAULT_WAIT_THRESHOLD;
          this.adm.resp['creationTimeThreshold'] = this.adm.resp['creationTimeThreshold'] ||
            AppServerDatasourcesDetailsController.DEFAULT_CREA_THRESHOLD;
        });


      return [connTriggerPromise, respTriggerPromise];
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
      let respTrigger = angular.copy(this.triggerDefinition.resp);

      respTrigger.trigger.actions.email[0] = this.adm.resp.email;
      respTrigger.dampenings[0].evalTimeSetting = this.adm.resp.responseDuration;

      let respTriggerId = respTrigger.trigger.id;

      // Handle changes in conditions
      let resId = respTriggerId.slice(0,-8);
      let dataId1:string = 'MI~R~[' + resId + ']~MT~Datasource Pool Metrics~Average Get Time';
      let dataId2:string = 'MI~R~[' + resId + ']~MT~Datasource Pool Metrics~Average Creation Time';

      let respUpdateConditions = [];

      if (this.adm.resp.waitTimeEnabled && !this.adm.resp.creationTimeEnabled) {
        respUpdateConditions = [
          {
            triggerId: respTriggerId,
            conditionSetSize: 1,
            conditionSetIndex: 1,
            type: 'THRESHOLD',
            dataId: dataId1,
            threshold: this.adm.resp.waitTimeThreshold,
            operator: 'GT',
            context: {
              description: 'Average Get Time',
              unit: 'ms'
            }
          }
        ];
      } else if (!this.adm.resp.waitTimeEnabled && this.adm.resp.creationTimeEnabled) {
        respUpdateConditions = [
          {
            triggerId: respTriggerId,
            conditionSetSize: 1,
            conditionSetIndex: 1,
            type: 'THRESHOLD',
            dataId: dataId2,
            threshold: this.adm.resp.creationTimeThreshold,
            operator: 'GT',
            context: {
              description: 'Average Creation Time',
              unit: 'ms'
            }
          }
        ];
      } else if (this.adm.resp.waitTimeEnabled && this.adm.resp.creationTimeEnabled) {
        respUpdateConditions = [
          {
            triggerId: respTriggerId,
            conditionSetSize: 2,
            conditionSetIndex: 1,
            type: 'THRESHOLD',
            dataId: dataId1,
            threshold: this.adm.resp.waitTimeThreshold,
            operator: 'GT',
            context: {
              description: 'Average Get Time',
              unit: 'ms'
            }
          },
          {
            triggerId: respTriggerId,
            conditionSetSize: 2,
            conditionSetIndex: 2,
            type: 'THRESHOLD',
            dataId: dataId2,
            threshold: this.adm.resp.creationTimeThreshold,
            operator: 'GT',
            context: {
              description: 'Average Creation Time',
              unit: 'ms'
            }
          }
        ];
      }

      let respSavePromise = this.HawkularAlertsManager.updateTrigger(respTrigger,
        errorCallback, this.triggerDefinition.resp);

      console.log('@PROMISES', connSavePromise, respSavePromise);
      return [connSavePromise, respSavePromise];
    }
  }

  _module.controller('DatasourcesAlertSetupController', DatasourcesAlertSetupController);
}
