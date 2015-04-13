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

import org.hawkular.inventory.api.model.Environment;
import org.hawkular.inventory.api.model.MetricType;
import org.hawkular.inventory.api.model.MetricUnit;
import org.hawkular.inventory.api.model.ResourceType;
import org.hawkular.inventory.api.model.Tenant;
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
import javax.ws.rs.client.Entity;
import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.Response;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.function.Consumer;
import java.util.function.Function;

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

    private final String tenantId = "test";
    private final String environmentId = "test";

    @EJB
    public Pinger pinger;

    Set<PingDestination> destinations = new HashSet<>();

    @EJB
    public MetricPublisher metricPublisher;

    @PostConstruct
    public void startUp() {
        int attempts = 0;
        while (attempts++ < 10) {
            try {
                Client client = ClientBuilder.newClient();
                // TODO: inventory does not have to be co-located
                final String host = "http://localhost:8080";
                final String inventoryUrl = host + "/hawkular/inventory/";
                WebTarget target = client.target(inventoryUrl + tenantId + "/resourceTypes/URL/resources");
                Response response = target.request().get();

                if (isResponseOk(response.getStatus())) {
                    List list = response.readEntity(List.class);
                    if (list.isEmpty()) {
                        response.close();
                        target = client.target(inventoryUrl + "tenants");
                        response = target.request().post(Entity.json(new Tenant.Blueprint(tenantId)));
                        if (isResponseOk(response.getStatus())) {
                            response.close();

                            Function<String, Consumer<org.hawkular.inventory.api.model.Entity.Blueprint>>  create =
                                    path -> blueprint -> {
                                final WebTarget url = client.target(inventoryUrl + tenantId + path);
                                final Response resp = url.request().post(Entity.json(blueprint));
                                resp.close();
                            };

                            create.apply("/environments").accept(new Environment.Blueprint(environmentId));
                            create.apply("/resourceTypes").accept(new ResourceType.Blueprint("URL", "1.0"));
                            create.apply("/metricTypes").accept(new MetricType.Blueprint("status.duration.type",
                                    MetricUnit.MILLI_SECOND));
                            create.apply("/metricTypes").accept(new MetricType.Blueprint("status.code.type",
                                    MetricUnit.NONE));
                        }
                    } else {
                        for (Object o : list) {
                            if (o instanceof Map) {
                                Map<String, Object> m = (Map) o;
                                String id = (String) m.get("id");
                                Map<String, String> params = (Map<String, String>) m.get("properties");
                                String url = params.get("url");
                                destinations.add(new PingDestination(id, url));
                            }
                        }
                    }
                    response.close();
                    client.close();
                    return;
                } else {
                    Log.LOG.wNoInventoryFound(response.getStatus(), response.getStatusInfo().getReasonPhrase());
                }
            } catch (Exception e) {
                Log.LOG.wNoInventoryFound(-1, "Exception while trying to reach or read response of inventory: "
                        + e.getMessage());
            }

            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }

        Log.LOG.wNoInventoryFound(-1,
                "Inventory was not found on the configured location in 20s. Pinger won't function properly.");
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
        // In case of timeouts we will not be able to get the PingStatus from the Future, so use a Map
        // to keep track of what destination's ping actually hung.
        Map<Future<PingStatus>, PingStatus> futures = new HashMap<>(destinations.size());

        for (PingDestination destination : destinations) {
            PingStatus request = new PingStatus(destination);
            Future<PingStatus> result = pinger.ping(request);
            futures.put(result, request);
        }

        int round = 1;
        while (!futures.isEmpty() && round < ROUNDS) {
            Iterator<Future<PingStatus>> iterator = futures.keySet().iterator();
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

        // Cancel hanging pings and report them as timeouts
        for (Map.Entry<Future<PingStatus>, PingStatus> entry : futures.entrySet()) {
            entry.getKey().cancel(true);
            PingStatus ps = entry.getValue();
            ps.code = 503; // unavailable
            ps.timedOut = true;
            long now = System.currentTimeMillis();
            // (jshaughn) This used to be set explicitly to 10000, but I don't know why.  It seemed
            // dangerous because that could be in the future given that ROUNDS*WAIT_MILLIS < 10000.
            ps.duration = (int) (now - ps.getTimestamp());
            ps.setTimestamp(now);
            results.add(ps);
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

    private boolean isResponseOk(int code) {
        return code >= 200 && code < 300;
    }
}
