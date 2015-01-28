/// <reference path="examplePlugin.ts"/>
module Example {

  export var Page1Controller = _module.controller("Example.Page1Controller", ['$scope', ($scope) => {
    $scope.target = "World!";
  }]);

}
