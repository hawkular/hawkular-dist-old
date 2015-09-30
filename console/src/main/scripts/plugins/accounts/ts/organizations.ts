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
  export var OrganizationsController = _module.controller('HawkularAccounts.OrganizationsController', [
    '$rootScope', '$scope', '$modal', '$log', '$location', 'HawkularAccount', 'NotificationsService',
    ($rootScope, $scope, $modal, $log, $location, HawkularAccount, NotificationsService) => {

      $scope.organizations = [];
      $scope.loading = true;
      $scope.isOrganization = false;

      $rootScope.$on('SwitchedPersona', (e, persona) => {
        $scope.isOrganization = persona.id !== $rootScope.userDetails.id;
      });

      $scope.load = () => {
        $scope.loadOrganizations();
      };

      $scope.loadOrganizations = () => {
        $scope.organizations = [];
        $scope.loading = true;
        $scope.organizations = HawkularAccount.Organization.query({},
          ()=> {
            $scope.loading = false;
          },
          () => {
            NotificationsService.info('List of organizations could NOT be retrieved.');
            $log.warn('List of organizations could NOT be retrieved.');
            $scope.loading = false;
          }
        );
      };

      $scope.showCreateForm = () => {
        var createFormModal = $modal.open({
          controller: 'HawkularAccounts.OrganizationNewController',
          templateUrl: 'plugins/accounts/html/organization-new.html'
        });

        createFormModal.result.then((organization) =>  {
          NotificationsService.info(`Organization ${organization.name} created`);
          $scope.organizations.unshift(organization);
        }, (type, error) => {
          if (type === 'error') {
            NotificationsService.error(`Error while creating organization: ${error.data.message}`);
            $log.info(`Modal dismissed with ERROR at: ${new Date()}`);
          } else {
            $log.info(`Modal dismissed at: ${new Date()}`);
          }
        });
      };

      $scope.remove = (organization) => {
        organization.$remove().then(
          () => {
            NotificationsService.info(`Organization ${organization.name} removed`);
            $scope.$emit('OrganizationRemoved');
            $scope.organizations.splice($scope.organizations.indexOf(organization), 1);
          }, (error) => {
            $log.warn('Error while trying to remove organization');
            $log.warn(error);
            NotificationsService.info(`Failed to remove the organization ${organization.name}: ${error.data.message}`);
          }
        );
      };

      $scope.load();

      $rootScope.$on('SwitchedPersona', () => {
        $scope.loadOrganizations();
      });
    }]);

  export var OrganizationNewController = _module.controller('HawkularAccounts.OrganizationNewController', [
    '$scope', '$modalInstance', '$log', '$location', 'HawkularAccount',
    ($scope, $modalInstance, $log, $location, HawkularAccount) => {

      $scope.organizationNew = new HawkularAccount.Organization({});

      $scope.cancel = () => {
        $modalInstance.dismiss('cancel');
      };

      $scope.persist = () => {
        $scope.organizationNew.$save({},
          () => {
            $scope.$emit('OrganizationCreated');
            $modalInstance.close($scope.organizationNew);
          },
          (e) => {
            // error
            $log.debug('Organization could NOT be added.');
            $modalInstance.dismiss('error', e);
          }
        );
        $log.debug('Trying to persist the organization');
      };
    }]);
}
