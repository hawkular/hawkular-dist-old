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

/// <reference path='../../includes.ts'/>
/// <reference path='../ts/topologyGlobals.ts'/>

module HawkularTopology {
  _module.directive('hawkularTopologyIcon', () => {
    return {
      restrict: 'E',
      transclude: true,
      template: '<ng-transclude></ng-transclude>',
      link: ($scope, element, attrs) => {
        var kind = attrs.kind;
        var value = $scope.vm.kinds[kind];

        $scope.$watchCollection('kinds', () => element.toggleClass('active', kind in $scope.vm.kinds));

        element.on('click', () => {
          if (kind in $scope.vm.kinds) {
            value = $scope.vm.kinds[kind];
            delete $scope.vm.kinds[kind];
          } else {
            $scope.vm.kinds[kind] = value;
          }
          if ($scope.$parent) {
            $scope.$parent.$digest();
          }
          if ($scope.$root) {
            $scope.$root.$digest();
          }
          $scope.$digest();
        });
      }
    };
  });
}
