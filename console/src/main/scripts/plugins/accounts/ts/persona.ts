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

/// <reference path='accountsPlugin.ts'/>
module HawkularAccounts {
  export class PersonaController {
    public static $inject = ['$rootScope', '$scope', '$log', 'HawkularAccount', 'NotificationsService'];

    public personas: Array<IPersona>;
    public currentPersona: IPersona;
    public loading: boolean = true;

    constructor(private $rootScope: any,
      private $scope: any,
      private $log: ng.ILogService,
      private HawkularAccount: any,
      private NotificationsService: INotificationsService) {
      this.prepareListeners();
      this.loadData();
    }

    public prepareListeners(): void {
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

    public loadData(): void {
      this.loading = true;
      let personaToGet = 'current';

      let lastPersonaId = localStorage.getItem('lastPersona');
      if (null != lastPersonaId) {
        personaToGet = lastPersonaId;
      }

      this.loadAsCurrentPersona(personaToGet);
    }

    public loadAsCurrentPersona(personaId: string): void {
      this.$log.debug(`Persona ID to load: ${personaId}`);
      this.currentPersona = this.HawkularAccount.Persona.get({ id: personaId },
        (response: IPersona) => {
          if (response.id == null) {
            if (personaId === 'current') {
              // at this point, we were requested to get the personaId , but we got an empty response from the server...
              // there's not much we can do here, and it should never happen
              this.NotificationsService.error(`Failed to retrieve the current persona. Empty response.`);
              this.$log.warn(`Failed to retrieve the current persona. Empty response.`);
            } else {
              // fall back, load the 'current' user, which is the actual user, not a persona
              this.loadAsCurrentPersona('current');
            }
          } else {
            // we got the persona we wanted!
            this.$rootScope.$broadcast('CurrentPersonaLoaded', response);
          }
        }, (error: IErrorPayload) => {
          if (personaId === 'current') {
            this.NotificationsService.error(`Failed to retrieve the current persona: ${error.data.message}`);
            this.$log.warn(`Failed to retrieve the current persona: ${error.data.message}`);
          } else {
            // fall back, load the 'current' user, which is the actual user, not a persona
            this.loadAsCurrentPersona('current');
          }
        }
      );
    }

    public loadPersonas(): void {
      this.personas = this.HawkularAccount.Persona.query({},
        (response: Array<IPersona>) => {
          this.loading = false;
        }, (error: IErrorPayload) => {
          this.NotificationsService.error(`Failed to retrieve the list of possible personas: ${error.data.message}`);
          this.$log.warn(`Failed to retrieve the list of possible personas: ${error.data.message}`);
          this.loading = false;
        }
      );
    }

    public switchPersona(persona: IPersona): void {
      this.currentPersona = persona;
      this.$rootScope.$broadcast('SwitchedPersona', persona);
      localStorage.setItem('lastPersona', persona.id);
    }
  }

  _module.controller('HawkularAccounts.PersonaController', PersonaController);
}
