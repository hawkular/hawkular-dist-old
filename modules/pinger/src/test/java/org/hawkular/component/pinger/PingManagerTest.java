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
package org.hawkular.component.pinger;

import org.hawkular.inventory.api.model.Resource;
import org.junit.Assert;
import org.junit.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

/**
 * Simple test for the pinger
 *
 * @author Heiko W. Rupp
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
public class PingManagerTest {

    @Test
    public void testScheduleWork() throws Exception {

        PingManager manager = new PingManager();
        manager.pinger = new Pinger();

        Resource urlResource = PingerTestUtils.createTestResource();

        manager.urlChangesCollector.getUrlCreatedAction().call(urlResource);

        manager.metricPublisher = Mockito.mock(MetricPublisher.class);
        manager.traitsPublisher = Mockito.mock(TraitsPublisher.class);

        manager.scheduleWork();

        PingDestination expectedDest = PingerTestUtils.createTestPingDestination();

        String expectedPoweredBy = "GitHub.com";

        ArgumentCaptor<PingStatus> metricsRestStatusCaptor = ArgumentCaptor.forClass(PingStatus.class);
        Mockito.verify(manager.metricPublisher).publish(metricsRestStatusCaptor.capture());
        assertStatus(expectedDest, expectedPoweredBy, metricsRestStatusCaptor.getValue());

        ArgumentCaptor<PingStatus> traitsStatusCaptor = ArgumentCaptor.forClass(PingStatus.class);
        Mockito.verify(manager.traitsPublisher).publish(traitsStatusCaptor.capture());
        assertStatus(expectedDest, expectedPoweredBy, traitsStatusCaptor.getValue());

    }

    private static void assertStatus(PingDestination expectedDest, String expectedPoweredBy,
            PingStatus foundStatus) {
        Assert.assertEquals(expectedDest, foundStatus.getDestination());
        Assert.assertEquals(expectedPoweredBy, foundStatus.getTraits().getPoweredBy());
    }
}
