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
    'hawkular.services', 'ui.bootstrap', 'topbar', 'patternfly.select', 'angular-momentjs', 'angular-md5', 'toastr',
    'hawkular-components']);

  _module.config(['$httpProvider', '$locationProvider', '$routeProvider',
    ($httpProvider, $locationProvider) => {
    $locationProvider.html5Mode(true);
  }]);

  _module.config(['$routeProvider', ($routeProvider) => {
    $routeProvider.
      // this was for single page.. remove ?
      when('/hawkular/:resourceId/:timeOffset?/:endTime?', {templateUrl: 'plugins/metrics/html/single-page.html'}).
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
      when('/hawkular-ui/url/url-list', {templateUrl: 'plugins/metrics/html/url-list.html'}).
      when('/hawkular-ui/url/response-time/:resourceId/:timeOffset?/:endTime?', {
        templateUrl: 'plugins/metrics/html/response-time.html',
        reloadOnSearch: false,
        resolve: {
          resource: function ($route, $location, HawkularInventory, NotificationsService:INotificationsService) {
            var p = HawkularInventory.Resource.get({environmentId: globalEnvironmentId,
              resourceId: $route.current.params.resourceId}).$promise;
            p.then((response:any) => {
                return response.properties.url;
              },
              (error) => {
                NotificationsService.info('You were redirected to this page because you requested an invalid URL.');
                $location.path('/');
              });
            return p;
          }
        }
      }).
      when('/hawkular-ui/url/availability/:resourceId/:timeOffset?/:endTime?', {
        templateUrl: 'plugins/metrics/html/availability.html',
        reloadOnSearch: false,
        resolve: {
          resource: function ($route, $location, HawkularInventory, NotificationsService:INotificationsService) {
            var p = HawkularInventory.Resource.get({environmentId: globalEnvironmentId,
              resourceId: $route.current.params.resourceId}).$promise;
            p.then((response:any) => {
                return response.properties.url;
              },
              (error) => {
                NotificationsService.info('You were redirected to this page because you requested an invalid URL.');
                $location.path('/');
              });
            return p;
          }
        }
      }).
      when('/hawkular-ui/url/alerts/:resourceId/:timeOffset?/:endTime?', {
        templateUrl: 'plugins/metrics/html/alerts.html',
        reloadOnSearch: false,
        resolve: {
          resource: function ($route, $location, HawkularInventory, NotificationsService:INotificationsService) {
            var p = HawkularInventory.Resource.get({environmentId: globalEnvironmentId,
              resourceId: $route.current.params.resourceId}).$promise;
            p.then((response:any) => {
                return response.properties.url;
              },
              (error) => {
                NotificationsService.info('You were redirected to this page because you requested an invalid URL.');
                $location.path('/');
              });
            return p;
          }
        }
      }).
      when('/hawkular-ui/app/app-list', {templateUrl: 'plugins/metrics/html/app-server-list.html'}).
      when('/hawkular-ui/app/app-details/:resourceId/:tabId/:timeOffset?/:endTime?', {
        templateUrl: 'plugins/metrics/html/app-details/app-server-details.html',
        reloadOnSearch: false,
        resolve: {
          resource: function ($route, $location, HawkularInventory, NotificationsService:INotificationsService) {
            var redirectMissingAppServer = function() {
              NotificationsService.info('You were redirected to this page because you requested an invalid ' +
                  'Application Server.');
              $location.path('/hawkular-ui/app/app-list');
            };
            var checkAppServerExists = function() {
              var idParts = $route.current.params.resourceId.split('~');
              if (idParts.length !== 2) {
                redirectMissingAppServer();
                return;
              }
              var p = HawkularInventory.FeedResource.get({
                environmentId: globalEnvironmentId,
                feedId: idParts[0],
                resourceId: $route.current.params.resourceId + '~/'
              }).$promise;
              p.then((response) => {
                  return response;
                },
                (error) => redirectMissingAppServer()
              );
              return p;
            };
            return checkAppServerExists();
          }
        }
      }).
      otherwise({redirectTo: '/hawkular-ui/url/url-list'});
  }]);

  hawtioPluginLoader.addModule(HawkularMetrics.pluginName);
}
