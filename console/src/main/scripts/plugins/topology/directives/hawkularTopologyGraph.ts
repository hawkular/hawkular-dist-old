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

/// <reference path='../../includes.ts'/>
/// <reference path='../ts/topologyGlobals.ts'/>
module HawkularTopology {
  _module.directive('hawkularTopologyGraph',
    () => {
      return {
        restrict: 'E',
        scope: {
          items: '=',
          relations: '=',
          kinds: '=',
          selection: '=',
          force: '='
        },
        link: ($scope: any, element: any, attributes: any) => {
          element.css('display', 'block');

          let graph;
          function notify(item) {
            let event = $scope.$emit('select', item);
            if (attributes['selection'] === undefined && !event.defaultPrevented) {
              graph.select(item);
            }
          }

          //function icon(d) {
          //  let text;
          //  let kinds = $scope.kinds;
          //  if (kinds) {
          //    text = kinds[d.item.kind];
          //  }
          //  return text || '';
          //}

          function weak(d) {
            let status = d.item.status;
            return status && status.phase && status.phase !== 'Running';
          }

          //function title(d) {
          //  return d.item.metadata.name;
          //}

          function render(args) {
            let vertices = args[0];
            let added = args[1];
            let event = $scope.$emit('render', vertices, added);
            if (!event.defaultPrevented) {
              added.attr('class', (d) => d.item.kind);
              added.append('circle').attr('r', 15);

              // _.partition doesn't work for d3
              const servers = added.filter((d) => d.item.kind === 'Server');
              const others = added.filter((d) => d.item.kind !== 'Server');

              servers.append('image').attr('xlink:href', 'resources/img/wildfly_logomark.svg')
                .attr('y', -12).attr('x', -12).attr('height', '25px').attr('width', '25px');
              others.append('text').attr('y', 6).attr('x', 0.5).text((d) => $scope.kinds[d.item.kind]);

              added.append('title');
              vertices.selectAll('title')
                .text((d) => d.item.metadata.name);
              vertices.classed('weak', weak);
            }
          }

          graph = HawkularTopology.initGraph(element[0], $scope.force, notify);

          $scope.$watchCollection('kinds', (value) => render(graph.kinds(value)));

          $scope.$watchGroup(['items', 'relations'], (values) => render(graph.data(values[0], values[1])));

          $scope.$watch('selection', (item) => graph.select(item));

          element.on('$destroy', () => graph.close());
        }
      };
    }
  );
}
