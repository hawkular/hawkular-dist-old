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

package org.hawkular.inventory.rest;

import static javax.ws.rs.core.MediaType.APPLICATION_JSON;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.annotation.PostConstruct;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;

import org.jboss.resteasy.core.Dispatcher;
import org.jboss.resteasy.core.ResourceInvoker;
import org.jboss.resteasy.core.ResourceMethodInvoker;
import org.jboss.resteasy.core.ResourceMethodRegistry;

/**
 * @author Lukas Krejci
 * @since 1.0
 */
@Path("/")
@Produces(value = APPLICATION_JSON)
@Consumes(value = APPLICATION_JSON)
public class RestPing {

    @Context
    private Dispatcher dispatcher;

    private InventoryJaxRsInfo inventoryJaxRsInfo;

    @PostConstruct
    private void init() {
        inventoryJaxRsInfo = getEndpoints((ResourceMethodRegistry)dispatcher.getRegistry());
        Collections.sort(inventoryJaxRsInfo.getEndpoints());
    }

    @GET
    @Path("/")
    public Response ping(@Context Dispatcher dispatcher) {
        return Response.status(Response.Status.OK).entity(inventoryJaxRsInfo).build();
    }

    private InventoryJaxRsInfo getEndpoints(ResourceMethodRegistry resourceMethodRegistry) {
        InventoryJaxRsInfo inventoryJaxRsInfo = new InventoryJaxRsInfo();

        for (Map.Entry<String, List<ResourceInvoker>> entry : resourceMethodRegistry.getBounded().entrySet()) {
            String uri = entry.getKey();

            JaxRsResource jaxRsResource = new JaxRsResource(uri);
            for (ResourceInvoker invoker : entry.getValue()) {
                ResourceMethodInvoker method = (ResourceMethodInvoker) invoker;
                if(method.getMethod().getDeclaringClass() == getClass()){
                    continue;
                }

                method.getHttpMethods().forEach(jaxRsResource::addMethod);
            }

            if (jaxRsResource.getMethods().size() > 0) {
                inventoryJaxRsInfo.addJaxRsResources(jaxRsResource);
            }
        }

        return inventoryJaxRsInfo;
    }

    public static class InventoryJaxRsInfo {
        private static final String DOC_URL = "http://www.hawkular.org/";

        private List<JaxRsResource> endpoints = new ArrayList<>();

        public String getDocumentation() {
            return DOC_URL;
        }

        public List<JaxRsResource> getEndpoints() {
            return endpoints;
        }

        public boolean addJaxRsResources(JaxRsResource jaxRsResources) {
            return this.endpoints.add(jaxRsResources);
        }
    }

    public static class JaxRsResource implements Comparable<JaxRsResource> {

        private static final Pattern NAME_PATTERN = Pattern.compile("(/[a-zA-Z]+)");

        private Set<String> methods = new HashSet<>();
        private String uri;

        public JaxRsResource(String uri) {
            this.uri = uri;
        }

        public boolean addMethod(String method) {
            return methods.add(method);
        }

        public Set<String> getMethods() {
            return methods;
        }

        public String getUri() {
            return uri;
        }

        public void setUri(String uri) {
            this.uri = uri;
        }

        private String getUriPattern(String uri) {
            Matcher matcher = NAME_PATTERN.matcher(uri);
            if (matcher.find()) {
                return matcher.group();
            }

            return uri;
        }

        @Override
        public int compareTo(JaxRsResource that) {
            if (this == that) {
                return 0;
            }

            String other = getUriPattern(that.getUri());
            String current = getUriPattern(this.uri);

            return current.compareTo(other);
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof JaxRsResource)) return false;

            JaxRsResource that = (JaxRsResource) o;

            return !(uri != null ? !uri.equals(that.uri) : that.uri != null);

        }

        @Override
        public int hashCode() {
            return uri != null ? uri.hashCode() : 0;
        }
    }
}
