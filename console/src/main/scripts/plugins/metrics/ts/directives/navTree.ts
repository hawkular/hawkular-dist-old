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

/// <reference path="../metricsPlugin.ts"/>
/// <reference path="../../includes.ts"/>

module HawkularMetrics {
  export class HkNavTreeDirective {
    public link = (scope: any, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => {
      angular.element(document).ready(function () {
        scope.$slider = $(element)['treeview']({
          collapseIcon: 'fa fa-angle-down',
          data: scope.treeData,
          expandIcon: 'fa fa-angle-right',
          emptyIcon: 'fa fa-file',
          showIcon: false,
          levels: 1,
          onNodeSelected: (event, data) => {
            scope.onNodeSelected({branch: data});
          },
          showBorder: false
        });
      });
    };
    public template = '<div></div>';
    public replace = 'true';
    public scope = {
      treeData: '=',
      onNodeSelected: '&'
    };

    public static Factory() {
      let directive = () => {
        return new HkNavTreeDirective();
      };

      directive['$inject'] = [];

      return directive;
    }
  }

  _module.directive('hkBootNavTree', [HkNavTreeDirective.Factory()]);
}
