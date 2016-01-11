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

import javax.enterprise.inject.Any;
import javax.enterprise.inject.Instance;
import javax.enterprise.inject.spi.InjectionPoint;
import javax.inject.Inject;

import org.apache.commons.lang3.tuple.ImmutablePair;
import org.hawkular.rx.cdi.Initialized;
import org.hawkular.rx.cdi.WithValues;
import org.hawkular.rx.commands.common.AbstractHttpCommand;
import org.hawkular.rx.commands.common.HawkularConfiguration;
import org.hawkular.rx.commands.inventory.DeleteMetricCommand;
import org.hawkular.rx.commands.inventory.DeleteResourceCommand;
import org.hawkular.rx.httpclient.HttpClient;

import com.netflix.hystrix.HystrixCommandGroupKey;

import rx.Observable;
import rx.Subscriber;

/**
 * @author Jirka Kremser
 */
@WithValues
public class DeleteUrlCommand extends AbstractHttpCommand<String> {

    protected String urlId;

    protected String authToken;

    protected String persona;

    @Inject
    protected HttpClient client;

    @Inject
    protected HawkularConfiguration config;

    @Inject
    @Any
    private Instance<DeleteResourceCommand> deleteResourceCommandInjector;

    @Inject
    @Any
    private Instance<DeleteMetricCommand> deleteMetricCommandInjector;

    @Override
    protected List<ImmutablePair<Class, Consumer>> getSetters() {
        return Arrays.asList(
                new ImmutablePair<>(String.class, (x) -> DeleteUrlCommand.this.urlId = nullOrStr(x)),
                new ImmutablePair<>(String.class, (x) -> DeleteUrlCommand.this.authToken = nullOrStr(x)),
                new ImmutablePair<>(String.class, (x) -> DeleteUrlCommand.this.persona = nullOrStr(x))
        );
    }

    @Inject
    protected DeleteUrlCommand(InjectionPoint ip) {
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
                    // todo: deleting the resource itself should be enough (no need to delete the metrics first)

                    final String metric1Id = urlId + ".status.duration";
                    final String metric2Id = urlId + ".status.code";

                    DeleteMetricCommand deleteMetric1Cmd =
                            deleteMetricCommandInjector.select(Initialized.withValues(metric1Id, authToken, persona))
                                    .get();
                    deleteMetric1Cmd.setResourcePath(urlId);
                    DeleteMetricCommand deleteMetric2Cmd =
                            deleteMetricCommandInjector.select(Initialized.withValues(metric2Id, authToken, persona))
                                    .get();
                    deleteMetric2Cmd.setResourcePath(urlId);

                    DeleteResourceCommand deleteResourceCmd =
                            deleteResourceCommandInjector.select(Initialized.withValues(urlId, authToken, persona))
                                    .get();

                    Observable<String> observeCmd1 = deleteMetric1Cmd.toObservable();
                    Observable<String> observeCmd2 = deleteMetric2Cmd.toObservable();
                    Observable<String> observeDeleteResource = deleteResourceCmd.toObservable();

                    // make the first 2 calls in parallel and the third one after they finish
                    observeCmd1
                            .zipWith(observeCmd2, (first, second) -> new ImmutablePair(first, second))
                            .flatMap((pair) -> observeDeleteResource).buffer(2).subscribe((aggregatedCmdResponse) -> {
                        observer.onNext(aggregatedCmdResponse.get(1));
                        observer.onCompleted();
                    });

//                    observeCmd1.mergeWith(observeCmd2).concatWith(observeDeleteResource).subscribe(
//                            (commandResponse) -> {
//                                observer.onNext(commandResponse);
//                            });

                } catch (Exception e) {
                    observer.onError(e);
                }
            }
        });
    }

//    @Override
//    protected String getCacheKey() {
//        return urlId;
//    }

    @Override
    protected Observable<String> resumeWithFallback() {
        return Observable.just(urlId);
    }

}
