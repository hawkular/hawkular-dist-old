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
package org.hawkular.inventory.rest.filters;

import java.util.ArrayList;
import java.util.List;

import javax.ws.rs.core.MultivaluedMap;

import org.hawkular.inventory.api.filters.Defined;
import org.hawkular.inventory.api.filters.Filter;
import org.hawkular.inventory.api.model.CanonicalPath;
import org.hawkular.inventory.rest.RestApiLogger;

/**
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
public class ResourceFilters extends AbstractFilters<ResourceFilters.Parameter> {
    public enum Parameter implements AbstractFilters.AbstractParameter {
        typeId("type.id"), properties("properties");
        private final String key;

        Parameter(String key) {
            this.key = key;
        }

        public String getKey() {
            return key;
        }
    }

    /**
     * @param tenantId
     * @param params
     */
    public ResourceFilters(String tenantId, MultivaluedMap<String, String> params) {
        super(tenantId, params);
    }

    public Filter[][] get() {
        List<Filter[]> result = new ArrayList<>();
        String typeId;
        if ((typeId = get(Parameter.typeId)) != null) {
            RestApiLogger.LOGGER.tracef("Filtering resources by %s=%s", Parameter.typeId.getKey(), typeId);
            result.add(Filter.by(Defined.by(CanonicalPath.of().tenant(tenantId).resourceType(typeId).get())).get());
        }
        result.add(getPropertyFilters(Parameter.properties));
        return result.toArray(new Filter[result.size()][]);
    }
}
