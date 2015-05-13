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
package org.hawkular.component.pinger.test;

import java.util.List;
import java.util.Map;

import org.hawkular.component.pinger.MetricPublisher;
import org.hawkular.component.pinger.PingDestination;
import org.hawkular.component.pinger.PingManager;
import org.hawkular.component.pinger.PingStatus;
import org.hawkular.component.pinger.Pinger;
import org.hawkular.metrics.client.common.SingleMetric;
import org.junit.Test;

/**
 * Simple test for the pinger
 *
 * @author Heiko W. Rupp
 */
public class PingerTest {

    @org.junit.Test
    public void testPinger() throws Exception {

        Pinger pinger = new Pinger();
        PingDestination destination = new PingDestination("123","http://hawkular.github.io");
        PingStatus status = pinger.ping(new PingStatus(destination)).get();

        assert status.getCode()==200;
        assert status.isTimedOut()==false;

    }

    @org.junit.Test
    public void testSslPinger() throws Exception {

        Pinger pinger = new Pinger();
        PingDestination destination = new PingDestination("123","https://www.perfcake.org");
        PingStatus status = pinger.ping(new PingStatus(destination)).get();

        assert status.getCode()==200;
        assert status.isTimedOut()==false;
    }

    @Test
    public void testPingManagerSimple() throws Exception {

        PingManager manager = new PingManager();
        manager.pinger = new Pinger();
        manager.metricPublisher = new NoOpMetricPublisher();
        PingDestination destination = new PingDestination("123","http://hawkular.github.io");
        manager.addDestination(destination);
        manager.metricPublisher = new MetricPublisher();
        try {
            manager.scheduleWork();
        } catch (javax.ws.rs.ProcessingException e) {
            // It's ok, as we may not have the full Jax-RS client stack available
        }

    }

    /**
     * This test tests the startup code. It requires a
     * running inventory instance
     * @throws Exception
     */
    @Test
    public void testPingManagerStartup() throws Exception {

        PingManager manager = new PingManager();
        try {
            manager.startUp();
        } catch (javax.ws.rs.ProcessingException e) {
            // It's ok, as we may not have the full Jax-RS client stack available
        }
        List<PingDestination> destinations = manager.getDestinations();
        manager.pinger = new Pinger();
        manager.scheduleWork();

    }


    private class NoOpMetricPublisher extends MetricPublisher {
        @Override
        public void sendToMetricsViaRest(String tenantId, List<Map<String, Object>> metrics) {

        }

        @Override
        public void publishToTopic(String tenantId, List<SingleMetric> metrics) {

        }
    }
}
