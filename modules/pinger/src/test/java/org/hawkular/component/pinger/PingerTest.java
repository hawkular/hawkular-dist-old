/*
 * Copyright 2015 Red Hat, Inc. and/or its affiliates
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
package org.hawkular.component.pinger;

import org.junit.Assert;
import org.junit.Rule;
import org.junit.Test;

import com.github.tomakehurst.wiremock.client.WireMock;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import com.github.tomakehurst.wiremock.junit.WireMockRule;

/**
 * Simple test for the pinger
 *
 * @author Heiko W. Rupp
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
public class PingerTest {

    private static final String TEST_RESOURCE_ID = "test-rsrc";
    private static final String TEST_TENANT_ID = "test-tenat";
    private static final String TEST_ENVIRONMENT_ID = "test-env";
    public static final String HTTP_PORT_PROPERTY = "org.hawkular.component.pinger.PingerTest.http.port";
    public static final String HTTPS_PORT_PROPERTY = "org.hawkular.component.pinger.PingerTest.https.port";
    public static final String TEST_HOST = "localhost";
    private static final int HTTP_PORT;
    private static final int HTTPS_PORT;
    static {
        HTTP_PORT = Integer.parseInt(System.getProperty(HTTP_PORT_PROPERTY, "8877"));
        HTTPS_PORT = Integer.parseInt(System.getProperty(HTTPS_PORT_PROPERTY, "8878"));
    }

    @Rule
    public WireMockRule testServer = new WireMockRule(WireMockConfiguration.wireMockConfig().port(HTTP_PORT)
            .httpsPort(HTTPS_PORT));

    private static PingDestination newDestination(String url, String method) {
        return new PingDestination(TEST_TENANT_ID, TEST_ENVIRONMENT_ID, TEST_RESOURCE_ID, url, method);
    }

    private static String httpUrl() {
        return "http://" + TEST_HOST + ":" + HTTP_PORT;
    }

    private static String httpsUrl() {
        return "https://" + TEST_HOST + ":" + HTTPS_PORT;
    }

    @Test
    public void testPinger() throws Exception {

        testServer.stubFor(WireMock.get(WireMock.urlMatching(".*")).willReturn(
                WireMock.aResponse().withHeader("Content-Type", "text/plain").withBody("Hello world!")));

        Pinger pinger = new Pinger();
        PingDestination destination = newDestination(httpUrl(), "GET");
        PingStatus status = pinger.ping(destination).get();

        Assert.assertEquals(200, status.getCode());
        Assert.assertFalse(status.isTimedOut());

    }

    @Test
    public void testHeadPinger() throws Exception {
        testServer.stubFor(WireMock.head(WireMock.urlMatching(".*")).willReturn(
                WireMock.aResponse().withHeader("Content-Type", "text/plain")));

        Pinger pinger = new Pinger();
        PingDestination destination = newDestination(httpUrl(), "HEAD");
        PingStatus status = pinger.ping(destination).get();

        Assert.assertEquals(200, status.getCode());
        Assert.assertFalse(status.isTimedOut());

    }

    @Test
    public void testPostPinger() throws Exception {
        testServer.stubFor(WireMock.post(WireMock.urlMatching(".*")).willReturn(
                WireMock.aResponse().withHeader("Content-Type", "text/plain").withBody("Hello world!")));

        Pinger pinger = new Pinger();
        PingDestination destination = newDestination(httpUrl(), "POST");
        PingStatus status = pinger.ping(destination).get();

        Assert.assertEquals(200, status.getCode());
        Assert.assertFalse(status.isTimedOut());

    }

    @Test
    public void testSslPinger() throws Exception {

        testServer.stubFor(WireMock.get(WireMock.urlMatching(".*")).willReturn(
                WireMock.aResponse().withHeader("Content-Type", "text/plain").withBody("Hello world!")));

        Pinger pinger = new Pinger();
        PingDestination destination = newDestination(httpsUrl(), "GET");
        PingStatus status = pinger.ping(destination).get();

        Assert.assertEquals(200, status.getCode());
        Assert.assertFalse(status.isTimedOut());
    }

}
