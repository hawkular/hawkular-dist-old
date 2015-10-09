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

import java.util.UUID;

import org.hawkular.inventory.api.model.AbstractElement;
import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.api.model.Environment;
import org.hawkular.inventory.api.model.Feed;
import org.hawkular.inventory.api.model.Metric;
import org.hawkular.inventory.api.model.MetricType;
import org.hawkular.inventory.api.model.Path;
import org.hawkular.inventory.api.model.Relationship;
import org.hawkular.inventory.api.model.RelativePath;
import org.hawkular.inventory.api.model.Resource;
import org.hawkular.inventory.api.model.ResourceType;
import org.hawkular.inventory.api.model.Tenant;

/**
 * @author Jirka Kremser
 * @since 0.3.4
 */
public class EntityIdUtils {

    public static String getStableId(CanonicalPath path) {
        return shortenIfNeeded(path);
    }

    public static String getStableId(AbstractElement<?, ?> element) {
        return getStableId(element.getPath());
    }

    public static boolean isValidRestPath(String restPath) {
        if (restPath == null || restPath.trim().isEmpty()) {
            return false;
        }
        String[] chunks = restPath.split("(?<=[^\\\\])/");
        if (chunks == null || chunks.length < 2) {
            return false;
        }
        if (chunks.length == 2 && ("tenants".equals(chunks[0]) || "relationships".equals(chunks[0]))
                && chunks[1].length() > 0) {
            return true;
        }
        if (chunks.length == 3 && chunks[0].length() > 0 && chunks[2].length() > 0) {
            return "environments".equals(chunks[1]) || "resourceTypes".equals(chunks[1])
                    || "metricTypes".equals(chunks[1]);
        }
        if (chunks.length == 4 && chunks[0].length() > 0 && chunks[1].length() > 0 && chunks[3].length() > 0) {
            return "resources".equals(chunks[2]) || "metrics".equals(chunks[2]);
        }
        if (chunks.length == 5 && chunks[0].length() > 0 && chunks[1].length() > 0 && chunks[2].length() > 0
                && chunks[4].length() > 0) {
            return "resources".equals(chunks[3]) || "metrics".equals(chunks[3]);
        }
        return false;
    }

    public static CanonicalPath toCanonicalPath(String restPath) {
        String[] chunks = restPath.split("(?<=[^\\\\])/");
        CanonicalPath.Extender path = CanonicalPath.empty();
        if (chunks.length == 2) {
            if ("tenants".equals(chunks[0])) {
                path.extend(Tenant.class, chunks[1]);
            } else if ("relationships".equals(chunks[0])) {
                path.extend(Relationship.class, chunks[1]);
            }
        } else if (chunks.length == 3) {
            if ("environments".equals(chunks[1])) {
                path.extend(Tenant.class, chunks[0]).extend(Environment.class, chunks[2]);
            } else if ("resourceTypes".equals(chunks[1])) {
                path.extend(Tenant.class, chunks[0]).extend(ResourceType.class, chunks[2]);
            } else if ("metricTypes".equals(chunks[1])) {
                path.extend(Tenant.class, chunks[0]).extend(MetricType.class, chunks[2]);
            }
        } else if (chunks.length == 4 && "resources".equals(chunks[2])) {
            path.extend(Tenant.class, chunks[0]).extend(Environment.class, chunks[1]).extend(Resource.class,
                    chunks[3]);
        } else if (chunks.length == 4 && "metrics".equals(chunks[2])) {
            path.extend(Tenant.class, chunks[0]).extend(Environment.class, chunks[1]).extend(Metric.class,
                    chunks[3]);
        } else if (chunks.length == 5 && "resources".equals(chunks[3])) {
            path.extend(Tenant.class, chunks[0]).extend(Environment.class, chunks[1]).extend(Feed.class, chunks[2])
                    .extend(Resource.class, chunks[4]);
        } else if (chunks.length == 5 && "metrics".equals(chunks[3])) {
            path.extend(Tenant.class, chunks[0]).extend(Environment.class, chunks[1]).extend(Feed.class, chunks[2])
                    .extend(Metric.class, chunks[4]);
        }
        return path.get();
    }

    public static boolean isTenantEscapeAttempt(CanonicalPath origin, Path extension) {
        if (extension instanceof CanonicalPath) {
            return !((CanonicalPath) extension).ids().getTenantId().equals(origin.ids().getTenantId());
        } else {
            CanonicalPath target = ((RelativePath) extension).applyTo(origin);
            return !target.ids().getTenantId().equals(origin.ids().getTenantId());
        }
    }

    private static String shortenIfNeeded(CanonicalPath path) {
        String id = path.toString();

        if (id.length() > 250) {
            return UUID.nameUUIDFromBytes(id.getBytes()).toString();
        } else {
            return id;
        }
    }
}
