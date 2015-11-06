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
/// TODO: use ControllerAs syntax

  let paginationLink = ($scope:any) => {

    $scope.currentPageView = $scope.currentPage + 1;
    $scope.pagesNumber = getPagesNumber();

    function getPagesNumber() {
      return $scope.headers && Math.ceil(($scope.headers.total || 1) / $scope.perPage);
    }

    $scope.setPage = (pageNumber:number) => {
      $scope.pagesNumber = getPagesNumber();

      if ($scope.pagesNumber === 1) {
        $scope.currentPageView = 1;
        return;
      }

      if (pageNumber < 1) {
        $scope.pageSetter({pageNumber: 0});
        $scope.currentPageView = 1;
      } else if (pageNumber >= $scope.pagesNumber) {
        $scope.pageSetter({pageNumber: $scope.pagesNumber - 1});
        $scope.currentPageView = pageNumber;
      } else {
        $scope.pageSetter({pageNumber: pageNumber});
      }
    };

    $scope.goToFirst = () => {
      $scope.pageSetter({pageNumber: 0});
    };

    $scope.goToLast = () => {
      $scope.pagesNumber = getPagesNumber();
      $scope.pageSetter({pageNumber: $scope.pagesNumber - 1});
    };

    $scope.goTos = [0];

    $scope.$watch('currentPage', (recentCurrentPage) => {
      $scope.currentPageView = parseInt(recentCurrentPage, 10) + 1;
    });

    $scope.$watchGroup(['headers', 'perPage'], () => {
      $scope.pagesNumber = getPagesNumber();
      $scope.goTos = new Array($scope.pagesNumber);
    });

  };

  class HkPagination {
    public controller:($scope:any) => void;
    public templateUrl = 'plugins/metrics/html/url-pagination.html';
    public $scope = {
      resourceList: '=',
      currentPage: '=',
      linkHeader: '=',
      pageSetter: '&',
      perPage: '=',
      headers: '='
    };
    public replace = 'true';

    constructor() {
      this.controller = paginationLink;
    }

    public static Factory() {
      let directive = () => {
        return new HkPagination();
      };

      directive['$inject'] = [];

      return directive;
    }
  }

  _module.directive('hkPagination', HkPagination.Factory());

  class HkDataPagination {
    public link:($scope:ng.IScope) => void;
    public templateUrl = 'plugins/metrics/html/data-pagination.html';
    public $scope = {
      resourceList: '=',
      currentPage: '=',
      linkHeader: '=',
      pageSetter: '&',
      perPage: '=',
      headers: '='
    };
    public replace = 'true';

    constructor() {
      this.link = paginationLink;
    }

    public static Factory() {
      let directive = () => {
        return new HkDataPagination();
      };

      directive['$inject'] = [];

      return directive;
    }
  }

  _module.directive('hkDataPagination', HkDataPagination.Factory());
}
