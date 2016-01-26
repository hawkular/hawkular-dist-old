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

/// <reference path="appList.spec.ts"/>
module protractor.testing {
  declare var browser: any;
  declare var describe: any;
  declare var expect: any;
  declare var it: any;

  /**
   * simple jasmine spec for app list page
   */
  describe('app-list tests', () => {
    const appList = new AppList();

    it('should go to app-list page trough navbar', () => {
      appList.clickOnApplicationServers();
      expect(browser.getLocationAbsUrl()).toContain(AppList.APP_LIST_URL);
    });

    it('should open current Machine page with overview', () => {
      appList.getCurrentMachine();
      expect(browser.getLocationAbsUrl()).toContain('overview');
    });
  });
}
