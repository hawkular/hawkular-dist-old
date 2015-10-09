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
package org.hawkular.inventory.rest.interceptors;

import static org.hawkular.inventory.rest.RestApiLogger.REQUESTS_LOGGER;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.lang.reflect.Method;
import java.util.List;

import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerRequestFilter;
import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.ext.Provider;

import org.apache.commons.io.IOUtils;
import org.hawkular.inventory.rest.json.JacksonConfig;
import org.jboss.resteasy.annotations.interception.ServerInterceptor;
import org.jboss.resteasy.core.interception.PostMatchContainerRequestContext;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * @author Jirka Kremser
 * @since 0.2.0
 */

@Provider
@ServerInterceptor
public class LoggingInterceptor implements ContainerRequestFilter {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    static {
        JacksonConfig.initializeObjectMapper(MAPPER);
    }

    @Override
    public void filter(ContainerRequestContext containerRequestContext) throws IOException {
        if (REQUESTS_LOGGER.isDebugEnabled()) {
            final String method = containerRequestContext.getMethod();
            final String url = containerRequestContext.getUriInfo().getRequestUri().toString();
            final StringBuilder headersStr = new StringBuilder();
            MultivaluedMap<String, String> headers = containerRequestContext.getHeaders();
            for (MultivaluedMap.Entry<String, List<String>> header : headers.entrySet()) {
                headersStr.append(header.getKey()).append(": ").append(header.getValue()).append('\n');
            }

            String json = null;
            if ("POST".equals(method) || "PUT".equals(method)) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                IOUtils.copy(containerRequestContext.getEntityStream(), baos);
                byte[] jsonBytes = baos.toByteArray();
                json = new String(jsonBytes, "UTF-8");
                Object jsonObject = MAPPER.readValue(json, Object.class);
                json = MAPPER.writeValueAsString(jsonObject);
                containerRequestContext.setEntityStream(new ByteArrayInputStream(jsonBytes));
            }
            PostMatchContainerRequestContext pmContext = (PostMatchContainerRequestContext) containerRequestContext;
            // this should be safe, because if some calling non-existent api the javax.ws.rs.NotFoundException should
            // be already thrown and this interceptor isn't triggered
            Method javaMethod = pmContext.getResourceMethod().getMethod();
            REQUESTS_LOGGER.restCall(method, url, headersStr.toString(), json == null ? "empty" : json,
                    javaMethod.toGenericString());
        }
    }
}
