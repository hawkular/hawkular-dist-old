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

    export var PersonaController = _module.controller('HawkularAccounts.PersonaController', [
        '$rootScope', '$scope', '$log', 'HawkularAccount',
        ($rootScope, $scope, $log, HawkularAccount) => {
            $scope.personas = [];
            $scope.currentPersona = null;

            $scope.load = () => {
                $scope.loadCurrentPersona();
            };

            $scope.loadCurrentPersona = () => {
                $scope.currentPersona = HawkularAccount.Persona.get({id: 'current'},
                    () => {
                        $scope.$emit('CurrentPersonaLoaded', $scope.currentPersona);
                    },
                    () => {
                        $log.warn('Failed in retrieving the current persona');
                    }
                );
            };

            $scope.loadPersonas = () => {
                $scope.personas = HawkularAccount.Persona.query({},
                    () => {
                        $scope.personas = $scope.personas.filter((persona) => {
                            return persona.id !== $scope.currentPersona.id;
                        });
                        $scope.loading = false;
                    },
                    () => {
                        $log.warn('List of personas could NOT be retrieved.');
                        $scope.loading = false;
                    }
                );
            };

            $scope.switchPersona = (persona) => {
                $scope.personas.push($scope.currentPersona);
                $scope.currentPersona = persona;
                $scope.personas = $scope.personas.filter((persona) => {
                    return persona.id !== $scope.currentPersona.id;
                });
                $scope.$emit('SwitchedPersona', persona);
            };

            $rootScope.$on('CurrentPersonaLoaded', () => {
                $scope.loadPersonas();
            });

            $rootScope.$on('OrganizationCreated', () => {
                $scope.loadPersonas();
            });

            $rootScope.$on('OrganizationRemoved', () => {
                $scope.loadPersonas();
            });

            $scope.load();
        }]);
}
