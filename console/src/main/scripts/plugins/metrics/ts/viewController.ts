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

/// <reference path="metricsPlugin.ts"/>
/// <reference path="../../includes.ts"/>

module HawkularMetrics {

  export class ViewContainerController {
    public viewClass: string;
    constructor(private $scope: any,
                private $rootScope: any,
                private $location: ng.ILocationService
    ) {
      const viewClasses = {
        'explorer/view': 'container-fluid'
      };
      Object.freeze(viewClasses);
      $scope.$watch(() => {
          return $location.path();
        },
        (newLocation) => {
          this.changeViewClass(viewClasses, newLocation);
        });
    }

    private changeViewClass(viewClasses, newLocation) {
      let changed: boolean = false;
      _.forEach(Object.keys(viewClasses), (viewClass) => {
        if(newLocation.indexOf(viewClass) !== -1 && !changed) {
          changed = true;
          this.viewClass = viewClasses[viewClass];
        }
      });
      if (!changed) {
        this.viewClass = ViewContainerController.defaultClass;
      }
    }
    public static get defaultClass(): string { return 'container'; }
  }

  _module.controller('HawkularMetrics.ViewContainerController', ViewContainerController);
}
