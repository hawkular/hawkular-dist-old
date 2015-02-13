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

import org.hawkular.metrics.client.common.SingleMetric;

import javax.annotation.PostConstruct;
import javax.ejb.EJB;
import javax.ejb.Lock;
import javax.ejb.LockType;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.ws.rs.client.Client;
import javax.ws.rs.client.ClientBuilder;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.Response;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * A SLSB that coordinates the pinging of resources
 *
 * @author Heiko W. Rupp
 */
@Startup
@Singleton
public class PingManager {

    String tenantId = "rest-test";

    @EJB
    public
    Pinger pinger;

    Set<PingDestination> destinations = new HashSet<>();

    @EJB
    MetricPublisher metricPublisher;

    @PostConstruct
    public void startUp() {

        Client client = ClientBuilder.newClient();
        WebTarget target = client.target("http://localhost:8080/hawkular/inventory/" + tenantId + "/resources");
        target.queryParam("type","URL");
        Response response = target.request().get();

        if (response.getStatus()==200) {

            List list = response.readEntity(List.class); // TODO -> String.class and then Gson.fromJson ?


            for (Object o  : list) {
                if (o instanceof Map) {

                    Map<String,Object> m = (Map) o;
                    String id = (String) m.get("id");
                    String type = (String) m.get("type");
                    Map<String,String> params = (Map<String, String>) m.get("parameters");
                    String url = params.get("url");
                    destinations.add(new PingDestination(id,url));
                }
            }
        }
    }


    /**
     * This method does the actual work
     */
    @Lock(LockType.READ)
    @Schedule(minute = "*", hour = "*", persistent = false)
    public void scheduleWork() {

        List<PingStatus> results = new ArrayList<>(destinations.size());

        for (PingDestination destination : destinations) {
            PingStatus result = pinger.ping(destination);
            results.add(result);
        }

        reportResults(results);
    }

    private void reportResults(List<PingStatus> results) {


        List<SingleMetric> metrics = new ArrayList<>(results.size());
        for (PingStatus status : results){
            SingleMetric m = new SingleMetric(status.destination.name() + ".duration",
                    status
                    .getTimestamp(), (double) status.getDuration());
            metrics.add(m);
            m = new SingleMetric(status.destination.name() + ".code",
                    status
                    .getTimestamp(), (double) status.getCode());
            metrics.add(m);

        }

        // Send them away
        metricPublisher.sendToMetricsViaRest(tenantId, metrics);
        metricPublisher.publishToTopic(metrics);



    }

    public void addDestination(PingDestination s) {
        destinations.add(s);
    }

    public List<PingDestination> getDestinations() {
        return new ArrayList<>(destinations);
    }

    public void removeDestination(PingDestination url) {
        destinations.remove(url);
    }

}
