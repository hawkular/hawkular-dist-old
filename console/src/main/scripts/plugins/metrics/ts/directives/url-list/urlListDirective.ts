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

/// <reference path="../../metricsPlugin.ts"/>
/// <reference path="../../../includes.ts"/>
module HawkularMetrics {

  let itemLink = (scope:any, element:ng.IAugmentedJQuery, attrs:ng.IAttributes) => {
    if (typeof scope.alerts === 'undefined') {
      scope.alerts = [];
    }
    scope.$on('$destroy', () => {
      scope.vm.destroy();
    });
  };

  export class SummaryDirective implements ng.IDirective {
    public replace:boolean = true;
    public scope = {
      resourceList: '=',
      deleteResource: '&'
    };
    public templateUrl = 'plugins/metrics/html/directives/url-list/summary.html';
    public static Factory() {
      let directive = () => {
        return new SummaryDirective();
      };
      directive['$inject'] = [];

      return directive;
    }
  }

  export class ItemDirective implements ng.IDirective {
    public link = itemLink;
    public replace:boolean = true;
    public scope = {};
    public controller = UrlItemController;
    public controllerAs = 'vm';
    public bindToController = {
      resource: '=',
      deleteResource: '&'
    };
    public templateUrl = 'plugins/metrics/html/directives/url-list/item.html';
    public static Factory() {
      let directive = () => {
        return new ItemDirective();
      };

      directive['$inject'] = [];

      return directive;
    }
  }

  _module.directive('urlListSummary', [SummaryDirective.Factory()]);
  _module.directive('urlListItem', [ItemDirective.Factory()]);
}
