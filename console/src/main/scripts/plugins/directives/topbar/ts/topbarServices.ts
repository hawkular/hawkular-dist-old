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
/// <reference path="topbarGlobals.ts"/>
/// <reference path="topbarPlugin.ts"/>
module Topbar {

  export class HawkularNav {

    public static $inject = ['$rootScope', '$route', '$routeParams', 'HawkularInventory'];


    constructor(private $rootScope:any,
                private $route:any,
                private $routeParams:any,
                private HawkularInventory:any) {
      $rootScope.hkParams = $routeParams || [];

      // default time period set to 12 hours
      let defaultOffset = 12 * 60 * 60 * 1000;

      let init = (tenantId?:string) => {
        HawkularInventory.Resource.query({environmentId: globalEnvironmentId}, (resourceList) => {
          $rootScope.hkResources = resourceList;
          for (var i = 0; i < resourceList.length; i++) {
            if (resourceList[i].id === $rootScope.hkParams.resourceId) {
              $rootScope.selectedResource = resourceList[i];
            }
          }
        });

        $rootScope.hkParams.timeOffset = $routeParams.timeOffset || $rootScope.hkParams.timeOffset || defaultOffset;
        $rootScope.hkEndTimestamp = $routeParams.endTimestamp || +moment();
        $rootScope.hkStartTimestamp = moment().subtract($rootScope.hkParams.timeOffset, 'milliseconds').valueOf();

        $rootScope.$on('$routeChangeSuccess', (event, current, previous) => {

          // store any routeParams inside hkParams
          let newHkParams = current.params;
          newHkParams.timeOffset = $routeParams.timeOffset || $rootScope.hkParams.timeOffset || defaultOffset;
          newHkParams.hkEndTimestamp = $routeParams.endTimestamp || $rootScope.hkParams.hkEndTimestamp || +moment();
          newHkParams.hkStartTimestamp = moment().subtract($rootScope.hkParams.timeOffset, 'milliseconds').valueOf();

          $rootScope.hkParams = newHkParams;
        }, this);
      };
      let tenantId = this.$rootScope.currentPersona && this.$rootScope.currentPersona.id;
      if (tenantId) {
        init(tenantId);
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) => currentPersona && init(currentPersona.id));
      }
    }

    public setTimestamp(offset:number, end ?:number) {
      this.$route.updateParams({timeOffset: offset, endTime: end});
      this.$rootScope.hkParams.timeOffset = offset;
      this.$rootScope.hkEndTimestamp = end;
      this.$rootScope.hkStartTimestamp = moment().subtract(this.$rootScope.hkParams.timeOffset,
        'milliseconds').valueOf();
    }

    public setTimestampStartEnd(start:number, end:number) {
      let offset = end - start;
      this.$route.updateParams({timeOffset: offset, endTime: end});
      this.$rootScope.hkParams.timeOffset = offset;
      this.$rootScope.hkEndTimestamp = end;
      this.$rootScope.hkStartTimestamp = start;
    }
  }

  _module.service('HawkularNav', HawkularNav);

}
