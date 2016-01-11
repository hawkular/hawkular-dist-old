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

import java.net.MalformedURLException;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;

import javax.enterprise.inject.Any;
import javax.enterprise.inject.Instance;
import javax.enterprise.inject.spi.InjectionPoint;
import javax.inject.Inject;

import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.api.model.Metric;
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.rx.cdi.CreateCommand;
import org.hawkular.rx.cdi.Initialized;
import org.hawkular.rx.cdi.WithValues;
import org.hawkular.rx.commands.common.AbstractHttpCommand;
import org.hawkular.rx.commands.common.HawkularConfiguration;
import org.hawkular.rx.commands.inventory.CreateMetricCommand;
import org.hawkular.rx.commands.inventory.CreateResourceCommand;
import org.hawkular.rx.httpclient.HttpClient;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.netflix.hystrix.HystrixCommandGroupKey;
import com.netflix.hystrix.HystrixCommandProperties;

import rx.Observable;
import rx.Subscriber;

/**
 * @author Jirka Kremser
 */
@WithValues
@CreateCommand
public class CreateUrlCommand extends AbstractHttpCommand<String> {

    protected String url;

    protected String authToken;

    protected String persona;

    @Inject
    protected HttpClient client;

    @Inject
    @Any
    protected ObjectMapper mapper;

    @Inject
    private MessageDigest md5;

    @Inject
    protected HawkularConfiguration config;

    @Inject
    @Any
    private Instance<CreateResourceCommand> createResourceCommandInjector;

    @Inject
    @Any
    private Instance<CreateMetricCommand> createMetricCommandInjector;

    @Override
    protected List<ImmutablePair<Class, Consumer>> getSetters() {
        return Arrays.asList(
                new ImmutablePair<>(String.class, (x) -> CreateUrlCommand.this.url = makeUrlWithProtocol(nullOrStr(x))),
                new ImmutablePair<>(String.class, (x) -> CreateUrlCommand.this.authToken = nullOrStr(x)),
                new ImmutablePair<>(String.class, (x) -> CreateUrlCommand.this.persona = nullOrStr(x))
        );
    }

    @Inject
    protected CreateUrlCommand(InjectionPoint ip) {
        super(Setter.withGroupKey(HystrixCommandGroupKey.Factory.asKey("URL"))
                .andCommandPropertiesDefaults(HystrixCommandProperties.Setter()
                        .withExecutionTimeoutInMilliseconds(3500)));
        initialize(ip);
    }

    @Override protected Observable<String> construct() {
        return Observable.create(new Observable.OnSubscribe<String>() {
            @Override
            public void call(Subscriber<? super String> observer) {
                try {
                    if (observer.isUnsubscribed()) {
                        return;
                    }
                    CreateResourceCommand createResourceCmd =
                            createResourceCommandInjector.select(Initialized.withValues(authToken, persona)).get();

                    String hashedUrl = md5Hash(url);
                    Resource.Blueprint urlBlueprint = Resource.Blueprint.builder()
                            .withId(hashedUrl)
                            .withResourceTypePath(CanonicalPath.of().tenant(persona)
                                    .resourceType("URL").get().toString())
                            .withProperty("url", url)
                            .withProperty("hwk-gui-domainSort", getDomainSorterUrl(url))
                            .build();
                    createResourceCmd.setResource(urlBlueprint);
                    Observable<String> observeResource = createResourceCmd.toObservable();

                    Metric.Blueprint metric1 = Metric.Blueprint.builder()
                            .withId(hashedUrl + ".status.duration")
                            .withMetricTypePath(CanonicalPath.of().tenant(persona)
                                    .metricType("status.duration.type").get().toString())
                            .build();
                    CreateMetricCommand metric1Cmd =
                            createMetricCommandInjector.select(Initialized.withValues(authToken, persona)).get();
                    metric1Cmd.setResourcePath(hashedUrl);
                    metric1Cmd.setMetric(metric1);
                    Metric.Blueprint metric2 = Metric.Blueprint.builder()
                            .withId(hashedUrl + ".status.code")
                            .withMetricTypePath(CanonicalPath.of().tenant(persona)
                                    .metricType("status.code.type").get().toString())
                            .build();
                    CreateMetricCommand metric2Cmd =
                            createMetricCommandInjector.select(Initialized.withValues(authToken, persona)).get();
                    metric2Cmd.setResourcePath(hashedUrl);
                    metric2Cmd.setMetric(metric2);

                    Observable<String> observeMetric1 = metric1Cmd.toObservable();
                    Observable<String> observeMetric2 = metric2Cmd.toObservable();

                    observeResource.concatWith(observeMetric1.mergeWith(observeMetric2)).buffer(3)
                            .doOnError(e -> {
                                System.err.println(e);
                                observer.onError(e);
                            }).subscribe((commandResponse) -> {
                                observer.onNext(commandResponse.get(0));
                                observer.onCompleted();
                    });

//                    observeResource.flatMap((response) -> observeMetrics).subscribe((commandResponse) -> {
//                        observer.onNext(commandResponse);
//                    });
                } catch (Exception e) {
                    observer.onError(e);
                }
            }
        });
    }

//    @Override
//    protected String getCacheKey() {
//        return url;
//    }

//    @Override
//    protected Observable<String> resumeWithFallback() {
//        return Observable.just(url);
//    }

    private String md5Hash(String input) {
        byte[] byteData = md5.digest(input.getBytes());
        StringBuffer sb = new StringBuffer();
        for (int i = 0; i < byteData.length; i++)
            sb.append(Integer.toString((byteData[i] & 0xff) + 0x100, 16).substring(1));
        return sb.toString();
    }

    protected String makeUrlWithProtocol(String url) {
        return url.startsWith("http") ? url : "http://" + url;
    }

    protected String getDomainSorterUrl(String url) {
        //http://git.io/vRIHB
        try {
            URL urlInstance = new URL(url);
            String[] levels = urlInstance.getHost().split(".");
            if (levels != null && levels.length > 1) {
                String[] levelsSorted = new String[levels.length];
                //"a.b.redhat.com" will produce "redhat.com.a.b"
                Arrays.setAll(levelsSorted, i -> {
                    switch (i) {
                        case 0:
                        case 1:
                            String level = levels[levels.length - 1 - i];
                            //replace all the www's with a space so that they sort before any other name
                            return "www".equals(level) ? " " : level;
                        default:
                            level = levels[i];
                            return "www".equals(level) ? " " : level;
                    }
                });
                return StringUtils.join(levelsSorted, ".");
            }
            return url;
        } catch (MalformedURLException e) {
            return url;
        }

    }
}
