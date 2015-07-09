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
/// <reference path='metricsGlobals.ts'/>

module HawkularMetrics {

    export var _module = angular.module(HawkularMetrics.pluginName, ['ngResource', 'ui.select', 'hawkular.charts',
        'hawkular.services', 'ui.bootstrap', 'topbar', 'patternfly.select', 'angular-momentjs', 'angular-md5']);

    var metricsTab:any;

    _module.config(['$httpProvider', '$locationProvider', '$routeProvider', 'HawtioNavBuilderProvider',
        ($httpProvider, $locationProvider, $routeProvider:ng.route.IRouteProvider,
         navBuilder:HawtioMainNav.BuilderFactory) => {

        metricsTab = navBuilder.create()
            .id(HawkularMetrics.pluginName)
            .title(() => 'Metrics')
            .href(() => '/metrics')
            .subPath('Add Url', 'add-url', navBuilder.join(HawkularMetrics.templatePath, 'add-url.html'))
            .subPath('Response Time', 'response-time', navBuilder.join(HawkularMetrics.templatePath,
                'response-time.html'))
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

    _module.filter('firstUpper', function () {
        return function (input, all) {
            return (!!input) ? input.replace(/([^\W_]+[^\s-]*) */g, function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1);
            }) : '';
        };
    });

    /**
     * Replicates AngularJS 1.4 limitTo filter
     */
    _module.filter('limitTo14', function () {
      return function(input, limit, begin) {
        if (Math.abs(Number(limit)) === Infinity) {
          limit = Number(limit);
        } else {
          limit = parseInt(limit, 10);
        }
        if (isNaN(limit)) { return input; }

        if (typeof input === 'number') { input = input.toString(); }
        if (!Array.isArray(input) && !(typeof input === 'string')) { return input; }

        begin = (!begin || isNaN(begin)) ? 0 : parseInt(begin, 10);
        begin = (begin < 0 && begin >= -input.length) ? input.length + begin : begin;

        if (limit >= 0) {
          return input.slice(begin, begin + limit);
        } else {
          if (begin === 0) {
            return input.slice(limit, input.length);
          } else {
            return input.slice(Math.max(0, begin + limit), begin);
          }
        }
      };
    });

    _module.filter('urlEncode', function () {
        return window['encodeURIComponent'];
    });

    _module.config(['$routeProvider', ($routeProvider) => {
        $routeProvider.
            // this was for single page.. remove ?
            when('/hawkular/:resourceId/:timeOffset?/:endTime?',
            {templateUrl: 'plugins/metrics/html/single-page.html'}).
            when('/metrics/response-time', {
                templateUrl: 'plugins/metrics/html/response-time.html',
                resolve: {
                    hkResourceList: function ($filter, $location, $rootScope, $q, HawkularInventory) {
                        var resPromise = HawkularInventory.Resource.query({
                            environmentId: globalEnvironmentId
                        }).$promise;
                        resPromise.then(function (hkResourceList) {
                            $location.path('/metrics/response-time/' + hkResourceList[0].id);
                        }, function () {
                            $location.url('/error');
                        });

                        // Returning a promise which would never be resolved, so that the page would not render.
                        // The page will be redirected before rendering based on the resource list loaded above.
                        return $q.defer().promise;
                    }
                }
            }).
            when('/hawkular-ui/url/url-list', {templateUrl: 'plugins/metrics/html/add-url.html'}).
            when('/hawkular-ui/url/response-time/:resourceId/:timeOffset?/:endTime?',
            {templateUrl: 'plugins/metrics/html/response-time.html'}).
            when('/hawkular-ui/url/availability/:resourceId/:timeOffset?/:endTime?',
            {templateUrl: 'plugins/metrics/html/availability.html'}).
            when('/hawkular-ui/url/alerts/:resourceId/:timeOffset?/:endTime?',
            {templateUrl: 'plugins/metrics/html/alerts.html'}).

            when('/hawkular-ui/app/app-list', {templateUrl: 'plugins/metrics/html/app-server-list.html'}).
            when('/hawkular-ui/app/app-details/:resourceId/:tabId/:timeOffset?/:endTime?', {
                templateUrl: 'plugins/metrics/html/app-details/app-server-details.html',
                resolve: {
                    hideSubNav: function () {
                        return true;
                    }
                }
            }).
            otherwise({redirectTo: '/hawkular-ui/url/url-list'});
    }]);

    hawtioPluginLoader.addModule(HawkularMetrics.pluginName);
}
