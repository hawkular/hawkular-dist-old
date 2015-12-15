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

/// <reference path="../../metricsPlugin.ts"/>
/// <reference path="../../services/alertsManager.ts"/>
/// <reference path="../../services/errorsManager.ts"/>

module HawkularMetrics {
  export class UrlItemController {
    private static BASE_URL = '/hawkular-ui/url/';
    private static AVAILABILITY_URL = UrlItemController.BASE_URL + 'availability/';
    private static ALERT_URL = UrlItemController.BASE_URL + 'alerts/';
    private static RESPONSE_TIME_URL = UrlItemController.BASE_URL + 'response-time/';
    private static MILIS_IN_SECONDS = 1000;

    public resourceId:string = '';
    public resource:any;
    public alerts = [];
    private autoRefreshPromise:ng.IPromise<number>;
    public startTimeStamp:TimestampInMillis;
    public endTimeStamp:TimestampInMillis;

    constructor(private $location:ng.ILocationService,
                private $routeParams:any,
                private $rootScope:any,
                private HawkularAlertRouterManager: IHawkularAlertRouterManager,
                private $interval:ng.IIntervalService) {
      this.startTimeStamp = +moment().subtract(($routeParams.timeOffset || 3600000), 'milliseconds');
      this.endTimeStamp = +moment();
      this.getAlerts();
      this.autoRefresh(20);
    }

    public registerAlerts() {
      this.HawkularAlertRouterManager.registerForAlerts(
        this.resourceId,
        'url',
        _.bind(this.filterAlerts, this)
      );
    }

    public filterAlerts(data:IHawkularAlertQueryResult) {
      _.remove(data.alertList, (item:IAlert) => {
        switch (item.context.alertType) {
          case 'PINGRESPONSE' :
            item.alertType = item.context.alertType;
            return false;
          case 'PINGAVAIL' :
            item.alertType = item.context.alertType;
            return false;
          default :
            return true; // ignore non-response-time alert
        }
      });
      this.alerts = data.alertList;
    }

    private autoRefresh(intervalInSeconds:number):void {
      this.autoRefreshPromise = this.$interval(() => {
        this.refresh();
      }, intervalInSeconds * UrlItemController.MILIS_IN_SECONDS);
    }

    public destroy() {
      this.$interval.cancel(this.autoRefreshPromise);
    }

    public refresh() {
      this.getAlerts();
    }

    private getAlerts():void {
      this.HawkularAlertRouterManager.getAlertsForResourceId(
        this.resourceId,
        this.startTimeStamp,
        this.endTimeStamp
      );
    }

    public redirectToUrlAvailability(resourceId) {
      this.$location.path(this.getAvailabilityUrl(resourceId));
    }

    public getAlertUrl(resourceId):string {
      return UrlItemController.ALERT_URL + resourceId + '/' + this.$rootScope.hkParams.timeOffset;
    }

    public getResponseTimeUrl(resourceId):string {
      return UrlItemController.RESPONSE_TIME_URL + resourceId + '/' + this.$rootScope.hkParams.timeOffset;
    }

    public getAvailabilityUrl(resourceId):string {
      return UrlItemController.AVAILABILITY_URL + resourceId + '/' + this.$rootScope.hkParams.timeOffset;
    }
  }
  _module.controller('UrlItemController', UrlItemController);
}
