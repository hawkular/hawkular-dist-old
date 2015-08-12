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

/// <reference path="alertPlugin.ts"/>
module Alert {

  export class HkAlertPanel {

    public link: (scope: any, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => void;
    public replace = 'true';
    public scope = {
      alert: '=hkAlert',
      refresh: '&hkRefresh'
    };
    public templateUrl = 'plugins/directives/alert/html/alert.html';


    constructor(private HawkularAlert) {
      this.link = (scope: any, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => {
        scope.alertResolve = (): void => {
          this.HawkularAlert.Alert.resolve({alertIds: scope.alert.id}, {}, () => {
            scope.refresh({hkAlert: scope.alert});
          });
        };
      };
    }

    public static Factory() {
      var directive = (HawkularAlert: any) => {
        return new HkAlertPanel(HawkularAlert);
      };

      directive['$inject'] = ['HawkularAlert'];

      return directive;
    }
  }

  export class HkAlertPanelList {

    public link: (scope: any, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => void;
    public replace = 'true';
    public scope = {
      alertList: '=hkAlertList',
      limit: '=hkLimit'
    };
    public templateUrl = 'plugins/directives/alert/html/alertList.html';

    constructor() {
      this.link = (scope: any, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => {
        scope.alertResolve = (alert): void => {
          for (var i = 0; i< scope.alertList.length; i++) {
            if (scope.alertList[i].id === alert.id) {
              scope.alertList.splice(i, 1);
              break;
            }
          }
        };
      };
    }

    public static Factory() {
      var directive = () => {
        return new HkAlertPanelList();
      };

      directive['$inject'] = [];

      return directive;
    }
  }

  export class HkTime {

    public static $inject = [];

    public humanizeTime(timeMillis: number): any {
      var result: any = {};

      var sec_num: number = Math.floor(timeMillis / 1000);
      var hours: number   = Math.floor(sec_num / 3600);
      var minutes: number = Math.floor((sec_num - (hours * 3600)) / 60);
      var seconds: number = sec_num - (hours * 3600) - (minutes * 60);

      if (hours !== 0) {
        result.hours = hours;
      }
      if (minutes !== 0) {
        result.minutes = minutes;
      }
      if (seconds !== 0) {
        result.seconds = seconds;
      }

      return result;
    }
  }

  export class HkTimeInterval {

    public link: (scope: any, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => void;
    public replace = 'true';
    public scope = {
      hkTimeMillis: '=hkTime'
    };
    public templateUrl = 'plugins/directives/alert/html/timeInterval.html';

    constructor(private HkTime) {
      this.link = (scope: any, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => {
        scope.hkTime = HkTime.humanizeTime(scope.hkTimeMillis);
      };
    }

    public static Factory() {
      var directive = (HkTime: any) => {
        return new HkTimeInterval(HkTime);
      };

      directive['$inject'] = ['hkTime'];

      return directive;
    }
  }

  _module.service('hkTime', Alert.HkTime);
  _module.directive('hkAlertPanelList', Alert.HkAlertPanelList.Factory());
  _module.directive('hkAlertPanel', Alert.HkAlertPanel.Factory());
  _module.directive('hkTimeInterval', Alert.HkTimeInterval.Factory());

  export class HkFieldsetNotification {

    public link: (scope: any, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => void;
    public replace = 'true';
    public scope = {
      hkAlertEmail: '='
    };
    public templateUrl = 'plugins/directives/alert/html/fieldset-notification.html';

    constructor() {
      this.link = (scope: any, element: ng.IAugmentedJQuery, attrs: ng.IAttributes) => {
        console.debug('empty link');
      };
    }
    public static Factory() {
      var directive = () => {
        return new HkFieldsetNotification();
      };

      directive['$inject'] = [];

      return directive;
    }
  }

  _module.directive('hkFieldsetNotification', Alert.HkFieldsetNotification.Factory());

  export class HkTimeUnit {

    public static $inject = [];

    public timeUnits: Array<any> = [
      {value: 1, label: 'milliseconds'},
      {value: 1000, label: 'seconds'},
      {value: 60000, label: 'minutes'},
      {value: 3600000, label: 'hours'}
    ];

    public timeUnitDictionary: any = {};

    constructor() {
      console.debug('HkTimeUnit constructor');
      _.forEach(this.timeUnits, (timeUnit: any) => {
        this.timeUnitDictionary[timeUnit.value] = timeUnit.label;
      });
    }

    // Get the most meaningful time unit (so that time value is not a very long fraction).
    public getFittestTimeUnit(timeValue: number): number {
      if (timeValue === 0) {
        return 1;
      }

      var timeUnit = 1;

      _.forEach(this.timeUnits, function(unit: any){
        if (timeValue % unit.value === 0 && unit.value > timeUnit) {
          timeUnit = unit.value;
        }
      });

      return timeUnit;
    }

    public static Factory() {
      var directive = () => {
        return new HkTimeUnit();
      };

      directive['$inject'] = [];

      return directive;
    }
  }

  _module.service('hkTimeUnit', Alert.HkTimeUnit.Factory());

  export class HkFieldsetDampening {

    public link: (scope: any) => void;
    public replace = 'true';
    public scope = {
      hkDuration: '=',
      hkSwitch: '=',
      hkTitle: '@'
    };
    public templateUrl = 'plugins/directives/alert/html/fieldset-dampening.html';

    constructor(private hkTimeUnit: any) {
      this.link = (scope: any) => {
        var localChange = false;
        var durationBackup = scope.hkDuration || 0;

        scope.durationChange = ():void => {
          localChange = true;
        };

        scope.durationToggle = ():void => {
          if (scope.durationEnabled) {
            scope.hkDuration = durationBackup;
            if (scope.hkDuration === 0) {
              scope.responseUnit = hkTimeUnit.getFittestTimeUnit(scope.hkDuration);
            }
          } else {
            durationBackup = scope.hkDuration;
            scope.hkDuration = 0;
          }
        };

        scope.$watch('hkDuration', () => {
          if (!localChange) {
            scope.durationEnabled = scope.hkDuration !== 0;
          }
          localChange = false;
        });

        scope.$watch('hkSwitch', () => {
            scope.hkSwitchEnabled = (scope.hkSwitch !== undefined);
        });
      };
    }

    public static Factory() {
      var directive = (hkTimeUnit: any) => {
        return new HkFieldsetDampening(hkTimeUnit);
      };

      directive['$inject'] = ['hkTimeUnit'];

      return directive;
    }
  }

  _module.directive('hkFieldsetDampening', Alert.HkFieldsetDampening.Factory());
}
