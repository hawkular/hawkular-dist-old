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

import java.net.InetAddress;

import javax.ejb.Asynchronous;
import javax.ejb.Stateless;

import org.hawkular.inventory.api.EntityNotFoundException;
import org.hawkular.inventory.api.Inventory;
import org.hawkular.inventory.api.Resources;
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.inventory.api.model.Resource.Update.Builder;

/**
 * Stores ping results to Hawkular Inventory.
 *
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
@Stateless
public class TraitsPublisher {

    private static final String TRAIT_PROPERTY_PREFIX = "trait-";

    @javax.annotation.Resource(lookup = "java:global/Hawkular/Inventory")
    private Inventory inventory;

    /**
     * Stores the {@link Traits} of the given {@link PingStatus} in Hawkular Inventory.
     *
     * @param status the {@link PingStatus} to publish
     */
    @Asynchronous
    public void publish(PingStatus status) {
        final Traits traits = status.getTraits();

        PingDestination dest = status.getDestination();

        try {
            Resources.ReadWrite resourceAccess = inventory.tenants().get(dest.getTenantId()).environments()
                    .get(dest.getEnvironmentId()).resources();

            Resource resource = resourceAccess.get(dest.getResourceId()).entity();

            Builder updateBuilder = Resource.Update.builder();

            /* keep the props not starting with TRAIT_PROPERTY_PREFIX */
            resource.getProperties().entrySet().stream()
                    .filter(e -> !e.getKey().startsWith(TRAIT_PROPERTY_PREFIX))
                    .forEach(e -> updateBuilder.withProperty(e.getKey(), e.getValue()));

            /* add the new trait props */
            updateBuilder.withProperty(TRAIT_PROPERTY_PREFIX + "collected-on", traits.getTimestamp());

            InetAddress remoteAddress = traits.getRemoteAddress();
            if (remoteAddress != null) {
                updateBuilder.withProperty(TRAIT_PROPERTY_PREFIX + "remote-address", remoteAddress.getHostAddress());
            }
            String poweredBy = traits.getPoweredBy();
            if (poweredBy != null) {
                updateBuilder.withProperty(TRAIT_PROPERTY_PREFIX + "powered-by", poweredBy);
            }

            inventory.tenants().get(dest.getTenantId()).environments().get(dest.getEnvironmentId()).resources()
                    .update(dest.getResourceId(), updateBuilder.build());
        } catch (EntityNotFoundException e) {
            Log.LOG.iResourceNotFound(dest.getResourceId(), dest.getTenantId());
        }
    }

}
