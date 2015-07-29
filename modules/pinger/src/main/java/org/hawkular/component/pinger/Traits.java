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
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.TreeSet;

import org.apache.http.Header;
import org.apache.http.HeaderIterator;
import org.apache.http.HttpResponse;

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
        SERVER("server"), X_ASPNET_VERSION("x-aspnet-version"),
        X_POWERED_BY("x-powered-by"),
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

    private static final String ASP_NET = "ASP.NET";

    /**
     * Collects the traits from the given {@link HttpResponse}.
     * <p>
     * Header keys tha occur multiple times, are concantenated into a single comma-separated string in alphabetical
     * order.
     *
     * @param httpResponse the HTTP reponse to collect traits from
     * @param timestamp the UNIX timestamp when the response was received
     * @return a new {@link Traits}
     */
    public static Traits collect(HttpResponse httpResponse, long timestamp, InetAddress remoteAddress) {

        TreeSet<String> xPoweredBy = null;
        StringBuilder poweredByBuilder = new StringBuilder();
        boolean hasAspNet = false;

        HeaderIterator headers = httpResponse.headerIterator();
        while (headers.hasNext()) {
            Header header = headers.nextHeader();
            Log.LOG.tracef("Is this a trait header? %s:%s from %s", header.getName(), header.getValue(), remoteAddress);
            TraitHeader traitHeader = TraitHeader.fastValueOf(header.getName());
            if (traitHeader != null) {
                Log.LOG.tracef("Found a trait header: %s:%s from %s", header.getName(), header.getValue(),
                        remoteAddress);

                switch (traitHeader) {
                case SERVER:
                    if (poweredByBuilder.length() != 0) {
                        /* multiple server headers do not make much sense, but let us be prepared */
                        poweredByBuilder.append(", ");
                    }
                    poweredByBuilder.append(header.getValue());
                    break;
                case X_POWERED_BY:
                    String powBy = header.getValue();
                    if (xPoweredBy == null) {
                        xPoweredBy = new TreeSet<>();
                    }
                    if (ASP_NET.equals(powBy)) {
                        if (!hasAspNet) {
                            xPoweredBy.add(powBy);
                        }
                        hasAspNet = true;
                    } else {
                        xPoweredBy.add(powBy);
                    }
                    break;
                case X_ASPNET_VERSION:
                    if (hasAspNet) {
                        xPoweredBy.remove(ASP_NET);
                    }
                    if (xPoweredBy == null) {
                        xPoweredBy = new TreeSet<>();
                    }
                    xPoweredBy.add(ASP_NET +"/"+ header.getValue());
                    hasAspNet = true;
                    break;
                default:
                    break;
                }
            }
        }

        /* server was added to poweredByBuilder already
         * now lets add the x-powered-by items in alphabetic order */
        if (xPoweredBy != null) {
            for (String val : xPoweredBy) {
                if (poweredByBuilder.length() != 0) {
                    poweredByBuilder.append(", ");
                }
                poweredByBuilder.append(val);
            }
        }

        return new Traits(timestamp, remoteAddress,
                poweredByBuilder.length() == 0 ? null : poweredByBuilder.toString());
    };

    /**
     * Returns a new empty {@link Traits}.
     *
     * @param timestamp the UNIX timestamp when the response was received
     * @return a new {@link Traits} with the given {@code timestamp} and no {@link #items}
     */
    public static Traits empty(long timestamp) {
        return new Traits(timestamp, null, null);
    }

    /** A comma separated list of "powered by" items */
    private final String poweredBy;

    /** The remote IP address that replied to the ping, can be {@code null} */
    private final InetAddress remoteAddress;

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
    Traits(long timestamp, InetAddress remoteAddress, String poweredBy) {
        super();
        this.timestamp = timestamp;
        this.remoteAddress = remoteAddress;
        this.poweredBy = poweredBy;
    }

    /**
     * @return a comma separated list of "powered by" items
     */
    public String getPoweredBy() {
        return poweredBy;
    }

    /**
     * @return the remote IP address that replied to the ping, can be {@code null}
     */
    public InetAddress getRemoteAddress() {
        return remoteAddress;
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
        if (timestamp != other.timestamp)
            return false;
        if (remoteAddress == null) {
            if (other.remoteAddress != null)
                return false;
        } else if (!remoteAddress.equals(other.remoteAddress))
            return false;
        if (poweredBy == null) {
            if (other.poweredBy != null)
                return false;
        } else if (!poweredBy.equals(other.poweredBy))
            return false;
        return true;
    }

    /** @see java.lang.Object#hashCode() */
    @Override
    public int hashCode() {
        final int prime = 31;
        int result = 1;
        result = prime * result + ((poweredBy == null) ? 0 : poweredBy.hashCode());
        result = prime * result + (int) (timestamp ^ (timestamp >>> 32));
        result = prime * result + ((remoteAddress == null) ? 0 : remoteAddress.hashCode());
        return result;
    }

    /** @see java.lang.Object#toString() */
    @Override
    public String toString() {
        return "Traits [poweredBy=" + poweredBy + ", timestamp=" + timestamp + ", remoteAddress=" + remoteAddress + "]";
    }


}
