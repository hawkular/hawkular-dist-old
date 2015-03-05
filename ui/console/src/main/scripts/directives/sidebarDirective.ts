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

/// <reference path="sidebarPlugin.ts"/>
module Sidebar {

  var log:Logging.Logger = Logger.get("Sidebar");

  export class SidebarDirective {

    public restrict = 'E';
    public replace = true;
    public transclude = false;

    public template = '<aside class="hk-sidebar col-md-1"><nav class="navbar navbar-vertical" role="navigation">' +
    '<div>' +
      '<ul>' +
        '<li class="overview"><a href="/metrics/overview"><i class="fa fa-dashboard"></i>Overview</a></li>' +
        '<li class="availability"><a href="/metrics/availability"><i class="fa fa-circle-o-notch"></i>Availability</a></li>' +
        '<li class="response"><a href="/metrics/metricsResponse"><i class="fa fa-line-chart"></i>Response</a></li>' +
        '<li class="uptime"><a href="/metrics/uptime"><i class="fa fa-arrow-up"></i>Up time</a></li>' +
        '<li class="alerts"><a href="/alerts"><i class="fa fa-flag"></i>Alerts</a></li>' +
      '</ul>' +
    '</div>' +
  '</nav></aside>';
  }
}
