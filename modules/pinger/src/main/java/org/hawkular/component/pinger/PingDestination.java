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
 * Destination for pinging
 *
 * @author Heiko W. Rupp
 */
public class PingDestination {

    String resourceId;
    String url;

    public PingDestination(String resourceId, String url) {
        this.resourceId = resourceId;
        this.url = url;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        PingDestination that = (PingDestination) o;

        if (!resourceId.equals(that.resourceId)) return false;
        return url.equals(that.url);

    }

    @Override
    public int hashCode() {
        int result = resourceId.hashCode();
        result = 31 * result + url.hashCode();
        return result;
    }

    @Override
    public String toString() {
        return "PingDestination{" +
                "resourceId='" + resourceId + '\'' +
                ", url='" + url + '\'' +
                '}';
    }

    public String name() {
        return resourceId + "." + url;
    }
}
