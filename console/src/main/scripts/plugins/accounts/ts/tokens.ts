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
  export class TokensController {
    public static $inject = [
      '$window', '$rootScope', '$scope',
      '$modal', '$log', 'HawkularAccount', 'NotificationsService'
    ];
    public tokens: Array<IToken>;
    public personas: Array<IPersona>;
    public editState: { [id: string]: EditState; } = {};
    public tokensToUpdate: { [id: string]: PersistenceState; } = {};
    public newNames: { [id: string]: string; } = {};
    public newDescriptions: { [id: string]: string; } = {};
    public newExpirations: { [id: string]: string; } = {};
    public loading: boolean = true;

    constructor(private $window: any,
      private $rootScope: any,
      private $scope: any,
      private $modal: any,
      private $log: ng.ILogService,
      private HawkularAccount: any,
      private NotificationsService: INotificationsService) {
      this.prepareListeners();
      this.loadData();
    }

    public prepareListeners() {
      this.$rootScope.$on('SwitchedPersona', () => {
        this.loadData();
      });
    }

    public loadData(): void {
      this.loading = true;
      this.tokens = this.HawkularAccount.Token.query({},
        (response: Array<IToken>) => {
          this.personas = this.HawkularAccount.Persona.query({},
            (response: Array<IPersona>) => {
              this.loading = false;
            }, (error: IErrorPayload) => {
              let message = `Failed to retrieve the list of possible personas: ${error.data.message}`;
              this.NotificationsService.error(message);
              this.$log.warn(message);
              this.loading = false;
            }
          );
        }, (error: IErrorPayload) => {
          this.$log.warn(`List of tokens could NOT be retrieved: ${error.data.message}`);
          this.NotificationsService.warning(`List of tokens could NOT be retrieved: ${error.data.message}`);
          this.loading = false;
        }
      );
    }

    public create(): void {
      this.$window.location.href = '/secret-store/v1/tokens/create?'
        + 'scope=offline_access&'
        + 'Hawkular-Persona=' + encodeURI(this.$rootScope.currentPersona.id);
    }

    public personaForToken(token: IToken): string {
      if (this.loading) {
        // we return the key, as the page has not finished loading yet, so, we might not have access to the current
        // persona, as it's required on further steps
        return token.key;
      }

      let id = token.attributes['Hawkular-Persona'];
      if (id == null) { // null or undefined?
        this.$log.debug('id is null, assigning the principal as ID');
        id = token.principal;
      }

      if (id === this.$rootScope.currentPersona.id) {
        return this.$rootScope.currentPersona.name;
      }

      let personaName = id;
      angular.forEach(this.personas, (persona: IPersona) => {
        if (persona.id === id) {
          personaName = persona.name;
        }
      });

      return personaName;
    }

    public revoke(token: IToken): void {
      this.$modal.open({
        controller: 'HawkularAccounts.TokenRevokeController as removeModal',
        templateUrl: 'plugins/accounts/html/token-revoke-modal.html',
        resolve: {
          token: () => token
        }
      })
        .result
        .then(() => {
          token.$remove({}, () => {
            this.NotificationsService.success('Token successfully revoked.');
            this.tokens.splice(this.tokens.indexOf(token), 1);
          }, (error: IErrorPayload) => {
            let message = `Failed to revoke the token ${token.key}: ${error.data.message}`;
            this.$log.warn(message);
            this.NotificationsService.error(message);
          });
        });
    }

    public showQRCode(token: IToken): void {
      this.$modal.open({
        controller: 'HawkularAccounts.TokenQRCodeController as qrCodeModal',
        templateUrl: 'plugins/accounts/html/token-qrcode-modal.html',
        resolve: {
          token: () => token
        }
      });
    }

    public edit(token: IToken): void {
      this.newNames[token.key] = token.attributes['name'];
      this.newDescriptions[token.key] = token.attributes['description'];
      this.newExpirations[token.key] = token.expiresAt;
      this.editState[token.key] = EditState.EDIT;
    }

    public discard(token: IToken): void {
      this.newNames[token.key] = '';
      this.newDescriptions[token.key] = '';
      this.newExpirations[token.key] = '';
      this.editState[token.key] = EditState.READ;
    }

    public confirm(token: IToken): void {
      token.attributes['name'] = this.newNames[token.key];
      token.attributes['description'] = this.newDescriptions[token.key];

      // this datepicker has a different context as Angular, so, binding doesn't work here...
      let date = $(`#dateFor${token.key}`).val();
      if (date) {
        let offset = new Date().getTimezoneOffset() * 60 * 1000; // getTimezoneOffset is in minutes
        let d = new Date((new Date(date).valueOf() + offset));
        token.expiresAt = d.toISOString();
      }
      this.newNames[token.key] = '';
      this.newDescriptions[token.key] = '';
      this.editState[token.key] = EditState.READ;

      token.$update(null, (response: IToken) => {
        this.tokensToUpdate[token.key] = PersistenceState.SUCCESS;
      }, (error: IErrorPayload) => {
        this.tokensToUpdate[token.key] = PersistenceState.ERROR;
        this.$log.debug(`Error changing the name for token ${token.key}. Response: ${error.data.message}`);
      });
    }

    public inEditMode(token: IToken): boolean {
      return this.editState[token.key] === EditState.EDIT;
    }
  }

  export class TokenRevokeController {
    public static $inject = ['$scope', '$modalInstance', 'token'];

    constructor(private $scope: any,
      private $modalInstance: any,
      private token: IToken) {
    }

    public cancel(): void {
      this.$modalInstance.dismiss('cancel');
    }

    public revoke(): void {
      this.$modalInstance.close();
    }
  }

  export class TokenQRCodeController {
    public static $inject = ['$scope', '$modalInstance', 'token'];

    constructor(private $scope: any,
      private $modalInstance: any,
      private token: IToken) {
    }

    public close(): void {
      this.$modalInstance.dismiss('close');
    }
  }

  _module.controller('HawkularAccounts.TokensController', TokensController);
  _module.controller('HawkularAccounts.TokenRevokeController', TokenRevokeController);
  _module.controller('HawkularAccounts.TokenQRCodeController', TokenQRCodeController);
}
