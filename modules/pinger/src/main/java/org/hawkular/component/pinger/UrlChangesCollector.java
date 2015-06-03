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
import java.util.Collections;
import java.util.List;
import java.util.Set;

import org.hawkular.inventory.api.Action;
import org.hawkular.inventory.api.Inventory;
import org.hawkular.inventory.api.model.Resource;

import rx.functions.Action1;

/**
 * Collects URL additions and removals reported by {@link PingManager#inventory} and synchronizes the various threads
 * reporting the new URLs and those ones consuming them.
 *
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
public class UrlChangesCollector {
    /**
     * An add or remove operation that can be performed on a {@link Set}.
     *
     * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
     */
    private static class UrlChange {

        /** The nature of the change - {@link Action#created()} or {@link Action#deleted()} */
        private final Action<?, ?> action;

        /** The {@link PingDestination} that the change is related to */
        private final PingDestination destination;

        /**
         * Creates a new {@link UrlChange}.
         *
         * @param action the nature of the change - {@link Action#created()} or {@link Action#deleted()}
         * @param destination the {@link PingDestination} that the change is related to
         */
        public UrlChange(Action<?, ?> action, PingDestination destination) {
            super();
            this.action = action;
            this.destination = destination;
        }

    }

    /**
     * A callback for the {@link Inventory} that collects newly added URLs.
     */
    private final Action1<Resource> urlCreatedAction = new Action1<Resource>() {
        /**
         * It is safe to call this method concurrently from any random thread.
         *
         * @see rx.functions.Action1#call(java.lang.Object)
         */
        @Override
        public void call(Resource r) {
            if (PingDestination.isUrl(r)) {
                synchronized (lock) {
                    PingDestination dest = PingDestination.from(r);
                    changes.add(new UrlChange(Action.created(), dest));
                    Log.LOG.debugf("Observed an URL creation: %s", dest.getUrl());
                }
            }
        }
    };

    /**
     * A callback for the {@link Inventory} that collects URL removals.
     */
    private final Action1<Resource> urlDeletedAction = new Action1<Resource>() {
        /**
         * It is safe to call this method concurrently from any random thread.
         *
         * @see rx.functions.Action1#call(java.lang.Object)
         */
        @Override
        public void call(Resource r) {
            if (PingDestination.isUrl(r)) {
                synchronized (lock) {
                    PingDestination dest = PingDestination.from(r);
                    changes.add(new UrlChange(Action.deleted(), dest));
                    Log.LOG.debugf("Observed an URL deletion: %s", dest.getUrl());
                }
            }
        }
    };

    private final Object lock = new Object();
    private List<UrlChangesCollector.UrlChange> changes = new ArrayList<>();

    /**
     * Applies the {@link UrlChange}s collected by this {@link UrlChangesCollector} to the given {@link Set} of
     * {@link PingDestination}s - i.e. {@link PingDestination}s are either added or removed to/from the Set.
     *
     * @param destinations the {@link Set} of {@link PingDestination}s that the changes should be applied to.
     */
    public void apply(Set<PingDestination> destinations) {
        List<UrlChange> changesCopy = getChanges();

        Log.LOG.debugf("About to apply %d changes to ping list", changesCopy.size());

        for (UrlChange change : changesCopy) {
            final PingDestination dest = change.destination;
            if (Action.created().equals(change.action)) {
                destinations.add(dest);
                Log.LOG.debugf("Added to ping list: %s", dest.getUrl());
            } else if (Action.deleted().equals(change.action)) {
                destinations.remove(dest);
                Log.LOG.debugf("Removed from ping list: %s", dest.getUrl());
            } else {
                throw new IllegalStateException("Unexpected action '" + change.action
                        + "'; expected Action.created() or Action.deleted()");
            }
        }
    }

    /**
     * Returns the list of {@link UrlChange}s collected by this {@link UrlChangesCollector}. It is safe to call this
     * method concurrently from any random thread.
     *
     * @return the list of {@link PingDestination}s
     */
    private List<UrlChangesCollector.UrlChange> getChanges() {
        synchronized (lock) {
            if (this.changes.isEmpty()) {
                return Collections.emptyList();
            } else {
                List<UrlChangesCollector.UrlChange> result = this.changes;
                this.changes = new ArrayList<>();
                return result;
            }
        }
    }

    /**
     * Returns a callback for the {@link Inventory} that collects newly added URLs.
     */
    public Action1<Resource> getUrlCreatedAction() {
        return urlCreatedAction;
    }

    /**
     * Returns a callback for the {@link Inventory} that collects URL removals.
     */
    public Action1<Resource> getUrlDeletedAction() {
        return urlDeletedAction;
    }
}