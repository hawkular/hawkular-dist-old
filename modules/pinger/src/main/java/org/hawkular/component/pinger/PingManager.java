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
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

import javax.annotation.PostConstruct;
import javax.ejb.EJB;
import javax.ejb.Lock;
import javax.ejb.LockType;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.Startup;

import org.hawkular.inventory.api.Action;
import org.hawkular.inventory.api.Interest;
import org.hawkular.inventory.api.Inventory;
import org.hawkular.inventory.api.filters.With;
import org.hawkular.inventory.api.model.Resource;

/**
 * A SLSB that coordinates the pinging of resources
 *
 * @author Heiko W. Rupp
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
@Startup
@Singleton
public class PingManager {

    /** How many rounds a WAIT_MILLIS do we wait for results to come in? */
    private static final int ROUNDS = 15;
    /** How long do we wait between each round in milliseconds */
    private static final int WAIT_MILLIS = 500;
    /**
     * Rough timeout in milliseconds for the pings after which the pings are cancelled and reported as timeouted. Note
     * that in practice, the real time given to pings can be longer.
     */
    private static final int TIMEOUT_MILLIS = ROUNDS * WAIT_MILLIS;

    @EJB
    Pinger pinger;

    private final Set<PingDestination> destinations = new HashSet<>();

    @EJB
    MetricPublisher metricPublisher;

    @EJB
    TraitsPublisher traitsPublisher;

    @javax.annotation.Resource(lookup = "java:global/Hawkular/Inventory")
    Inventory inventory;

    final UrlChangesCollector urlChangesCollector = new UrlChangesCollector();

    @PostConstruct
    public void startUp() {

        /*
         * Add the observers before reading the existing URLs from the inventory so that we do not loose the URLs that
         * could have been added or removed between those two calls.
         */
        inventory.observable(Interest.in(Resource.class).being(Action.created())).subscribe(
                urlChangesCollector.getUrlCreatedAction());
        inventory.observable(Interest.in(Resource.class).being(Action.deleted())).subscribe(
                urlChangesCollector.getUrlDeletedAction());

        // we use just an observable inventory here, because it allows us to see all the tenants. This essentially
        // circumvents any authz present on the inventory.
        // We need that though because pinger doesn't have storage of its own and is considered "trusted", so it's ok.
        Set<Resource> urls = inventory.tenants().getAll().allResourceTypes().getAll(With.id(PingDestination.URL_TYPE))
                .resources().getAll().entities();
        Log.LOG.iInitializedWithUrls(urls.size());

        for (Resource r : urls) {
            PingDestination dest = PingDestination.from(r);
            destinations.add(dest);
            Log.LOG.debugf("Added initial URL to ping: %s", dest.getUrl());
        }
    }

    /**
     * This method triggers the actual work by starting pingers, collecting their return values and then publishing
     * them.
     * <p>
     * Concurrency assumptions:
     * <ul>
     * <li>{@link #scheduleWork()} will not overlap with {@link #startUp()} - we assume this to be granted by the EE
     * container.
     * <li>Individual {@link #scheduleWork()} invocations will not overlap each other - we also assume this to be
     * granted by the EE container.
     */
    @Lock(LockType.READ)
    @Schedule(minute = "*", hour = "*", second = "0,20,40", persistent = false)
    public void scheduleWork() {

        Log.LOG.debugf("Pinger awake to ping");

        /* Apply URL additions and removals collected in between. */
        urlChangesCollector.apply(this.destinations);

        if (destinations.size() == 0) {
            Log.LOG.debugf("Nothing to ping");
            return;
        }

        doThePing(destinations);
    }

    /**
     * Runs the pinging work on the provided list of destinations. The actual pings are scheduled to run in parallel in
     * a thread pool. After ROUNDS*WAIT_MILLIS, remaining pings are cancelled and an error
     *
     * @param destinations Set of destinations to ping
     */
    private void doThePing(Set<PingDestination> destinations) {
        Log.LOG.debugf("About to ping %d URLs", destinations.size());

        List<PingStatus> results = new ArrayList<>(destinations.size());
        // In case of timeouts we will not be able to get the PingStatus from the Future, so use a Map
        // to keep track of what destination's ping actually hung.
        Map<Future<PingStatus>, PingDestination> futures = new HashMap<>(destinations.size());

        for (PingDestination destination : destinations) {
            Future<PingStatus> result = pinger.ping(destination);
            futures.put(result, destination);
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
                        e.printStackTrace(); // TODO: Customise this generated block
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
        for (Map.Entry<Future<PingStatus>, PingDestination> entry : futures.entrySet()) {
            entry.getKey().cancel(true);
            PingDestination destination = entry.getValue();
            final long now = System.currentTimeMillis();
            PingStatus ps = PingStatus.timeout(destination, now, TIMEOUT_MILLIS);
            results.add(ps);
            Log.LOG.debugf("Timed out: %s", destination.getUrl());
        }

        reportResults(results);
    }

    private void reportResults(List<PingStatus> results) {

        if (results.size() == 0) {
            return;
        }

        for (PingStatus status : results) {
            metricPublisher.sendToMetricsViaRest(status);
            metricPublisher.publishToTopic(status);
            traitsPublisher.publish(status);
        }

    }

}
