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
package org.hawkular.rx.commands.inventory;

import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;

import javax.enterprise.inject.Any;
import javax.enterprise.inject.Instance;
import javax.enterprise.inject.spi.InjectionPoint;
import javax.inject.Inject;

import org.apache.commons.lang3.tuple.ImmutablePair;
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.rx.cdi.WithValues;
import org.hawkular.rx.commands.common.AbstractHttpCommand;
import org.hawkular.rx.commands.common.HawkularConfiguration;
import org.hawkular.rx.httpclient.HttpClient;
import org.hawkular.rx.httpclient.RestResponse;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.netflix.hystrix.HystrixCommandGroupKey;
import com.netflix.hystrix.HystrixCommandProperties;

import rx.Observable;
import rx.Subscriber;

/**
 * @author Jirka Kremser
 */
@WithValues
public class CreateResourceCommand extends AbstractHttpCommand<String> {

    private Resource.Blueprint resource;

    private String authToken;

    private String persona;

    @Inject
    @Any
    private Instance<CreateResourceCommand> createResourceCommandInjector;

    @Override
    protected List<ImmutablePair<Class, Consumer>> getSetters() {
        final CreateResourceCommand self = CreateResourceCommand.this;
        return Arrays.asList(
                new ImmutablePair<>(String.class, (x) -> self.authToken = nullOrStr(x)),
                new ImmutablePair<>(String.class, (x) -> self.persona = nullOrStr(x))
        );
    }

    @Inject
    private HttpClient client;

    @Inject
    @Any
    private ObjectMapper mapper;

    @Inject
    private HawkularConfiguration config;

    @Inject
    private CreateResourceCommand(InjectionPoint ip) {
        super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("inventory-resource"))
                .andCommandPropertiesDefaults(HystrixCommandProperties.Setter()
                        .withExecutionTimeoutInMilliseconds(2500)));
        initialize(ip);
    }


    @Override protected Observable<String> construct() {
        return Observable.create(new Observable.OnSubscribe<String>() {
            @Override
            public void call(Subscriber<? super String> observer) {
                if (observer.isUnsubscribed()) {
                    return;
                }
                try {
                    RestResponse response =
                            client.post(authToken, persona, config.URL_INVENTORY + "/test/resources",
                                    mapper.writeValueAsString(resource));

                    observer.onNext(response.getLocationHeader());
                    observer.onCompleted();
                } catch (Exception e) {
                    observer.onError(e);
                }
            }
        });
    }

    public void setResource(Resource.Blueprint resource) {
        this.resource = resource;
    }
}
