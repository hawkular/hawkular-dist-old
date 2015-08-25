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

/// <reference path='accessPortalGlobals.ts'/>
module AccessPortal {
    export var _module = angular.module(AccessPortal.pluginName, ['ui.bootstrap']);

    _module.config([
      '$routeProvider', 'HawtioNavBuilderProvider',
      ($routeProvider, builder:HawtioMainNav.BuilderFactory) => {

      $routeProvider
        .when(
          '/hawkular-ui/access/search',
          {templateUrl: builder.join(AccessPortal.templatePath, 'search.html')}
        )
        .when(
          '/hawkular-ui/access/openCase',
          {templateUrl: builder.join(AccessPortal.templatePath, 'open_case.html')}
        )
        .when(
          '/hawkular-ui/access/myCases',
          {templateUrl: builder.join(AccessPortal.templatePath, 'my_cases.html')}
        );
    }]);

  export var AccessPortalMainController = _module.controller('AccessPortal.AccessPortalMainController', [
    '$window', ($window) => {
      var iframeHeight = parseInt($window.innerHeight) * 0.8;

      ['myCasesWindow', 'openCaseWindow', 'searchWindow'].forEach((iframeId) => {
        var iframeWindow = document.getElementById(iframeId);
        if (iframeWindow) {
          iframeWindow['height'] = iframeHeight + 'px';
        }
      });
    }]);

  hawtioPluginLoader.addModule(AccessPortal.pluginName);
}
