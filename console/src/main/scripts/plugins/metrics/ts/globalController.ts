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

/// <reference path="metricsPlugin.ts"/>
/// <reference path="../../includes.ts"/>

module HawkularMetrics {

  export class GlobalController {

    public static  $inject = ['$scope', '$log', '$rootScope', '$routeParams', '$location'];

    /**
     * Enable for experimental features.
     * Should be able to access anywhere by 'global.isExperimental()'
     */
    public isExperimental = false;

    constructor(private $scope:any,
                private $log:ng.ILogService,
                private $rootScope:IHawkularRootScope,
                private $routeParams:any,
                private $location:ng.ILocationService) {
      $scope.global = this;

    }

    public experimentalMode():void {
      this.$log.info('Starting Experimintal Mode');
      this.isExperimental = true;
    }
  }

  _module.controller('GlobalController', GlobalController);
}


