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

/// <reference path="../../includes.ts"/>
/// <reference path="metricsGlobals.ts"/>

module HawkularMetrics {

  export var _module = angular.module(HawkularMetrics.pluginName, ['ngResource', 'ui.select', 'hawkularCharts',
    'hawkular.services', 'ui.bootstrap', 'topbar', 'patternfly.select', 'angular-momentjs', 'angular-md5']);

  var metricsTab:any;

  _module.config(['$httpProvider', '$locationProvider', '$routeProvider', 'HawtioNavBuilderProvider', ($httpProvider, $locationProvider, $routeProvider:ng.route.IRouteProvider, navBuilder:HawtioMainNav.BuilderFactory) => {

    metricsTab = navBuilder.create()
      .id(HawkularMetrics.pluginName)
      .title(() => 'Metrics')
      .href(() => '/metrics')
      .subPath('Add Url', 'add-url', navBuilder.join(HawkularMetrics.templatePath, 'add-url.html'))
      .subPath('Response Time', 'response-time', navBuilder.join(HawkularMetrics.templatePath, 'response-time.html'))
      .subPath('Availability', 'availability', navBuilder.join(HawkularMetrics.templatePath, 'availability.html'))
      .subPath('Alerts', 'alerts', navBuilder.join(HawkularMetrics.templatePath, 'alerts.html'))
      .build();

    navBuilder.configureRouting($routeProvider, metricsTab);

    $locationProvider.html5Mode(true);
  }]);

  _module.run(['HawtioNav', (HawtioNav:HawtioMainNav.Registry) => {
    HawtioNav.add(metricsTab);
    log.debug('loaded Metrics Plugin');
  }]);

  ///@todo: move this someplace common
  _module.directive('hkEnter', () => {
    return function (scope, element, attrs) {
      element.bind('keydown keypress', (event) => {
        if (event.which === 13) {
          scope.$apply(() => {
            scope.$eval(attrs.hkEnter);
          });

          event.preventDefault();
        }
      });
    };
  });

  _module.config(["$routeProvider", ($routeProvider) => {
    $routeProvider.
        // this was for single page.. remove ?
        when('/hawkular/:resourceId/:timeOffset?/:endTime?', {templateUrl: 'plugins/metrics/html/single-page.html'}).
        when('/metrics/response-time', {templateUrl: 'plugins/metrics/html/response-time.html',
        resolve: {
          hkResourceList : function($filter, $location, $q, HawkularInventory) {
            var resPromise = HawkularInventory.Resource.query({tenantId: globalTenantId, environmentId: globalEnvironmentId}).$promise;
            resPromise.then(function(hkResourceList){
              $location.path('/metrics/response-time/' + hkResourceList[0].id);
            }, function(){
              $location.url('/error');
            });

            // Returning a promise which would never be resolved, so that the page would not render.
            // The page will be redirected before rendering based on the resource list loaded above.
            return $q.defer().promise;
          }
        }}).
        when('/hawkular-ui/url/url-list', { templateUrl: 'plugins/metrics/html/add-url.html'}).
        when('/hawkular-ui/url/response-time/:resourceId/:timeOffset?/:endTime?', {templateUrl: 'plugins/metrics/html/response-time.html'}).
        when('/hawkular-ui/url/availability/:resourceId/:timeOffset?/:endTime?', {templateUrl: 'plugins/metrics/html/availability.html'}).
        when('/hawkular-ui/url/alerts/:resourceId/:timeOffset?/:endTime?', {templateUrl: 'plugins/metrics/html/alerts.html'}).

        when('/hawkular-ui/app/app-list', { templateUrl: 'plugins/metrics/html/app-server-list.html' }).
        when('/hawkular-ui/app/app-details/:resourceId/:timeOffset?/:endTime?', { templateUrl: 'plugins/metrics/html/app-server-details.html', resolve: { hideSubNav: function() { return true; } } }).
        otherwise({redirectTo: '/hawkular-ui/url/url-list'});
  }]);

  hawtioPluginLoader.addModule(HawkularMetrics.pluginName);
}
