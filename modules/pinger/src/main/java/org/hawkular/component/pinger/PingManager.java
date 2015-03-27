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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

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

import org.hawkular.metrics.client.common.SingleMetric;

/**
 * A SLSB that coordinates the pinging of resources
 *
 * @author Heiko W. Rupp
 */
@Startup
@Singleton
public class PingManager {

    // How many rounds a WAIT_MILLIS do we wait for results to come in?
    private static final int ROUNDS = 15;
    // How long do we wait between each round
    private static final int WAIT_MILLIS = 500;

    String tenantId = "test";

    @EJB
    public Pinger pinger;

    Set<PingDestination> destinations = new HashSet<>();

    @EJB
    public MetricPublisher metricPublisher;

    @PostConstruct
    public void startUp() {

        Client client = ClientBuilder.newClient();
        WebTarget target = client.target("http://localhost:8080/hawkular/inventory/" + tenantId + "/resources");
        target.queryParam("type", "URL");
        Response response = target.request().get();

        if (response.getStatus() == 200) {

            List list = response.readEntity(List.class);

            for (Object o : list) {
                if (o instanceof Map) {

                    Map<String, Object> m = (Map) o;
                    String id = (String) m.get("id");
                    String type = (String) m.get("type");
                    Map<String, String> params = (Map<String, String>) m.get("parameters");
                    String url = params.get("url");
                    destinations.add(new PingDestination(id, url));
                }
            }
        }
        else {
            Log.LOG.wNoInventoryFound(response.getStatus(), response.getStatusInfo().getReasonPhrase());
        }
    }

    /**
     * This method triggers the actual work by starting pingers,
     * collecting their return values and then publishing them.
     */
    @Lock(LockType.READ)
    @Schedule(minute = "*", hour = "*", second = "0,20,40", persistent = false)
    public void scheduleWork() {

        if (destinations.size() == 0) {
            return;
        }

        doThePing(destinations);
    }

    /**
     * Runs the pinging work on the provided list of destinations.
     * The actual pings are scheduled to run in parallel in a thread pool.
     * After ROUNDS*WAIT_MILLIS, remaining pings are cancelled and
     * an error
     * @param destinations Set of destinations to ping
     */
    private void doThePing(Set<PingDestination> destinations) {
        List<PingStatus> results = new ArrayList<>(destinations.size());
        List<Future<PingStatus>> futures = new ArrayList<>(destinations.size());

        for (PingDestination destination : destinations) {
            Future<PingStatus> result = pinger.ping(destination);
            futures.add(result);
        }

        int round = 1;
        while (!futures.isEmpty() && round < ROUNDS) {
            Iterator<Future<PingStatus>> iterator = futures.iterator();
            while (iterator.hasNext()) {
                Future<PingStatus> f = iterator.next();
                if (f.isDone()) {
                    try {
                        results.add(f.get());
                    } catch (InterruptedException | ExecutionException e) {
                        e.printStackTrace();  // TODO: Customise this generated block
                    }
                    iterator.remove();
                }
            }
            try {
                Thread.sleep(WAIT_MILLIS); // wait until the next iteration
            } catch (InterruptedException e) {
                // We don't care
            }
            round++;
        }

        // See if there are hanging items and cancel them away
        if (!futures.isEmpty()) {
            // We have waited 10 seconds above for results to come in.
            // What is now left will be cancelled and marked as timed out
            for (Future<PingStatus> f : futures) {
                f.cancel(true);
                PingStatus ps = null;
                try {
                    ps = f.get();
                    // can be null if the future did not complete
                    // TODO this timeout logic needs to be fixed to actually provide a result
                    if (null != ps) {
                        ps.timedOut = true;
                        ps.duration = 10000;
                        results.add(ps);
                    }
                } catch (InterruptedException | ExecutionException e) {
                    e.printStackTrace();  // TODO: Customise this generated block
                } catch ( CancellationException e ) {
                    // do nothing
                }
            }
        }

        reportResults(results);
    }

    private void reportResults(List<PingStatus> results) {

        if (results.size() == 0) {
            return;
        }

        List<SingleMetric> singleMetrics = new ArrayList<>(results.size());
        List<Map<String, Object>> mMetrics = new ArrayList<>();

        for (PingStatus status : results) {

            addDataItem(mMetrics, status, status.duration, "duration");
            addDataItem(mMetrics, status, status.code, "code");

            // for the topic to alerting
            SingleMetric singleMetric = new SingleMetric(status.destination.resourceId + ".status.duration",
                    status.getTimestamp(), (double) status.getDuration());
            singleMetrics.add(singleMetric);
            singleMetric = new SingleMetric(status.destination.resourceId + ".status.code",
                    status.getTimestamp(), (double) status.getCode());
            singleMetrics.add(singleMetric);

        }

        // Send them away
        metricPublisher.sendToMetricsViaRest(tenantId, mMetrics);
        metricPublisher.publishToTopic(tenantId, singleMetrics);

    }

    private void addDataItem(List<Map<String, Object>> mMetrics, PingStatus status, Number value, String name) {
        Map<String, Number> dataMap = new HashMap<>(2);
        dataMap.put("timestamp", status.getTimestamp());
        dataMap.put("value", value);
        List<Map<String, Number>> data = new ArrayList<>(1);
        data.add(dataMap);
        Map<String, Object> outer = new HashMap<>(2);
        outer.put("id", status.destination.resourceId + ".status." + name);
        outer.put("data", data);
        mMetrics.add(outer);
    }

    /**
     * Add a new destination into the system. This triggers an immediate
     * ping and then adding to the list of destinations.
     * @param pd new Destination
     */
    public void addDestination(PingDestination pd) {
        destinations.add(pd);
    }

    public List<PingDestination> getDestinations() {
        return new ArrayList<>(destinations);
    }

    public void removeDestination(PingDestination url) {
        destinations.remove(url);
    }

}
