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
import org.junit.Test;

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

    private static PingDestination newDestination(String url, String method) {
        return new PingDestination(TEST_TENANT_ID, TEST_ENVIRONMENT_ID, TEST_RESOURCE_ID, url, method);
    }

    @Test
    public void testPinger() throws Exception {

        Pinger pinger = new Pinger();
        PingDestination destination = newDestination("http://hawkular.github.io", "GET");
        PingStatus status = pinger.ping(destination).get();

        Assert.assertEquals(200, status.getCode());
        Assert.assertFalse(status.isTimedOut());

    }

    @Test
    public void testHeadPinger() throws Exception {

        Pinger pinger = new Pinger();
        PingDestination destination = newDestination("http://hawkular.github.io", "HEAD");
        PingStatus status = pinger.ping(destination).get();

        Assert.assertEquals(200, status.getCode());
        Assert.assertFalse(status.isTimedOut());

    }

    @Test
    public void testPostPinger() throws Exception {

        Pinger pinger = new Pinger();
        PingDestination destination = newDestination("https://www.perfcake.org", "POST");
        PingStatus status = pinger.ping(destination).get();

        Assert.assertEquals(200, status.getCode());
        Assert.assertFalse(status.isTimedOut());

    }

    @Test
    public void testSslPinger() throws Exception {

        Pinger pinger = new Pinger();
        PingDestination destination = newDestination("https://www.perfcake.org", "GET");
        PingStatus status = pinger.ping(destination).get();

        Assert.assertEquals(200, status.getCode());
        Assert.assertFalse(status.isTimedOut());
    }

}
