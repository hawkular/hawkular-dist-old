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

import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import org.apache.http.Header;
import org.apache.http.HeaderIterator;
import org.apache.http.HttpResponse;

import com.google.common.collect.ImmutableMap;
import com.google.common.collect.ImmutableMap.Builder;

/**
 * A collection of traits retrieved from response headers. The headers that are considered to be interesting are listed
 * in {@link TraitHeader} enum. Trait is an interesting piece of information about a monitored site, such as the name of
 * the web server implementation that is serving the site, the technology used in the serving application, etc.
 *
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
public class Traits {

    /**
     * The enumeration of HTTP response headers that are considered to bear interesting information about a monitored
     * site.
     */
    public enum TraitHeader {
        SERVER("server"), X_ASPNET_VERSION("x-aspnet-version"), X_POWERED_BY("x-powered-by"), X_RUNTIME("x-runtime"),
        X_VERSION("x-version");

        private static final Map<String, TraitHeader> index;
        static {
            TraitHeader[] traitHeaders = TraitHeader.values();
            Map<String, TraitHeader> tmp = new HashMap<String, TraitHeader>(traitHeaders.length + traitHeaders.length
                    / 2);
            for (TraitHeader h : traitHeaders) {
                tmp.put(h.toString(), h);
            }
            index = Collections.unmodifiableMap(tmp);
        }

        /**
         * A case-insensitive and null-tolerant variant of {@link #valueOf(String)}.
         *
         * @param header
         *            the header name to transform to a {@link TraitHeader}
         * @return the corresponding {@link TraitHeader} or {@code null} if there si no such {@link TraitHeader}
         */
        public static TraitHeader fastValueOf(String header) {
            return index.get(header.toLowerCase(Locale.US));
        }

        /** The name of the header */
        private final String header;

        private TraitHeader(String header) {
            this.header = header.toLowerCase(Locale.US);
        }

        /** @return {@link #header} rather than {@link #name()} */
        @Override
        public String toString() {
            return header;
        }
    }

    /** An empty map to use for {@link #items} */
    private static final Map<TraitHeader, String> NO_ITEMS = Collections.emptyMap();

    /**
     * Collects the traits from the given {@link HttpResponse}.
     *
     * @param httpResponse the HTTP reponse to collect traits from
     * @param timestamp the UNIX timestamp when the response was received
     * @return a new {@link Traits}
     */
    public static Traits collect(HttpResponse httpResponse, long timestamp) {
        Builder<TraitHeader, String> builder = new ImmutableMap.Builder<TraitHeader, String>();

        HeaderIterator headers = httpResponse.headerIterator();
        while (headers.hasNext()) {
            Header header = headers.nextHeader();
            TraitHeader traitHeader = TraitHeader.fastValueOf(header.getName());
            if (traitHeader != null) {
                builder.put(traitHeader, header.getValue());
            }
        }

        return new Traits(timestamp, builder.build());
    };

    /**
     * Returns a new empty {@link Traits}.
     *
     * @param timestamp the UNIX timestamp when the response was received
     * @return a new {@link Traits} with the given {@code timestamp} and no {@link #items}
     */
    public static Traits empty(long timestamp) {
        return new Traits(timestamp, NO_ITEMS);
    }

    /** The header name - header value map storing the traits */
    private final Map<TraitHeader, String> items;

    /** The UNIX timestamp when the response was received */
    private final long timestamp;

    /**
     * Creates new {@link Traits}.
     *
     * @param timestamp the UNIX timestamp when these {@link Traits} were collected
     * @param items {@link Map} of trait headers, must be unmodifiable
     *
     * @see #collect(HttpResponse, long)
     */
    Traits(long timestamp, Map<TraitHeader, String> items) {
        super();
        this.timestamp = timestamp;
        this.items = items;
    }

    /**
     * @return an unmodifiable {@link Map} of trait headers
     */
    public Map<TraitHeader, String> getItems() {
        return items;
    }

    /**
     * @return the UNIX timestamp when these {@link Traits} were collected
     */
    public long getTimestamp() {
        return timestamp;
    }

    /** @see java.lang.Object#equals(java.lang.Object) */
    @Override
    public boolean equals(Object obj) {
        if (this == obj)
            return true;
        if (obj == null)
            return false;
        if (getClass() != obj.getClass())
            return false;
        Traits other = (Traits) obj;
        if (items == null) {
            if (other.items != null)
                return false;
        } else if (!items.equals(other.items))
            return false;
        if (timestamp != other.timestamp)
            return false;
        return true;
    }

    /** @see java.lang.Object#hashCode() */
    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((items == null) ? 0 : items.hashCode());
        result = prime * result + (int) (timestamp ^ (timestamp >>> 32));
        return result;
    }

    /** @see java.lang.Object#toString() */
    @Override
    public String toString() {
        return "Traits [items=" + items + ", timestamp=" + timestamp + "]";
    }


}
