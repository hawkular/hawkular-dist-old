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
/// <reference path="../../../includes.ts"/>

module HawkularMetrics {

  export class HkSwitch {

    public link:(scope:any, element:any, attrs:any) => void;
    public restrict = 'E';
    public replace = 'true';
    public scope = {
      name: '@',
      id: '@',
      hkModel: '=',
      hkDisabled: '=',
      hkChange: '&',
      hkClick: '&'
    };
    public templateUrl = 'plugins/metrics/html/directives/hk-switch.html';

    constructor() {
      this.link = (scope:any, element:any, attrs:any) => {
        element.removeAttr('name');
        element.removeAttr('id');

        scope.hkOnText = attrs.onText || 'ON';
        scope.hkOffText = attrs.offText || 'OFF';

        element.bind('keydown', function (e) {
          let code = e.keyCode || e.which;
          if (code === 32 || code === 13) {
            e.stopImmediatePropagation();
            e.preventDefault();
            $(e.target).find('input').click();
          }
        });
      };
    }

    public static Factory() {
      let directive = () => {
        return new HkSwitch();
      };

      directive['$inject'] = [];

      return directive;
    }
  }

  _module.directive('hkSwitch', HawkularMetrics.HkSwitch.Factory());

  export class HkTimeInput {

    public link:(scope:any, attrs:any, element:any) => void;
    public replace = 'true';
    public restrict = 'E';
    public scope = {
      id: '@',
      hkDuration: '=',
      hkDisabled: '=',
      hkAutoConvert: '=',
      hkChange: '&'
    };
    public templateUrl = 'plugins/metrics/html/directives/time-input.html';

    constructor(private hkTimeUnit:any) {
      this.link = (scope:any, element:any, attrs:any) => {
        element.removeAttr('id');

        let localChange = false;

        scope.timeUnits = hkTimeUnit.timeUnits;
        scope.timeUnitsDict = hkTimeUnit.timeUnitDictionary;

        scope.durationChange = ():void => {
          localChange = true;
          scope.hkDuration = scope.hkConvertedDuration * scope.responseUnit;
          scope.hkChange();
        };

        scope.computeTimeInUnits = ():void => {
          scope.hkConvertedDuration = scope.hkDuration / scope.responseUnit;
        };

        scope.$watch('hkDuration', (newDuration, oldDuration) => {
          scope.durationEnabled = scope.hkDuration !== 0;
          if (!localChange) {
            scope.responseUnit = hkTimeUnit.getFittestTimeUnit(scope.hkDuration);
            scope.computeTimeInUnits();
          }
          localChange = false;
        });
      };
    }

    public static Factory() {
      let directive = (hkTimeUnit:any) => {
        return new HkTimeInput(hkTimeUnit);
      };

      directive['$inject'] = ['hkTimeUnit'];

      return directive;
    }
  }

  _module.directive('hkTimeInput', HawkularMetrics.HkTimeInput.Factory());

  export class HkAutofocus {

    public link:(scope:any, element:any[], attrs:any) => void;

    public restrict = 'A';

    constructor($timeout: any) {
      this.link = (scope:any, element:any, attrs:any) => {
        scope.$watch( () => { return element.is(':visible'); },
            (value) => {
              if(value) {
                $timeout(() => {
                  element[0].focus();
                  if (element[0].select) {
                    element[0].select();
                  }
                });
              }
            }
        );
      };
    }

    public static Factory() {
      let directive = ($timeout: any) => {
        return new HkAutofocus($timeout);
      };

      directive['$inject'] = ['$timeout'];

      return directive;
    }
  }

  _module.directive('hkAutofocus', HawkularMetrics.HkAutofocus.Factory());

}
