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
    public static $inject = ['$log',
      '$rootScope',
      '$scope',
      '$routeParams',
      '$modal',
      'HawkularAccount',
      'NotificationsService'
    ];

    // backend data related to this controller
    public memberships:Array<IOrganizationMembership>;
    public organization:IOrganization;
    public pending:Array<IInvitation>;
    public role:IRole;
    public possibleRoles:Array<Role>;

    // state control, for easier UI consumption
    public loading:boolean;
    public foundOrganization:boolean;
    public isAllowedToInvite:boolean = false;
    public isAllowedToListPending:boolean = false;
    public isAllowedToTransferOrganization:boolean = false;
    public membershipsToUpdate:{ [id: string]: PersistenceState; } = {};

    constructor(private $log:ng.ILogService,
                private $rootScope:any,
                private $scope:any,
                private $routeParams:any,
                private $modal:any,
                private HawkularAccount:any,
                private NotificationsService:INotificationsService) {

      $log.debug('Loading memberships for this organization');
      this.loading = true;
      this.foundOrganization = false;
      this.loadData();
      this.possibleRoles = [
        new Role('Monitor'),
        new Role('Operator'),
        new Role('Maintainer'),
        new Role('Deployer'),
        new Role('Administrator'),
        new Role('Auditor'),
        new Role('SuperUser')
      ];
    }

    public loadData():void {
      let organizationId = this.$routeParams.organizationId;
      this.loadOrganization(organizationId);
      this.loadPermissionToInvite(organizationId);
      this.loadPermissionToListPending(organizationId);
      this.loadPermissionToTransferOrganization(organizationId);

      this.$rootScope.$on('OrganizationLoaded', () => {
        this.loadMemberships(organizationId);
      });

      this.$rootScope.$on('PermissionToListPendingLoaded', () => {
        if (this.isAllowedToListPending) {
          this.loadPendingInvitations(organizationId);
        }
      });
    }

    public loadOrganization(organizationId:string):void {
      this.organization = this.HawkularAccount.Organization.get({id: organizationId},
        () => {
          this.foundOrganization = true;
          this.$scope.$emit('OrganizationLoaded');
        },
        (error:IErrorPayload) => {
          this.NotificationsService.warning('Organization not found.');
          this.$log.warn(`Error while loading the organization: ${error.data.message}`);
          this.loading = false;
        }
      );
    }

    public loadMemberships(organizationId:string):void {
      this.memberships = this.HawkularAccount.OrganizationMembership.query({organizationId:organizationId},
        () => {
          this.loading = false;
          this.$log.debug(`Finished loading members. Size: ${this.memberships.length}`);
        },
        (error:IErrorPayload) => {
          this.NotificationsService.info('List of organizations could NOT be retrieved.');
          this.$log.warn(`List of organizations could NOT be retrieved: ${error.data.message}`);
          this.loading = false;
        }
      );
    }

    public loadPendingInvitations(organizationId:string):void {
      this.pending = this.HawkularAccount.OrganizationInvitation.query({organizationId:organizationId},
        () => {
          this.$log.debug(`Finished loading pending invitations. Size: ${this.pending.length}`);
        },
        (error:IErrorPayload) => {
          this.$log.debug(`Error while trying to load the pending invitations: ${error.data.message}`);
        }
      );
    }

    public loadPermissionToInvite(organizationId:string):void {
      const operationName:string = 'organization-invite';
      this.loadPermission(organizationId, operationName,
        (response:IPermissionResponse) => {
          this.isAllowedToInvite = response.permitted;
          this.$log.debug(`Finished checking if we can invite other users. Response: ${response.permitted}`);
        },
        (error:IErrorPayload) => {
          this.$log.debug(`Error checking if we can invite other users. Response: ${error.data.message}`);
        }
      );
    }

    public loadPermissionToListPending(organizationId:string):void {
      const operationName:string = 'organization-list-invitations';
      this.loadPermission(organizationId, operationName,
        (response:IPermissionResponse) => {
          this.isAllowedToListPending = response.permitted;
          this.$scope.$emit('PermissionToListPendingLoaded');
          this.$log.debug(`Finished checking if we can list the pending invitations. Response: ${response.permitted}`);
        },
        (error:IErrorPayload) => {
          this.$log.debug(`Error checking if we can list the pending invitations. Response: ${error.data.message}`);
        }
      );
    }

    public loadPermissionToTransferOrganization(organizationId:string):void {
      const operationName:string = 'organization-transfer';
      this.loadPermission(organizationId, operationName,
        (response:IPermissionResponse) => {
          this.isAllowedToTransferOrganization = response.permitted;
          this.$log.debug(`Finished checking if we can transfer this organization. Response: ${response.permitted}`);
        },
        (error:IErrorPayload) => {
          this.$log.debug(`Error checking if we can transfer this organization. Response: ${error.data.message}`);
        }
      );
    }

    public loadPermission(
      resourceId:string,
      operationName:string,
      successCallback: (response:IPermissionResponse) => void,
      errorCallback: (error:IErrorPayload) => void
    ):void {
      return this.HawkularAccount.Permission.get(
        {resourceId:resourceId, operation:operationName},
        successCallback,
        errorCallback
      );
    }

    public showInviteModal():void {
      let createFormModal = this.$modal.open({
        controller: 'HawkularAccounts.OrganizationInviteModalController as inviteModal',
        templateUrl: 'plugins/accounts/html/organization-invite.html'
      });

      createFormModal.result.then((emails:Array<string>) => {
        emails.forEach((email) => {
          let invitation:IInvitation = new Invitation(email, new Role('Monitor'));
          this.pending.unshift(invitation);
        });
      });

    }

    public changeRole(membership:IOrganizationMembership):void {
      this.membershipsToUpdate[membership.id] = PersistenceState.PERSISTING;

      membership.$update(null, (response:ISuccessPayload) => {
        this.membershipsToUpdate[membership.id] = PersistenceState.SUCCESS;
      }, (error:IErrorPayload) => {
        this.membershipsToUpdate[membership.id] = PersistenceState.ERROR;
        this.$log.debug(`Error changing role for membership. Response: ${error.data.message}`);
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
        this.$modalInstance.close(
          this.invitation.emails
            .split(/[,\s]/)
            .filter((entry:string) => {
              return entry && entry.length > 0;
            }
          )
        );
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
