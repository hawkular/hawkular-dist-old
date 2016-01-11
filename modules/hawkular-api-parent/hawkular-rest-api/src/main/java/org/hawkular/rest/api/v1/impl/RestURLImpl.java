/*
 * Copyright 2015-2016 Red Hat, Inc. and/or its affiliates
 * and other contributors as indicated by the @author tags.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.hawkular.rest.api.v1.impl;

import java.net.URI;

import javax.enterprise.inject.Any;
import javax.enterprise.inject.Default;
import javax.enterprise.inject.Instance;
import javax.inject.Inject;
import javax.ws.rs.container.AsyncResponse;
import javax.ws.rs.core.Response;

import org.hawkular.rest.RestBase;
import org.hawkular.rest.api.v1.entities.URL;
import org.hawkular.rest.api.v1.interfaces.RestURL;
import org.hawkular.rx.cdi.CreateCommand;
import org.hawkular.rx.cdi.Initialized;
import org.hawkular.rx.cdi.UpdateCommand;
import org.hawkular.rx.commands.hawkular.CreateUrlCommand;
import org.hawkular.rx.commands.hawkular.DeleteUrlCommand;
import org.hawkular.rx.commands.hawkular.GetUrlCommand;
import org.hawkular.rx.commands.hawkular.UpdateUrlCommand;
import org.hawkular.rx.httpclient.HttpClient;

import com.fasterxml.jackson.databind.ObjectMapper;

import rx.Observable;

/**
 * @author Jirka Kremser
 * @since 0.0.1
 */
public class RestURLImpl extends RestBase implements RestURL {

    @Inject
    @Default
    private HttpClient client;

    @Inject
    private ObjectMapper mapper;

    @Inject
    @Any
    private Instance<GetUrlCommand> getUrlCommandInjector;

    @Inject
    @CreateCommand
    private Instance<CreateUrlCommand> createUrlCommandInjector;

    @Inject
    @UpdateCommand
    private Instance<UpdateUrlCommand> updateUrlCommandInjector;

    @Inject
    @Any
    private Instance<DeleteUrlCommand> deleteUrlCommandInjector;


    @Override
    public void getUrl(AsyncResponse asyncResponse, String id, String authToken) {
        String tenantId = getTenantId();
        GetUrlCommand getUrlCommand =
                getUrlCommandInjector.select(Initialized.withValues(id, authToken, tenantId)).get();

        Observable<String> observer = getUrlCommand.toObservable();
        observer.subscribe((commandResponse) -> asyncResponse.resume(commandResponse));
    }

    @Override
    public void getAll(AsyncResponse asyncResponse, String authToken) {
        getUrl(asyncResponse, null, authToken);
    }

    @Override
    public void createUrl(AsyncResponse asyncResponse, URL url, String authToken) {
        String tenantId = getTenantId();

        if (url == null || url.getUrl() == null) {
            asyncResponse.resume("URL object is empty, pass the {url: www.example.com}");
        }

        CreateUrlCommand createUrlCommand =
                createUrlCommandInjector.select(Initialized.withValues(url.getUrl(), authToken, tenantId)).get();
        Observable<String> observer = createUrlCommand.toObservable();
        observer.subscribe((commandResponse) -> {
            URI uri = URI.create(commandResponse);
            asyncResponse.resume(Response.created(uri).build());
        });
    }

    @Override
    public void updateUrl(AsyncResponse asyncResponse, String id, URL update, String authToken) {
        String tenantId = getTenantId();

        UpdateUrlCommand updateUrlCommand =
                updateUrlCommandInjector.select(Initialized.withValues(id, update.getUrl(), authToken, tenantId)).get();
        Observable<String> observer = updateUrlCommand.toObservable();
        observer.subscribe((commandResponse) -> asyncResponse.resume(commandResponse));
    }

    @Override
    public void deleteUrl(AsyncResponse asyncResponse, String id, String authToken) {
        String tenantId = getTenantId();

        DeleteUrlCommand deleteUrlCommand =
                deleteUrlCommandInjector.select(Initialized.withValues(id, authToken, tenantId)).get();
        Observable<String> observer = deleteUrlCommand.toObservable();
        observer.subscribe((commandResponse) -> asyncResponse.resume(commandResponse));
    }
}
