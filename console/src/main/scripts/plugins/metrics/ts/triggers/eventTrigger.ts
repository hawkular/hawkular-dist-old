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

/// <reference path="../metricsPlugin.ts"/>
/// <reference path="../../includes.ts"/>
/// <reference path="../services/alertsManager.ts"/>
/// <reference path="../services/errorsManager.ts"/>

module HawkularMetrics {

  export class EventTriggerSetupController extends TriggerSetupController {

    public loadTrigger(triggerId: string): Array<ng.IPromise<any>> {

      let triggerPromise = this.HawkularAlertsManager.getTrigger(triggerId).then(
        (triggerData) => {

          this.fullTrigger = triggerData;

          this.adm.trigger = {};
          // updateable
          this.adm.trigger['description'] = triggerData.trigger.description;
          this.adm.trigger['enabled'] = triggerData.trigger.enabled;
          this.adm.trigger['name'] = triggerData.trigger.name;
          this.adm.trigger['severity'] = triggerData.trigger.severity;

          if ( triggerData.trigger.actions !== undefined ) {
            triggerData.trigger.actions.forEach((triggerAction: any) => {
              this.adm.trigger[triggerAction.actionPlugin] = triggerAction.actionId;
            });
          }
          if ( this.adm.trigger['email'] === undefined || this.adm.trigger['email'] === null ) {
            this.adm.trigger.emailEnabled = false;
            this.adm.trigger['email'] = this.$rootScope.userDetails.email;
          } else {
            this.adm.trigger.emailEnabled = true;
          }

          // presentation
          this.adm.trigger['context'] = triggerData.trigger.context;
        });

      return [triggerPromise];
    }

    public saveTrigger(errorCallback): Array<ng.IPromise<any>> {

      let updatedFullTrigger = angular.copy(this.fullTrigger);
      updatedFullTrigger.trigger.enabled = this.adm.trigger.enabled;
      updatedFullTrigger.trigger.name = this.adm.trigger.name;
      updatedFullTrigger.trigger.description = this.adm.trigger.description;
      updatedFullTrigger.trigger.severity = this.adm.trigger.severity;

      if ( this.adm.trigger.emailEnabled ) {
        this.updateAction( updatedFullTrigger.trigger.actions, 'email', this.adm.trigger.email, null);
      } else {
        this.removeAction( updatedFullTrigger.trigger.actions, 'email' );
      }

      let triggerSavePromise = this.HawkularAlertsManager.updateTrigger(updatedFullTrigger, errorCallback,
        this.fullTrigger);

      return [triggerSavePromise];
    }
  }

  _module.controller('EventTriggerSetupController', EventTriggerSetupController);
}
