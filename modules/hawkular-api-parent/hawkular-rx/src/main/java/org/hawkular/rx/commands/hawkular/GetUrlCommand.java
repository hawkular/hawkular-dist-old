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
package org.hawkular.rx.commands.hawkular;

import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;

import javax.enterprise.inject.spi.InjectionPoint;
import javax.inject.Inject;

import org.apache.commons.lang3.tuple.ImmutablePair;
import org.hawkular.rx.cdi.WithValues;
import org.hawkular.rx.commands.common.AbstractHttpCommand;
import org.hawkular.rx.commands.common.HawkularConfiguration;
import org.hawkular.rx.httpclient.HttpClient;
import org.hawkular.rx.httpclient.RestResponse;

import com.netflix.hystrix.HystrixCommandGroupKey;

import rx.Observable;
import rx.Subscriber;

/**
 * @author Jirka Kremser
 */
@WithValues
public class GetUrlCommand extends AbstractHttpCommand<String> {

    private String id;

    private String authToken;

    private String persona;

    @Override
    protected List<ImmutablePair<Class, Consumer>> getSetters() {
        return Arrays.asList(
                new ImmutablePair<>(String.class, (x) -> GetUrlCommand.this.id = nullOrStr(x)),
                new ImmutablePair<>(String.class, (x) -> GetUrlCommand.this.authToken = nullOrStr(x)),
                new ImmutablePair<>(String.class, (x) -> GetUrlCommand.this.persona = nullOrStr(x))
        );
    }

    @Inject
    private HttpClient client;

    @Inject
    private HawkularConfiguration config;

    @Inject
    private GetUrlCommand(InjectionPoint ip) {
        super(HystrixCommandGroupKey.Factory.asKey("URL"));
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
                    String url = id == null || id.trim().isEmpty() ?
                            config.URL_INVENTORY + "/resourceTypes/URL/resources" :
                            config.URL_INVENTORY + "/test/resources/" + id;
                    RestResponse response = client.get(authToken, persona, url);

                    observer.onNext(response.getBody());
                    observer.onCompleted();
                } catch (Exception e) {
                    observer.onError(e);
                }
            }
        });
    }

//    @Override
//    protected String getCacheKey() {
//        return id;
//    }

    @Override
    protected Observable<String> resumeWithFallback() {
        return Observable.just(id);
    }
}
