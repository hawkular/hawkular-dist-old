///
/// Copyright 2015-2016 Red Hat, Inc. and/or its affiliates
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

module protractor.testing {
  declare var by: any;
  declare var element: any;

  export class Topology {
    public static TOPOLOGY_URL = '/hawkular-ui/topology/view';
    public static NAV_TEXT = 'Topology';

    /**
     * Method for redirecting to topology page via navigation header.
     */
    clickOnTopology() {
      const topBar = element(by.tagName('hawkular-topbar'));
      const navBar = topBar.element(by.className('navbar-nav'));
      navBar.element(by.cssContainingText('a', Topology.NAV_TEXT)).click();
    }
  }
}
