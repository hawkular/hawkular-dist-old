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

import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import java.util.ArrayList;
import java.util.List;

/**
 * A SLSB that coordinates the pinging of resources
 *
 * @author Heiko W. Rupp
 */
@Startup
@Singleton
public class PingManager {

    @EJB
    public
    Pinger pinger;

    String[] destinations = {
            "http://jboss.org/rhq",
            "http://www.redhat.com/",
            "http://hawkular.github.io/"};




    @Schedule(minute = "*")
    public void scheduleWork() {

        List<PingStatus> results = new ArrayList<>(destinations.length);

        for (String url : destinations) {
            PingStatus result = pinger.ping(url);
            results.add(result);
        }

        reportResults(results);
    }

    private void reportResults(List<PingStatus> results) {
        for (PingStatus ps : results) {
            System.err.println(ps);
        }
    }
}
