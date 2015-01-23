/// <reference path="alertsPlugin.ts"/>
module HawkularAlerts {

  export var AlertsController = _module.controller("HawkularAlerts.AlertsController", ['$scope', ($scope) => {
    $scope.target = "World!";
  }]);

}
