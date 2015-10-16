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
/// <reference path="services/alertsManager.ts"/>
/// <reference path="services/errorsManager.ts"/>

module HawkularMetrics {

  export class AlertsCenterTriggerController {

    public static  $inject = ['$scope', 'HawkularAlertsManager',
      'ErrorsManager', '$log', '$q', '$rootScope', '$interval', '$routeParams',
      'HkHeaderParser', '$location'];

    public isWorking = false;
    public lastUpdateDate:Date = new Date();

    public triggersList:IAlertTrigger[];
    public selectedItems:IAlertTrigger[];
    public triggersPerPage = 10;
    public triggersCurPage = 0;
    public headerLinks:any = {};
    public selectCount = 0;
    public hasOpenSelectedItems:boolean = false;

    public loadingMoreItems:boolean = false;
    public addProgress:boolean = false;

    constructor(private $scope:any,
                private HawkularAlertsManager:IHawkularAlertsManager,
                private ErrorsManager:IErrorsManager,
                private $log:ng.ILogService,
                private $q:ng.IQService,
                private $rootScope:IHawkularRootScope,
                private $interval:ng.IIntervalService,
                private $routeParams:any,
                private HkHeaderParser:any,
                private $location:ng.ILocationService) {
      $scope.ac = this;

      this.autoRefresh(120);
      if ($rootScope.currentPersona) {
        this.getTriggers();
      } else {
        // currentPersona hasn't been injected to the rootScope yet, wait for it..
        $rootScope.$watch('currentPersona', (currentPersona) =>
        currentPersona && this.getTriggers());
      }

    }

    private autoRefresh(intervalInSeconds:number):void {
      let autoRefreshPromise = this.$interval(()  => {
        this.$log.debug('autoRefresh .... ' + new Date());
        this.getTriggers();
      }, intervalInSeconds * 1000);

      this.$scope.$on('$destroy', () => {
        this.$interval.cancel(autoRefreshPromise);
      });
    }

    public getTriggers():void {

      this.HawkularAlertsManager.queryTriggers({currentPage: this.triggersCurPage,
        perPage: this.triggersPerPage
        })
        .then((queriedTriggers) => {
          this.headerLinks = this.HkHeaderParser.parse(queriedTriggers.headers);
          this.triggersList = queriedTriggers.triggerList;
          this.lastUpdateDate = new Date();
          console.dir(this.headerLinks);
      }, (error) => {
        this.$log.warn(error);
      }).catch((error) => {
        this.$log.error('Error:' + error);
      }).finally(() => {
        this.lastUpdateDate = new Date();
      });
    }

    public showDetailPage(triggerId:TriggerId):void {
      this.$location.url(`/hawkular-ui/alerts-center-trigger-detail/${triggerId}`);
    }

    public setPage(page:number):void {
      this.triggersCurPage = page;
      this.getTriggers();
    }

    public selectItem(item:IAlertTrigger):void {
      item.selected = !item.selected;
      this.selectedItems  = _.filter(this.triggersList, 'selected');
      this.selectCount = this.selectedItems.length;
      this.hasOpenSelectedItems = _.some(this.selectedItems,{'status': 'OPEN'});
    }

    private resetAllUnselected() {
      this.selectCount = 0;
      this.hasOpenSelectedItems = false;
      this.triggersList.forEach((item:IAlertTrigger) => {
        item.selected = false;
      });
    }

    public selectAll():void {
      let toggleTo = this.selectCount !== this.triggersList.length;
      _.forEach(this.triggersList, (item:IAlertTrigger) => {
        item.selected = toggleTo;
      });
      this.selectCount = toggleTo ? this.triggersList.length : 0;
    }

  }

  _module.controller('AlertsCenterTriggerController', AlertsCenterTriggerController);
}

