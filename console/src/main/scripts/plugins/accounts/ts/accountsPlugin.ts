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

/// <reference path='accountsGlobals.ts'/>
module HawkularAccounts {
  let currentPersona:IPersona = undefined;

  _module.config(['$httpProvider', 'HawtioNavBuilderProvider', '$routeProvider',
    ($httpProvider:ng.IHttpProvider, builder:HawtioMainNav.BuilderFactory, $routeProvider) => {

      $httpProvider.interceptors.push(['$q',PersonaInterceptorService.Factory]);

      $routeProvider
        .when(
        '/hawkular-ui/organizations',
        {templateUrl: builder.join(HawkularAccounts.templatePath, 'organizations.html')})

        .when(
        '/hawkular-ui/organizations/join',
        {templateUrl: builder.join(HawkularAccounts.templatePath, 'organizations-join.html')})

        .when(
        '/hawkular-ui/organization/:organizationId/memberships',
        {templateUrl: builder.join(HawkularAccounts.templatePath, 'organization-memberships.html')})

        .when(
        '/hawkular-ui/invitation/accept/:token',
        {templateUrl: builder.join(HawkularAccounts.templatePath, 'organization-accept-invitation.html')})

        .when(
        '/hawkular-ui/tokens',
        {templateUrl: builder.join(HawkularAccounts.templatePath, 'tokens.html')})

        .when(
        '/hawkular-ui/tokens/:id',
        {templateUrl: builder.join(HawkularAccounts.templatePath, 'tokens.html')})

        .when(
        '/hawkular-ui/settings',
        {templateUrl: builder.join(HawkularAccounts.templatePath, 'user-settings.html')});
  }]);

  _module.run(['$rootScope', '$log', '$modal', '$document', 'userDetails',
    ($rootScope, $log, $modal, $document, userDetails) => {
      $rootScope.userDetails = userDetails;
      $rootScope.PersistenceState = PersistenceState;

      $rootScope.$on('IdleStart', () => {
        $('#idle').slideDown();
      });

      $rootScope.$on('IdleEnd', () => {
        $('#idle').slideUp();
      });

      $rootScope.$on('IdleTimeout', () => {
        $log.debug('Idle timeout');
        $document.find('body').eq(0).addClass('inactivity-modal-open');
        $modal.open({
          templateUrl: 'plugins/accounts/html/inactivityModal.html',
          backdrop: 'static',
          keyboard: false,
          windowClass: 'time-out-dialog'
        }).opened.then(() => {
            HawtioKeycloak.keycloak.clearToken();
          });
      });

      $rootScope.$on('CurrentPersonaLoaded', (e, persona:IPersona) => {
        currentPersona = persona;
        $rootScope.currentPersona = currentPersona;
      });

      $rootScope.$on('SwitchedPersona', (e, persona:IPersona) => {
        currentPersona = persona;
        $rootScope.currentPersona = currentPersona;
      });
    }]);

  hawtioPluginLoader.registerPreBootstrapTask((next) => {
    window['KeycloakConfig'] = '/keycloak.json';
    next();
  }, true);

  class PersonaInterceptorService {
    public static $inject = ['$q'];

    public static Factory($q:ng.IQService) {
      return new PersonaInterceptorService($q);
    }

    constructor(private $q:ng.IQService) {
    }

    request = (request) => {
      if (currentPersona) {
        request.headers['Hawkular-Persona'] = currentPersona.id;
      }
      return request;
    };
  }

  hawtioPluginLoader.addModule(HawkularAccounts.pluginName);
}
