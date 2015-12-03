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

/// <reference path="../metricsPlugin.ts"/>
/// <reference path="../../includes.ts"/>

module HawkularMetrics {

  export interface IHawkularAlertRouterManager {
    /**
     * Object of functions registered for receiving alert information.
     * Result after registering two functions (jvm, web) on resource ID localhost and one function (dataStore)
     * on dataStore-DS:
     * registeredForAlerts = {
     *    localhost: {
     *        jvm: object,
     *        web: object
     *      },
     *    dataStore-DS: {
     *        dataStore: object
     *    }
     * }
     *
     * The object inside is lodashed function bound with scope.
     */
    registeredForAlerts: any;

    /**
     * All alert data received from server about current resources.
     */
    fullAlertData: any;

    /**
     * @name registerForAlerts
     * @desc Register function for alerts when they are polled.
     * @param resourceId id of resource (either currently opened server, or some resource).
     * @param alertType type of alert which is being registered.
     * @param processFunction Function which will be called when alerts are queried.
     */
    registerForAlerts(resourceId:string,alertType:string, processFunction:Function): void;

      /**
       * @name getAlertsForCurrentResource
       * @desc get alerts for currently opened resource @see {@link getAlertsForResourceId}
       * @param startTime poll the server starting this time.
       * @param endTime poll the server with ending this time.
       */
    getAlertsForCurrentResource(startTime: TimestampInMillis, endTime: TimestampInMillis): void;

    /**
     * @name getAlertsForResourceId
     * @desc poll the server for alerts and call methods registered for these alerts.
     * @param resourceId id of resource.
     * @param startTime poll the server starting this time.
     * @param endTime poll the server with ending this time.
     */
    getAlertsForResourceId(resourceId:string, startTime: TimestampInMillis, endTime: TimestampInMillis): void;
  }

  /**
   * This class is for registering functions for listening when alerts ar received from server.
   */
  export class HawkularAlertRouterManager implements IHawkularAlertRouterManager {
    registeredForAlerts:any;
    fullAlertData:any;
    constructor(private $routeParams,
                private HawkularAlertsManager:IHawkularAlertsManager,
                private ErrorsManager:IErrorsManager,
                private $q:ng.IQService) {
      this.registeredForAlerts = {};
    }

    public registerForAlerts(resourceId:string, alertType:string, processFunction:Function):void {
      if (this.registeredForAlerts[resourceId] === undefined) {
        this.registeredForAlerts[resourceId] = {};
      }
      this.registeredForAlerts[resourceId][alertType] = processFunction;
    }

    public getAlertsForCurrentResource(startTime:TimestampInMillis, endTime:TimestampInMillis):void {
      this.getAlertsForResourceId(this.$routeParams.resourceId, startTime, endTime);
    }

    public getAlertsForResourceId(resourceId, startTime, endTime):void {
      let fullAlertData = {};

      let promise = this.HawkularAlertsManager.queryAlerts({
        statuses: 'OPEN',
        tags: 'resourceId|' + resourceId,
        startTime: startTime,
        endTime: endTime
      }).then((alertData:IHawkularAlertQueryResult) => {
        let registeredObjects = this.registeredForAlerts[resourceId];
        for (let key in registeredObjects) {
          if (registeredObjects.hasOwnProperty(key)) {
            HawkularAlertRouterManager.callRegisteredAlertByKey(registeredObjects[key], alertData);
          }
        }
        fullAlertData = alertData;
      }, (error) => {
        return this.ErrorsManager.errorHandler(error, 'Error fetching alerts.');
      });
      this.$q.all([promise]).finally(()=> {
        this.fullAlertData = fullAlertData;
      });
    }

    /**
     * @name callRegisteredAlertByKey
     * @desc Help method for calling registered function inside registered object. The alertData are cloned, so if
     * called function will change the inner state, it will not effect other alert functions.
     * @param registeredObject object which has registered to listen on alert changes.
     * @param alertData actual data received from calling alert.
     */
    private static callRegisteredAlertByKey(registeredObject, alertData) {
      if (typeof registeredObject === 'function') {
        registeredObject(_.clone(alertData, true));
      }
    }
  }

  _module.service('HawkularAlertRouterManager', HawkularAlertRouterManager);
}
