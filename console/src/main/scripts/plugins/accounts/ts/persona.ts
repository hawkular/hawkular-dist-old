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

/// <reference path='accountsPlugin.ts'/>
module HawkularAccounts {
  export class PersonaController {
    public static $inject = ['$rootScope', '$scope', '$log', 'HawkularAccount', 'NotificationsService'];

    public personas:Array<IPersona>;
    public currentPersona:IPersona;
    public loading:boolean = true;

    constructor(private $rootScope:any,
                private $scope:any,
                private $log:ng.ILogService,
                private HawkularAccount:any,
                private NotificationsService:INotificationsService) {
      this.prepareListeners();
      this.loadData();
    }

    public prepareListeners():void {
      this.$rootScope.$on('CurrentPersonaLoaded', () => {
        this.loadPersonas();
      });

      this.$rootScope.$on('OrganizationCreated', () => {
        this.loadPersonas();
      });

      this.$rootScope.$on('OrganizationRemoved', () => {
        this.loadPersonas();
      });
    }

    public loadData():void {
      this.loading = true;
      this.currentPersona = this.HawkularAccount.Persona.get({id: 'current'},
        (response:IPersona) => {
          this.$rootScope.$broadcast('CurrentPersonaLoaded', response);
        }, (error:IErrorPayload) => {
          this.NotificationsService.error(`Failed to retrieve the current persona: ${error.data.message}`);
          this.$log.warn(`Failed to retrieve the current persona: ${error.data.message}`);
        }
      );
    }

    public loadPersonas():void {
      this.personas = this.HawkularAccount.Persona.query({},
        (response:Array<IPersona>) => {
          this.loading = false;
        }, (error:IErrorPayload) => {
          this.NotificationsService.error(`Failed to retrieve the list of possible personas: ${error.data.message}`);
          this.$log.warn(`Failed to retrieve the list of possible personas: ${error.data.message}`);
          this.loading = false;
        }
      );
    }

    public switchPersona(persona:IPersona):void {
      this.currentPersona = persona;
      this.$rootScope.$broadcast('SwitchedPersona', persona);
    }
  }

  _module.controller('HawkularAccounts.PersonaController', PersonaController);
}
