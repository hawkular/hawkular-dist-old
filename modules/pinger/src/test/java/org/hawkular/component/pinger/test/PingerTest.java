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

import org.hawkular.component.pinger.PingManager;
import org.hawkular.component.pinger.PingStatus;
import org.hawkular.component.pinger.Pinger;
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
        PingStatus status = pinger.ping("http://hawkular.github.io");

        assert status.getCode()==200;
        assert status.isTimedOut()==false;

    }

    @Test
    public void testPingManagerTest() throws Exception {

        PingManager manager = new PingManager();
        manager.pinger = new Pinger();
        manager.scheduleWork();

    }
}
