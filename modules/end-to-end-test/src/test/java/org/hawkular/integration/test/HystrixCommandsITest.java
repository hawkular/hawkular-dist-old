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
package org.hawkular.integration.test;

import java.util.concurrent.TimeUnit;

import javax.enterprise.inject.Any;
import javax.enterprise.inject.Instance;
import javax.inject.Inject;

import org.hawkular.inventory.api.model.Tenant;
import org.hawkular.rx.cdi.CreateCommand;
import org.hawkular.rx.cdi.CreateCommandLiteral;
import org.hawkular.rx.cdi.Initialized;
import org.hawkular.rx.cdi.UpdateCommand;
import org.hawkular.rx.cdi.UpdateCommandLiteral;
import org.hawkular.rx.commands.hawkular.CreateUrlCommand;
import org.hawkular.rx.commands.hawkular.DeleteUrlCommand;
import org.hawkular.rx.commands.hawkular.GetUrlCommand;
import org.hawkular.rx.commands.hawkular.UpdateUrlCommand;
import org.jboss.weld.environment.se.Weld;
import org.jboss.weld.environment.se.WeldContainer;
import org.junit.Assert;
import org.testng.annotations.Test;

import com.squareup.okhttp.Response;

import rx.Observable;

public class HystrixCommandsITest extends AbstractTestBase {

    private WeldContainer di;

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

    @Test
    public void testComplexScenario() throws Exception {
        this.di = new Weld()
                .initialize();
        String originalUrl = "www.redhat.com";
        String newUrl = "www.hawkular.org";

        Observable<String> getTenant = Observable.<String> defer(() -> {
            try {
                Response response =
                        client.newCall(newAuthRequest().url(baseURI + "/hawkular/inventory/tenant").build()).execute();
                Assert.assertEquals(200, response.code());
                Tenant tenant = mapper.readValue(response.body().string(), Tenant.class);
                // wait for the automagic in the inventory
                return Observable.just(tenant.getId()).delay(1, TimeUnit.SECONDS);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });

        // using the flatMap for chaining the events and assert functions as testing by side-effects (it's not pure
        // functional approach, but we need to check also the intermediate results, perhaps the .all/.filter could do
        // the trick)

        // get tenant id

        Observable<String> bigObs = getTenant.flatMap((String tenantId) -> {
            return di.select(CreateUrlCommand.class,
                CreateCommandLiteral.get(),
                Initialized.withValues(originalUrl, authHeader, tenantId))
                .get().toObservable()

            .flatMap((String location) -> {
                    Assert.assertNotNull(location);
                    Assert.assertNotEquals(location.trim().length(), 0);

                    String resId = location.substring(location.lastIndexOf("/") + 1);
                    Assert.assertNotEquals(resId.trim().length(), 0);
                    System.out.println("created url with id: "+ resId);

                    // try to retrieve it
                    return getUrl(resId, tenantId)
                        .flatMap( url -> {
                            Assert.assertTrue(url.contains(originalUrl));

                        // change the url
                        return updateUrl(resId, newUrl, tenantId);
                    })

                    // try to retrieve it
                    .flatMap(foo -> getUrl(resId, tenantId))
                    .flatMap(url -> {
                        Assert.assertTrue(url.contains(newUrl));

                        // delete the url
                        return deleteUrl(resId, tenantId);
                    })
                    .flatMap(foo -> {
                        // get all urls
                        return getUrl(null, tenantId);
                    });
                });
        })
        .doOnError(e -> {
            System.out.println(e.getMessage());
            Assert.fail("fail: " + e.getMessage());
        });

        System.out.println("observable pipes initialized");

        // wait for the pipe
        String urlJsonList = bigObs.toBlocking().first();

        // check that nothing is there
        Assert.assertEquals("[ ]", urlJsonList);
    }

    // todo: use this observer for all changes, if it's possible (zip combinator w/ other streams)
    private Observable<String> getUrl(String id, String tenantId) {
        return di.select(GetUrlCommand.class, Initialized.withValues(id, authHeader, tenantId)).get().toObservable();
    }

    private Observable<String> updateUrl(String id, String newUrl, String tenantId) {
        return di.select(UpdateUrlCommand.class,
                UpdateCommandLiteral.get(),
                Initialized.withValues(id, newUrl, authHeader, tenantId))
                .get().toObservable();
    }

    private Observable<String> deleteUrl(String id, String tenantId) {
        return di.select(DeleteUrlCommand.class, Initialized.withValues(id, authHeader, tenantId)).get()
                .toObservable();
    }
}
