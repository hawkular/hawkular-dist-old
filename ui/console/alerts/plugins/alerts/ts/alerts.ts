/// <reference path="alertsPlugin.ts"/>
module HawkularAlerts {

  export var AlertsController = _module.controller("HawkularAlerts.AlertsController", ['$scope', ($scope) => {
      $scope.alerts = [
          {name:"Out of Memory Alert", priority: 2 },
          {name:"Out of Disk Space", priority: 1},
          {name:"CPU High", priority: 3}
      ];
  }]);

}
