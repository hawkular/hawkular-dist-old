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
  export interface IHkHeaderParser {
    parse(headers:any): any;
  }

  export class HkHeaderParser implements IHkHeaderParser {

    public static $inject = [];

    private PARAMETER_EXPRESSION = /(rel)="(\w+)"/;
    private total = 0;

    private parseLinkHeader(value):any {
      var relationLinks = {};

      if (!value) {
        return relationLinks;
      }

      var links = value.split(', ');

      for (var i = 0; i < links.length; i++) {
        var linkParts = links[i].split('>');
        var linkHref = linkParts[0].substring(1);
        var linkRelationParameterString = linkParts[1];
        var linkRelationParameterParts = this.PARAMETER_EXPRESSION.exec(linkRelationParameterString);

        // Get the relation name for current Link
        if (linkRelationParameterParts && linkRelationParameterParts[1] === 'rel' && linkRelationParameterParts[2]) {
          //debugger;
          relationLinks[linkRelationParameterParts[2]] = {
            href: linkHref
          };

          // Get the parameters (page, per_page, ...) of current link
          relationLinks[linkRelationParameterParts[2]]['params'] = {};

          var linkHrefParts = linkHref.split('?');
          var linkHrefParametersString = linkHrefParts[1];
          var hrefParamsPairStringParts = linkHrefParametersString.split('&');
          for (var j = 0; j < hrefParamsPairStringParts.length; j++) {
            var parameterPair = hrefParamsPairStringParts[j];
            var parameterPairParts = parameterPair.split('=');

            if (parameterPairParts[0] && parameterPairParts[1]) {
              relationLinks[linkRelationParameterParts[2]]['params'][parameterPairParts[0]] = parameterPairParts[1];
            }
          }
        }
      }
      return relationLinks;
    }

    public parse(headers:any):any {
      return {
        total: headers['x-total-count'],
        rel: this.parseLinkHeader(headers.link)
      };
    }
  }

  _module.service('HkHeaderParser', HkHeaderParser);
}
