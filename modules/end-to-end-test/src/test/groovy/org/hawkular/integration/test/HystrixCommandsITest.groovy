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
package org.hawkular.integration.test

import org.hawkular.rx.cdi.*
import org.hawkular.rx.commands.hawkular.CreateUrlCommand
import org.hawkular.rx.commands.hawkular.DeleteUrlCommand
import org.hawkular.rx.commands.hawkular.GetUrlCommand
import org.hawkular.rx.commands.hawkular.UpdateUrlCommand
import org.jboss.weld.environment.se.Weld
import org.junit.AfterClass
import org.junit.Assert
import org.junit.Test
import rx.Observable

import javax.enterprise.inject.Any
import javax.enterprise.inject.Instance
import javax.inject.Inject
import java.util.concurrent.TimeUnit

import static org.junit.Assert.*

class HystrixCommandsITest extends AbstractTestBase {

    private di

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
            .initialize()
        def originalUrl = "www.redhat.com"
        def newUrl = "www.hawkular.org"

        def Observable<String> getTenant = Observable.<String>defer({ ->
            def response = client.get(path: "/hawkular/inventory/tenant")
            assertEquals(200, response.status)
            // wait for the automagic in the inventory
            Observable.just(response.data.id).delay(1, TimeUnit.SECONDS)
        })

        // using the flatMap for chaining the events and assert functions as testing by side-effects (it's not pure
        // functional approach, but we need to check also the intermediate results, perhaps the .all/.filter could do
        // the trick)

        // get tenant id
        def bigObs = getTenant.flatMap({String tenantId ->
            // create a new url
            di.select(CreateUrlCommand.class,
                CreateCommandLiteral.get(),
                Initialized.withValues(originalUrl, authHeader, tenantId))
                .get().toObservable()
            .flatMap({ String location ->
                assertNotNull(location)
                assertNotEquals(location.trim().length(), 0)

                def String resId = location.substring(location.lastIndexOf("/") + 1)
                assertNotEquals(resId.trim().length(), 0)
                println "created url with id: $resId"

                // try to retrieve it
                getUrl(resId, tenantId)
                    .flatMap({ url ->
                    assertTrue(url.contains(originalUrl))

                    // change the url
                    updateUrl(resId, newUrl, tenantId)
                })

                // try to retrieve it
                .flatMap({foo -> getUrl(resId, tenantId) })
                .flatMap({url ->
                    assertTrue(url.contains(newUrl))

                    // delete the url
                    deleteUrl(resId, tenantId)
                })
                .flatMap({foo ->
                    // get all urls
                    getUrl(null, tenantId)
                })
            })
        })
        .doOnError({e ->
            println e.getMessage()
            Assert.fail("fail: " + e.getMessage())
        })
        println "observable pipes initialized"

        // wait for the pipe
        def String urlJsonList = bigObs.toBlocking().first()

        // check that nothing is there
        assertEquals("[ ]", urlJsonList)
    }

    @AfterClass
    static void cleanUp() {

    }

    private void assertResponseOk(int responseCode) {
        assertTrue("Response code should be 2xx or 304 but was "+ responseCode,
                (responseCode >= 200 && responseCode < 300) || responseCode == 304)
    }

    // todo: use this observer for all changes, if it's possible (zip combinator w/ other streams)
    private Observable<String> getUrl(String id, String tenantId) {
        return di.select(GetUrlCommand.class, Initialized.withValues(id, authHeader, tenantId)).get().toObservable()
    }

    private Observable<String> updateUrl(String id, String newUrl, String tenantId) {
        return di.select(UpdateUrlCommand.class,
            UpdateCommandLiteral.get(),
            Initialized.withValues(id, newUrl, authHeader, tenantId))
            .get().toObservable()
    }

    private Observable<String> deleteUrl(String id, String tenantId) {
        return di.select(DeleteUrlCommand.class, Initialized.withValues(id, authHeader, tenantId)).get().toObservable()
    }
}
