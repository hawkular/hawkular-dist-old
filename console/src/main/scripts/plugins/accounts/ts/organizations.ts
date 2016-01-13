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
  export class OrganizationsController {
    public static $inject = ['$rootScope', '$scope', '$modal', '$log', 'HawkularAccount', 'NotificationsService'];

    public organizations:Array<IOrganization>;
    public joinRequests:Array<IJoinRequest>;
    public loading:boolean = true;
    public loadedJoinRequests:boolean = true;
    public loadedOrganizations:boolean = true;
    public isOrganization:boolean = false;
    public hasData:boolean = false;

    constructor(private $rootScope:any,
                private $scope:any,
                private $modal:any,
                private $log:ng.ILogService,
                private HawkularAccount:any,
                private NotificationsService:INotificationsService) {
      this.prepareListeners();
      this.loadData();

      if (this.$rootScope.currentPersona) {
        this.isOrganization = this.$rootScope.currentPersona.id !== this.$rootScope.userDetails.id;
      }
    }

    public prepareListeners() {
      this.$rootScope.$on('SwitchedPersona', (event:any, persona:IPersona) => {
        this.loadData();
        this.isOrganization = persona.id !== this.$rootScope.userDetails.id;
      });
    }

    public loadData():void {
      this.loading = true;

      this.joinRequests = this.HawkularAccount.OrganizationJoinRequest.query({}, (response:Array<IJoinRequest>) => {
        this.loadedJoinRequests = true;
        if (this.joinRequests.length > 0) {
          this.hasData = true;
        }
        this.$log.debug(`Loaded Join Requests`);
      }, (error:IErrorPayload) => {
        this.$log.debug(`Error loading the join requests for this user. Response: ${error.data.message}`);
      });

      this.organizations = this.HawkularAccount.Organization.query({},
        (response:Array<IOrganization>) => {
          if (this.organizations.length > 0) {
            this.hasData = true;
          }
          this.loadedOrganizations = true;
          this.loading = !(this.loadedJoinRequests && this.loadedOrganizations);
        }, (error:IErrorPayload) => {
          this.$log.warn(`List of organizations could NOT be retrieved: ${error.data.message}`);
          this.NotificationsService.warning(`List of organizations could NOT be retrieved: ${error.data.message}`);
          this.loading = false;
        }
      );
    }

    public showCreateForm():void {
      this.$modal.open({
        controller: 'HawkularAccounts.OrganizationNewController as newModal',
        templateUrl: 'plugins/accounts/html/organization-new.html'
      })
        .result
        .then((organization:IOrganization) => {
          this.hasData = true;
          this.NotificationsService.success('Organization successfully created.');
          this.organizations.unshift(organization);
        }, (error:IErrorPayload) => {
          this.NotificationsService.error(`Error while creating organization: ${error.data.message}`);
        });
    }

    public remove(organization:IOrganization):void {
      this.$modal.open({
        controller: 'HawkularAccounts.OrganizationRemoveController as removeModal',
        templateUrl: 'plugins/accounts/html/organization-remove-modal.html',
        resolve: {
          organization: () => organization
        }
      })
        .result
        .then(() => {
          organization.$remove({}, () => {
            this.NotificationsService.success('Organization successfully deleted.');
            this.$rootScope.$broadcast('OrganizationRemoved');
            this.organizations.splice(this.organizations.indexOf(organization), 1);
            this.hasData = this.joinRequests.length > 0 || this.organizations.length > 0;
          }, (error:IErrorPayload) => {
            let message = `Failed to remove the organization ${organization.name}: ${error.data.message}`;
            this.$log.warn(message);
            this.NotificationsService.error(message);
          });
        });
    }
  }

  export class OrganizationNewController {
    public organizationNew:IOrganization;

    public static $inject = ['$rootScope', '$scope', '$modalInstance', '$log', 'HawkularAccount'];

    constructor(private $rootScope:any,
                private $scope:any,
                private $modalInstance:any,
                private $log:ng.ILogService,
                private HawkularAccount:any) {
      this.organizationNew = new HawkularAccount.Organization();
    }

    public cancel():void {
      this.$modalInstance.dismiss('cancel');
    }

    public persist():void {
      this.organizationNew.$save({},
        (organization:IOrganization) => {
          this.$rootScope.$broadcast('OrganizationCreated');
          this.$modalInstance.close(organization);
        }, (error:IErrorPayload) => {
          this.$log.debug(`Organization could NOT be added: ${error.data.message}`);
          this.$modalInstance.dismiss(error);
        });
    }
  }

  export class OrganizationRemoveController {
    public static $inject = ['$scope', '$modalInstance', 'organization'];

    constructor(private $scope:any,
                private $modalInstance:any,
                private organization:IOrganization) {
    }

    public cancel():void {
      this.$modalInstance.dismiss('cancel');
    }

    public remove():void {
      this.$modalInstance.close();
    }
  }

  _module.controller('HawkularAccounts.OrganizationsController', OrganizationsController);
  _module.controller('HawkularAccounts.OrganizationNewController', OrganizationNewController);
  _module.controller('HawkularAccounts.OrganizationRemoveController', OrganizationRemoveController);
}
