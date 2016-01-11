/*
 * Copyright 2015-2016 Red Hat, Inc. and/or its affiliates
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
package org.hawkular.rest.api.v1.entities;

import java.util.Objects;

/**
 * @author Jirka Kremser
 */
public class URL {
    private final String url;

    private URL() {
        this.url = null;
    }

    public URL(String url) {
        this.url = url;
    }

    public String getUrl() {
        return url;
    }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        URL url1 = (URL) o;
        return Objects.equals(url, url1.url);
    }

    @Override public int hashCode() {
        return Objects.hash(url);
    }

    @Override public String toString() {
        final StringBuilder sb = new StringBuilder("URL[");
        sb.append("url='").append(url).append('\'');
        sb.append(']');
        return sb.toString();
    }
}
