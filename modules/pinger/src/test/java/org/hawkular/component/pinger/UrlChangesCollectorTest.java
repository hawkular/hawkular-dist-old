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

import java.util.HashSet;
import java.util.Set;

import org.hawkular.inventory.api.model.Resource;
import org.junit.Assert;
import org.junit.Test;

/**
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
public class UrlChangesCollectorTest {

    @Test
    public void testAdd() {

        UrlChangesCollector collector = new UrlChangesCollector();
        Resource urlResource = PingerTestUtils.createTestResource();

        collector.getUrlCreatedAction().call(urlResource);

        Set<PingDestination> destinations = new HashSet<PingDestination>();
        collector.apply(destinations);

        Assert.assertEquals(1, destinations.size());
        Assert.assertEquals(PingerTestUtils.createTestPingDestination(), destinations.iterator().next());

    }

    @Test
    public void testAddRemoveSeparateApply() {

        UrlChangesCollector collector = new UrlChangesCollector();
        Resource urlResource = PingerTestUtils.createTestResource();

        collector.getUrlCreatedAction().call(urlResource);

        Set<PingDestination> destinations = new HashSet<PingDestination>();
        collector.apply(destinations);

        Assert.assertEquals(1, destinations.size());
        Assert.assertEquals(PingerTestUtils.createTestPingDestination(), destinations.iterator().next());

        collector.getUrlDeletedAction().call(urlResource);
        collector.apply(destinations);
        Assert.assertEquals(0, destinations.size());

    }

    @Test
    public void testAddRemoveSameApply() {

        UrlChangesCollector collector = new UrlChangesCollector();
        Resource urlResource = PingerTestUtils.createTestResource();

        collector.getUrlCreatedAction().call(urlResource);
        collector.getUrlDeletedAction().call(urlResource);

        Set<PingDestination> destinations = new HashSet<PingDestination>();
        collector.apply(destinations);

        Assert.assertEquals(0, destinations.size());

    }

}
