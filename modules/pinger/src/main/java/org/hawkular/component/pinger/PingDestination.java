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

/**
 * A destination for pinging.
 *
 * @author Heiko W. Rupp
 */
public class PingDestination {

    /** The default method {@value} */
    public static final String DEFAULT_METHOD = "GET";

    final String resourceId;
    final String url;
    final String method;

    /**
     * Creates a new {@link PingDestination} using the default method {@value #DEFAULT_METHOD}.
     *
     * @param resourceId the resourceId of this destination
     * @param url the url to ping
     */
    public PingDestination(String resourceId, String url) {
        this(resourceId, url, DEFAULT_METHOD);
    }

    /**
     * Creates a new {@link PingDestination}
     *
     * @param url the url to ping
     * @param method the HTTP method to use in the ping request or null to use the default method
     *               {@value #DEFAULT_METHOD}
     */
    public PingDestination(String resourceId, String url, String method) {
        this.resourceId = resourceId;
        this.url = url;
        this.method = method == null ? DEFAULT_METHOD : method;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        PingDestination that = (PingDestination) o;

        if (!resourceId.equals(that.resourceId)) return false;
        if (!method.equals(that.method)) return false;
        return url.equals(that.url);

    }

    @Override
    public int hashCode() {
        int result = resourceId.hashCode();
        result = 31 * result + url.hashCode();
        result = 31 * result + method.hashCode();
        return result;
    }

    @Override
    public String toString() {
        return "PingDestination{" +
                "resourceId='" + resourceId + '\'' +
                ", url='" + url + '\'' +
                ", method='" + method + '\'' +
                '}';
    }

    public String name() {
        return resourceId + "." + url;
    }
}
