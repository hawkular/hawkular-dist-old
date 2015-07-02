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

/*
 TODO
 Move to shared service location
  */

module HawkularMetrics {

  export interface IHawkularErrorManager {
    errorHandler(error: any, msg: string, cb?: (error: any, msg: string) => void): any;
  }

  export class HawkularErrorManager implements IHawkularErrorManager {

    public static $inject = ['$q', '$log'];

    constructor(private $q: ng.IQService,
                private $log: ng.ILogService) {
    }

    private errorToastr(error: any, errorMsg: string): void {
      var errorMsgComplete: string;

      if (error.data && error.data.errorMsg) {
        errorMsgComplete = error.data.errorMsg;
      } else {
        errorMsgComplete = errorMsg + ' ' + error;
      }

      this.$log.error(errorMsgComplete);
      toastr.error(errorMsgComplete);
    }

    public errorHandler(error: any, msg: string, cb?: (error: any, msg: string) => void): ng.IPromise<void> {
      if (error) {
        this.errorToastr(error, msg);
        if (cb) {
          cb(error, msg);
        }
      }
      return this.$q.reject(null);
    }
  }

  _module.service('HawkularErrorManager', HawkularErrorManager);
}
