var attachmentsRequest = 'hawkular-redhat-access-integration-backend/attachments';

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

angular.module('RedhatAccess.cases')
  .controller('BackEndAttachmentsCtrl', ['$scope', 'TreeViewSelectorData', 'AttachmentsService',
    function ($scope, TreeViewSelectorData, AttachmentsService) {
      $scope.name = 'Attachments';
      $scope.attachmentTree = [];
      TreeViewSelectorData.getTree(attachmentsRequest).then(
        function (tree) {
          $scope.attachmentTree = tree;
          AttachmentsService.updateBackEndAttachments(tree);
        },
        function () {
          console.log('Unable to get tree data');
        });
    }]
);

angular.module('RedhatAccess.cases').directive('rha403error', function () {
  return {
    templateUrl: '/support-403.html',
    restrict: 'A'
  };
});
