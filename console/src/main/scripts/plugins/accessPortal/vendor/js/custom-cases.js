angular.module('RedhatAccess.JON', ['RedhatAccess.cases'])
.controller('customCase', ['$scope', 'securityService', 'NEW_DEFAULTS', '$location', '$http', function($scope, securityService, NEW_DEFAULTS , $location, $http) {
  NEW_DEFAULTS.product = "Red Hat JBoss Operations Network";
  NEW_DEFAULTS.version = "3.3.0";

  var params = $location.search();
  
  // handle support case for managed resource
  if ($location.path().indexOf('/resource-case') >= 0) {
    NEW_DEFAULTS.product = params.product;
    NEW_DEFAULTS.version = params.version;
    $location.path('/case/new')
  }

   $scope.init = function () {
     securityService.validateLogin(true);
   };
}]);
