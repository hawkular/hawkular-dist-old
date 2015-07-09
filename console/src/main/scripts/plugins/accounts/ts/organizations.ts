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
        '$rootScope', '$scope', '$log', '$location', 'HawkularAccount',
        ($rootScope, $scope, $log, $location, HawkularAccount) => {

            $scope.organizations = [];
            $scope.loading = true;

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
                        $log.warn('List of organizations could NOT be retrieved.');
                        $scope.loading = false;
                    }
                );
            };
            $scope.showCreateForm = () => {
                $location.path('/accounts/organizations/new');
            };
            $scope.remove = (organization) => {
                organization.$remove().then(
                    () => {
                        $scope.$emit('OrganizationRemoved');
                        $scope.organizations.splice($scope.organizations.indexOf(organization), 1);
                    }
                );
            };

            $scope.load();

            $rootScope.$on('SwitchedPersona', () => {
                $scope.loadOrganizations();
            });
        }]);

    export var OrganizationNewController = _module.controller('HawkularAccounts.OrganizationNewController', [
        '$scope', '$log', '$location', 'HawkularAccount',
        ($scope, $log, $location, HawkularAccount) => {

            $scope.organizationNew = new HawkularAccount.Organization({});
            $scope.persist = () => {
                $scope.organizationNew.$save({},
                    () => {
                        $scope.$emit('OrganizationCreated');
                        $location.path('/accounts/organizations');
                    },
                    () => {
                        // error
                        $log.debug('Organization could NOT be added.');
                    }
                );
                $log.debug('Trying to persist the organization');
            };
        }]);
}
