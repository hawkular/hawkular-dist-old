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
  export class OrganizationJoinController {
    public static $inject = ['$rootScope', '$scope', '$modal', '$log', 'HawkularAccount', 'NotificationsService'];

    public organizations: Array<IOrganization>;
    public loading: boolean = true;
    public isOrganization: boolean = false;
    public joinRequestsToSubmit: { [id: string]: PersistenceState; } = {};

    constructor(private $rootScope: any,
      private $scope: any,
      private $modal: any,
      private $log: ng.ILogService,
      private HawkularAccount: any,
      private NotificationsService: INotificationsService) {
      this.prepareListeners();
      this.loadData();

      if (this.$rootScope.currentPersona) {
        this.isOrganization = this.$rootScope.currentPersona.id !== this.$rootScope.userDetails.id;
      }
    }

    public prepareListeners() {
      this.$rootScope.$on('SwitchedPersona', (event: any, persona: IPersona) => {
        this.loadData();
        this.isOrganization = persona.id !== this.$rootScope.userDetails.id;
      });
    }

    public loadData(): void {
      this.loading = true;
      this.organizations = this.HawkularAccount.Organization.listToJoin({},
        (response: Array<IOrganization>) => {
          this.loading = false;
        }, (error: IErrorPayload) => {
          this.$log.warn(`List of organizations could NOT be retrieved: ${error.data.message}`);
          this.NotificationsService.warning(`List of organizations could NOT be retrieved: ${error.data.message}`);
          this.loading = false;
        }
      );
    }

    public joinRequest(organization: IOrganization): void {
      let joinRequest = new this.HawkularAccount.OrganizationJoinRequest();
      joinRequest.organization = organization;
      joinRequest.organizationId = organization.id;

      this.$modal.open({
        controller: 'HawkularAccounts.OrganizationJoinConfirmationController as joinModal',
        templateUrl: 'plugins/accounts/html/organization-join-modal.html',
        resolve: {
          joinRequest: () => joinRequest
        }
      })
        .result
        .then(() => {
          this.joinRequestsToSubmit[organization.id] = PersistenceState.PERSISTING;
          joinRequest.$save({}, () => {
            this.joinRequestsToSubmit[organization.id] = PersistenceState.SUCCESS;
            this.NotificationsService.success('Join request successfully submitted.');
            this.organizations.splice(this.organizations.indexOf(organization), 1);
          }, (error: IErrorPayload) => {
            this.joinRequestsToSubmit[organization.id] = PersistenceState.ERROR;
            let message = `Failed to send join request to the organization ${organization.name}: ${error.data.message}`;
            this.$log.warn(message);
            this.NotificationsService.error(message);
          });
        });
    }
  }

  export class OrganizationJoinConfirmationController {
    public static $inject = ['$scope', '$modalInstance', 'joinRequest'];

    constructor(private $scope: any,
      private $modalInstance: any,
      private joinRequest: IJoinRequest) {
    }

    public cancel(): void {
      this.$modalInstance.dismiss('cancel');
    }

    public submit(): void {
      this.$modalInstance.close();
    }
  }

  _module.controller('HawkularAccounts.OrganizationJoinController', OrganizationJoinController);
  _module.controller('HawkularAccounts.OrganizationJoinConfirmationController', OrganizationJoinConfirmationController);
}
