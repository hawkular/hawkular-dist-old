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

import org.hawkular.inventory.api.Action;
import org.hawkular.inventory.api.Interest;
import org.hawkular.inventory.api.Inventory;
import org.hawkular.inventory.api.filters.With;
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.inventory.cdi.Observable;
import org.hawkular.inventory.cdi.ObservableAutoTenant;
import rx.functions.Action1;

import javax.annotation.PostConstruct;
import javax.ejb.EJB;
import javax.ejb.Lock;
import javax.ejb.LockType;
import javax.ejb.Schedule;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.inject.Inject;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;

/**
 * A SLSB that coordinates the pinging of resources
 *
 * @author Heiko W. Rupp
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
@Startup
@Singleton
public class PingManager {

    /**
     * Collects new URLs reported by {@link PingManager#inventory} and synchronizes the various threads reporting the
     * new URLs and those ones consuming them.
     *
     * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
     */
    static class NewUrlsCollector implements Action1<Resource> {
        private List<PingDestination> newUrls = new ArrayList<>();

        /**
         * A callback for the {@link Inventory} that collects newly added URLs. It is safe to call this method
         * concurrently from any random thread.
         *
         * @see rx.functions.Action1#call(java.lang.Object)
         */
        @Override
        public void call(Resource r) {
            if (PingDestination.isUrl(r)) {
                synchronized (this) {
                    newUrls.add(PingDestination.from(r));
                }
            }
        }

        /**
         * Returns the list of {@link PingDestination}s collected by this {@link NewUrlsCollector}. It is safe to call
         * this method concurrently from any random thread.
         *
         * @return the list of {@link PingDestination}s
         */
        public List<PingDestination> getNewUrls() {
            synchronized (this) {
                if (this.newUrls.isEmpty()) {
                    return Collections.emptyList();
                } else {
                    List<PingDestination> result = this.newUrls;
                    this.newUrls = new ArrayList<>();
                    return result;
                }
            }
        }
    }

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

    @Inject
    @Observable
    private Inventory.Mixin.Observable inventory;

    @Inject
    @ObservableAutoTenant
    private Inventory.Mixin.AutoTenantAndObservable autotenantInventory;

    final NewUrlsCollector newUrlsCollector = new NewUrlsCollector();

    private void addUrl(String tenantId, String envId, String url) {
        Log.LOG.infof("Putting url to inventory: %s", url);

        //we want the magic to happen, so using the autotenant here
        autotenantInventory.tenants().get(tenantId).environments().get(envId).feedlessResources().create(
                Resource.Blueprint.builder().withId(UUID.randomUUID().toString()).withResourceType("URL")
                        .withProperty("url", url).build());

    }

    @PostConstruct
    public void startUp() {

        /*
         * Add the observer before reading the existing URLs from the inventory so that we do not loose the URLs that
         * could have been added between those two calls.
         */
        inventory.observable(Interest.in(Resource.class).being(Action.created())).subscribe(newUrlsCollector);

        //we must not use the autotenantInventory here, because it would disallow us from "seeing" all the tenants.
        //We need that though and at the same time we don't need any of the features offered by autotenant, so it's ok.
        Set<Resource> urls = inventory.tenants().getAll().resourceTypes().getAll(With.id(PingDestination.URL_TYPE))
                .resources().getAll().entities();
        Log.LOG.infof("About to initialize Hawkular Pinger with %d URLs", urls.size());

        for (Resource r : urls) {
            destinations.add(PingDestination.from(r));
        }

//eff testing purposes, this causes order-of-initialization problems...
//        if (destinations.isEmpty()) {
//            /* for test purposes */
//            addUrl("jdoe", "test", "http://hawkular.github.io");
//        }
//
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

        List<PingDestination> newUrls = newUrlsCollector.getNewUrls();
        destinations.addAll(newUrls);

        if (destinations.size() == 0) {
            return;
        }

        doThePing(destinations);
    }

    /**
     * Runs the pinging work on the provided list of destinations. The actual pings are scheduled to run in parallel in
     * a thread pool. After ROUNDS*WAIT_MILLIS, remaining pings are cancelled and an error
     *
     * @param destinations
     *            Set of destinations to ping
     */
    private void doThePing(Set<PingDestination> destinations) {
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
