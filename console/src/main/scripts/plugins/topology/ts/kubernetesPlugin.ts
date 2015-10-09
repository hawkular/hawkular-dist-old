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
/// <reference path='topologyGlobals.ts'/>

module HawkularTopology {

  _module.directive('kubernetesTopologyGraph', [
    function() {
      return {
        restrict: 'E',
        scope: {
          items: '=',
          relations: '=',
          kinds: '=',
          selection: '=',
          force: '='
        },
        link: function($scope, element, attributes) {
          element.css('display', 'block');

          var graph;
          function notify(item) {
            var event = $scope.$emit('select', item);
            if (attributes['selection'] === undefined && !event.defaultPrevented) {
              graph.select(item);
            }
          }

          function icon(d) {
            var text;
            var kinds = $scope.$root.kinds;
            if (kinds) {
              text = kinds[d.item.kind];
            }
            return text || '';
          }

          function weak(d) {
            var status = d.item.status;
            if (status && status.phase && status.phase !== 'Running') {
              return true;
            }
            return false;
          }

          function title(d) {
            return d.item.metadata.name;
          }

          function render(args) {
            var vertices = args[0];
            var added = args[1];
            var event = $scope.$emit('render', vertices, added);
            if (!event.defaultPrevented) {
              added.attr('class', (d) => d.item.kind);
              added.append('use').attr('xlink:href', icon);
              added.append('title');
              vertices.selectAll('title')
              .text((d) => d.item.metadata.name);
              vertices.classed('weak', weak);
            }
          }

          graph = window['topology_graph'](element[0], $scope.force, notify);

          /* If there's a kinds in the current scope, watch it for changes */
          $scope.$root.$watchCollection('kinds', function(value) {
            render(graph.kinds(value));
          });

          $scope.$watchCollection('[items, relations]', function(values) {
            render(graph.data(values[0], values[1]));
          });

          /* Watch the selection for changes */
          $scope.$watch('selection', function(item) {
            graph.select(item);
          });

          element.on('$destroy', function() {
            graph.close();
          });
        }
      };
    }
    ])

.directive('kubernetesTopologyIcon',
  function() {
    return {
      restrict: 'E',
      transclude: true,
      template: '<ng-transclude></ng-transclude>',
      link: function($scope, element, attrs) {
        var kind = attrs.kind;
        var value = $scope.kinds[kind];

        $scope.$root.$watchCollection('kinds', function() {
          element.toggleClass('active', kind in $scope.$root.kinds);
        });

        element.on('click', function() {
          if (kind in $scope.$root.kinds) {
            value = $scope.$root.kinds[kind];
            delete $scope.$root.kinds[kind];
          } else {
            $scope.$root.kinds[kind] = value;
          }
          if ($scope.$parent) {
            $scope.$parent.$digest();
          }
          $scope.$digest();
        });
      }
    };
  });
}
