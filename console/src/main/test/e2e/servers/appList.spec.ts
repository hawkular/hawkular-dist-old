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

  /**
   * Class for navigating around app-list page.
   */
  export class AppList {
    public static APP_LIST_URL = '/hawkular-ui/app/app-list';
    public static NAV_TEXT = 'Application Servers';

    /**
     * This method will click on first application server in table and click on url which will lead to overview of
     * this server. It will perform redirecting to app-list itself.
     */
    getCurrentMachine() {
      this.clickOnApplicationServers();
      const dataTable = element(by.className('datatable'));
      dataTable.element(by.css('tbody tr.ng-scope td:nth-child(2) a:nth-child(1)')).click();
    }

    /**
     * Method for redirecting to app-list page via navigation header.
     */
    clickOnApplicationServers() {
      const topBar = element(by.tagName('hawkular-topbar'));
      const navBar = topBar.element(by.className('navbar-nav'));
      navBar.element(by.cssContainingText('a', AppList.NAV_TEXT)).click();
    }
  }
}
