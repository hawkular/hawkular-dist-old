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

/// <reference path='emailsPlugin.ts'/>
module Emails {
  export class EmailsDirective {
    public require = 'ngModel';

    public link(scope, elm, attrs, ctrl):void {
      ctrl.$validators.emails = (modelValue, viewValue):boolean => {
        if (ctrl.$isEmpty(modelValue)) {
          // consider empty models to be valid
          return true;
        }

        let atLeastOneInvalid = true; // until proven otherwise...
        viewValue
          .split(/[,\s]/)
          .filter((entry:string) => {
            return entry && entry.length > 0;
          })
          .forEach((email:string) => {
            const re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
            let valid = re.test(email);
            if (!valid) {
              atLeastOneInvalid = false;
            }
          });

        return atLeastOneInvalid;
      };
    }
  }
}
