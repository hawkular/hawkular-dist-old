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
package org.hawkular.inventory.rest.security;

import static org.hawkular.inventory.api.Action.created;
import static org.hawkular.inventory.api.Action.deleted;
import static org.hawkular.inventory.rest.RestApiLogger.LOGGER;

import java.util.HashSet;
import java.util.Set;

import javax.enterprise.context.ApplicationScoped;
import javax.enterprise.event.Observes;
import javax.inject.Inject;
import javax.transaction.Transactional;

import org.hawkular.accounts.api.PersonaService;
import org.hawkular.accounts.api.ResourceService;
import org.hawkular.accounts.api.model.Persona;
import org.hawkular.inventory.api.Action;
import org.hawkular.inventory.api.Interest;
import org.hawkular.inventory.api.Inventory;
import org.hawkular.inventory.api.model.AbstractElement;
import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.api.model.Environment;
import org.hawkular.inventory.api.model.Feed;
import org.hawkular.inventory.api.model.Metric;
import org.hawkular.inventory.api.model.MetricType;
import org.hawkular.inventory.api.model.OperationType;
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.inventory.api.model.ResourceType;
import org.hawkular.inventory.api.model.Tenant;
import org.hawkular.inventory.cdi.DisposingInventory;
import org.hawkular.inventory.cdi.InventoryInitialized;

import rx.Subscription;

/**
 * Integrates the security concerns with the inventory.
 * <p>
 * <p>Mutation operations must be checked explicitly in the REST classes using the {@link Security} bean and invoking
 * one of its {@code can*()} methods. The creation of the security resources associated with the newly created inventory
 * entities is handled automagically by this class which does that by observing the mutation events on the inventory
 * .</p>
 *
 * <p>
 * To completely disable the auth completely do following:
 * <ul>
 *   <li>Use the {@link org.hawkular.inventory.rest.security.dummy.AllPermissive} annotation in RestBase class
 *       (it's commented there).</li>
 *   <li>Set the {@link SecurityIntegration#DUMMY} flag to true in {@link SecurityIntegration} class.</li>
 *   <li>Comment out the secure-deployment element for <code>hawkular-inventory-dist.war</code> in
 *       <a href="http://git.io/vZkQs">dist/src/main/resources/wildfly/patches/standalone.xsl</a> in hawkular/hawkular
 *       repo.</li>
 *   <li>Comment out the keycloak xml elements in <code>jboss-web.xml</code> and <code>web.xml</code>
 *   (it's commented there).</li>
 * </ul>
 * </p>
 * <p>
 * <strong>NOTE1:</strong> it can be disabled also only partially, for instance if the
 * {@link org.hawkular.inventory.rest.security.dummy.AllPermissive} annotation is used only above the
 * {@link org.hawkular.inventory.rest.RestBase#tenantIdProducer} field the auth will be working but the tenant will
 * be always the same.
 * </p>
 * <p>
 * <strong>NOTE2:</strong> This may be useful to measure the impact of security aspects to the overall performance.
 * </p>
 *
 * @author Lukas Krejci
 * @since 0.0.2
 */
@ApplicationScoped
public class SecurityIntegration {

    @Inject
    ResourceService storage;

    @Inject
    PersonaService personas;

    // this flag is here because even if @AllPermissive security is used all over the code, the @PostConstruct method
    // in Security class is performed. Same applies for @Observes here, if the event is emitted.
    private static final boolean DUMMY = false;

    private final Set<Subscription> subscriptions = new HashSet<>();

    public void start(@Observes InventoryInitialized event) {
        if (!isDummy()) {
            Inventory inventory = event.getInventory();
            install(inventory, Tenant.class);
            install(inventory, Environment.class);
            install(inventory, Feed.class);
            install(inventory, ResourceType.class);
            install(inventory, MetricType.class);
            install(inventory, Resource.class);
            install(inventory, Metric.class);
            install(inventory, OperationType.class);
            //install(inventory, Relationship.class);
        }
    }

    public void stop(@Observes DisposingInventory event) {
        if (!isDummy()) {
            subscriptions.forEach(Subscription::unsubscribe);
            subscriptions.clear();
        }
    }

    private <E extends AbstractElement<?, ?>> void install(Inventory inventory, Class<E> cls) {
        subscriptions.add(inventory.observable(Interest.in(cls).being(created()))
                .subscribe((e) -> react(e, created())));

        subscriptions.add(inventory.observable(Interest.in(cls).being(deleted()))
                .subscribe((e) -> react(e, deleted())));
    }

    @Transactional
    public void react(AbstractElement<?, ?> entity, Action<?, ?> action) {
        if (!isDummy()) {
            switch (action.asEnum()) {
                case CREATED:
                    createSecurityResource(entity.getPath());
                    break;
                case DELETED:
                    String stableId = EntityIdUtils.getStableId(entity);
                    storage.delete(stableId);
                    LOGGER.debugf("Deleted security entity with stable ID '%s' for entity %s", stableId, entity);
                    break;
            }
        }
    }

    private org.hawkular.accounts.api.model.Resource createSecurityResource(CanonicalPath path) {
        if (!path.isDefined()) {
            return null;
        }

        LOGGER.tracef("Creating security entity for %s", path);

        String stableId = EntityIdUtils.getStableId(path);

        org.hawkular.accounts.api.model.Resource res = storage.get(stableId);
        if (res == null) {
            org.hawkular.accounts.api.model.Resource parent = createSecurityResource(path.up());

            // if the parent is null, it means we're creating a security resource for the tenant - we need to assign
            // it an owner. If the parent exists, we need to establish the owner to assign to the current resource
            Persona owner = personas.getCurrent();
            if (parent != null) {
                owner = establishOwner(parent, owner);
            }
            res = storage.create(stableId, parent, owner);
            LOGGER.debugf("Created security entity with stable ID '%s' for entity %s", stableId, path);
        }

        return res;
    }

    /**
     * Establishes the owner. If the owner of the parent is the same as the current user, then create the resource
     * as being owner-less, inheriting the owner from the parent.
     */
    private Persona establishOwner(org.hawkular.accounts.api.model.Resource resource, Persona current) {
        while (resource != null && resource.getPersona() == null) {
            resource = resource.getParent();
        }

        if (resource != null && resource.getPersona().equals(current)) {
            current = null;
        }

        return current;
    }

    public static boolean isDummy() {
        return DUMMY;
    }
}
