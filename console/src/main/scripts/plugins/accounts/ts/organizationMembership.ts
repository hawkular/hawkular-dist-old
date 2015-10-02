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

  export class OrganizationMembershipController {
    public static $inject = ['$log', '$routeParams', '$modal', 'HawkularAccount', 'NotificationsService'];

    public loading:boolean;
    public foundOrganization:boolean;
    public memberships:Array<IPersona>;
    public organization:IOrganization;

    constructor(private $log:ng.ILogService,
                private $routeParams:any,
                private $modal:any,
                private HawkularAccount:any,
                private NotificationsService:INotificationsService) {

      $log.debug('Loading memberships for this organization');
      this.loading = true;
      this.foundOrganization = false;
      this.organization = HawkularAccount.Organization.get({id: $routeParams.organizationId},
        () => {
          this.foundOrganization = true;
          this.memberships = HawkularAccount.OrganizationMembership.query({organizationId:$routeParams.organizationId},
            () => {
              this.loading = false;
              $log.debug(`Finished loading members. Size: ${this.memberships.length}`);
            },
            () => {
              NotificationsService.info('List of organizations could NOT be retrieved.');
              $log.warn('List of organizations could NOT be retrieved.');
              this.loading = false;
            }
          );
        },
        () => {
          NotificationsService.warning('Organization not found.');
          $log.warn(`The requested organization doesn't exist: ${$routeParams.organizationId}`);
          this.loading = false;
        }
      );
    }

    public showInviteModal():void {
      let createFormModal = this.$modal.open({
        controller: 'HawkularAccounts.OrganizationInviteModalController as inviteModal',
        templateUrl: 'plugins/accounts/html/organization-invite.html'
      });

    }
  }

  export class OrganizationInviteModalController {
    public static $inject = ['$log', '$routeParams', '$modalInstance', 'HawkularAccount', 'NotificationsService'];
    public invitation:IInvitationRequest;

    constructor(private $log:ng.ILogService,
                private $routeParams:any,
                private $modalInstance:any,
                private HawkularAccount:any,
                private NotificationsService:INotificationsService) {
      this.invitation = new HawkularAccount.OrganizationInvitation({organizationId: $routeParams.organizationId});
    }

    public cancel():void {
      this.$modalInstance.dismiss('cancel');
    }

    public invite():void {
      this.invitation.$save(() => {
        this.NotificationsService.info('Your invitation was submitted.');
        this.$modalInstance.close('success');
      }, (error:IErrorPayload) => {
        this.NotificationsService.warning('An error occurred while trying to send the invitations.');
        this.$log.debug(`Error while trying to send invitations: ${error.data.message}`);
        this.$modalInstance.close('error');
      });
    }
  }

  _module.controller('HawkularAccounts.OrganizationMembershipController', OrganizationMembershipController);
  _module.controller('HawkularAccounts.OrganizationInviteModalController', OrganizationInviteModalController);
}
