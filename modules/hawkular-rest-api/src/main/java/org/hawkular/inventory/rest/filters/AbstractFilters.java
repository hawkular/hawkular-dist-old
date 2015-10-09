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
import java.util.Arrays;
import java.util.List;
import java.util.Map.Entry;

import javax.ws.rs.core.MultivaluedMap;

import org.hawkular.inventory.api.filters.Filter;
import org.hawkular.inventory.api.filters.With;
import org.hawkular.inventory.rest.RestApiLogger;

/**
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
public abstract class AbstractFilters<P extends org.hawkular.inventory.rest.filters.AbstractFilters.AbstractParameter> {
    public interface AbstractParameter {
        String getKey();
    }

    protected final MultivaluedMap<String, String> params;

    protected final String tenantId;

    public AbstractFilters(String tenantId, MultivaluedMap<String, String> params) {
        super();
        this.tenantId = tenantId;
        this.params = params;
    }


    protected String get(P param) {
        return params.getFirst(param.getKey());
    }

    protected Filter[] getPropertyFilters(P param) {
        String key = param.getKey();
        String serialized = params.getFirst(key);
        if (serialized == null) {
            RestApiLogger.LOGGER.tracef("No value for properties parameter '%s'", key);
            return new Filter[0];
        }

        RestApiLogger.LOGGER.tracef("About to parse properties parameter %s=%s", key, serialized);
        ParamProperties paramProperties = new ParamProperties(serialized);
        List<Filter> result = new ArrayList<>();
        for (Entry<String, List<String>> paramProp : paramProperties.entrySet()) {
            List<String> value = paramProp.getValue();
            String propName = paramProp.getKey();
            if (value == null) {
                result.add(With.property(propName));
                RestApiLogger.LOGGER.tracef("Added filter With.property('%s')", propName);
            } else {
                Object[] valArray = value.toArray();
                result.add(With.propertyValues(paramProp.getKey(), valArray));
                if (RestApiLogger.LOGGER.isTraceEnabled()) {
                    RestApiLogger.LOGGER.tracef("Added filter With.propertyValues('%s', '%s')", propName,
                            Arrays.toString(valArray));
                }
            }
        }
        return result.toArray(new Filter[result.size()]);
    }
    public abstract Filter[][] get();

}
