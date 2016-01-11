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
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.rx.cdi.Initialized;
import org.hawkular.rx.cdi.UpdateCommand;
import org.hawkular.rx.cdi.WithValues;
import org.hawkular.rx.commands.inventory.UpdateResourceCommand;

import rx.Observable;
import rx.Subscriber;

/**
 * @author Jirka Kremser
 */
@WithValues
@UpdateCommand
public class UpdateUrlCommand extends CreateUrlCommand {

    private String urlId;

    @Inject
    @Any
    private Instance<UpdateResourceCommand> updateResourceCommandInjector;

    @Override
    protected List<ImmutablePair<Class, Consumer>> getSetters() {
        return Arrays.asList(
                new ImmutablePair<>(String.class, (x) -> UpdateUrlCommand.this.urlId = nullOrStr(x)),
                new ImmutablePair<>(String.class, (x) -> UpdateUrlCommand.this.url = makeUrlWithProtocol(nullOrStr(x))),
                new ImmutablePair<>(String.class, (x) -> UpdateUrlCommand.this.authToken = nullOrStr(x)),
                new ImmutablePair<>(String.class, (x) -> UpdateUrlCommand.this.persona = nullOrStr(x))
        );
    }

    @Inject
    private UpdateUrlCommand(InjectionPoint ip) {
        super(ip);
    }

    @Override protected Observable<String> construct() {
        return Observable.create(new Observable.OnSubscribe<String>() {
            @Override
            public void call(Subscriber<? super String> observer) {
                if (observer.isUnsubscribed()) {
                    return;
                }
                try {
                    UpdateResourceCommand updateResourceCmd =
                            updateResourceCommandInjector.select(Initialized.withValues(urlId, authToken, persona))
                                    .get();

                    Resource.Update urlUpdate = Resource.Update.builder()
                            .withProperty("url", url)
                            .withProperty("hwk-gui-domainSort", getDomainSorterUrl(url))
                            .build();
                    updateResourceCmd.setResource(urlUpdate);
                    Observable<String> observeResource = updateResourceCmd.toObservable();

                    observeResource.subscribe((commandResponse) -> {
                        observer.onNext(commandResponse);
                    });

                } catch (Exception e) {
                    observer.onError(e);
                }
            }
        });
    }

}
