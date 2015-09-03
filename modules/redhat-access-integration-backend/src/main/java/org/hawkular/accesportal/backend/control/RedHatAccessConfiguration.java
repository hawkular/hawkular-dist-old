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
package org.hawkular.accesportal.backend.control;

import java.net.MalformedURLException;
import java.net.URL;

import javax.enterprise.context.ApplicationScoped;

/**
 * @author Juraci Paixão Kröhling
 */
@ApplicationScoped
public class RedHatAccessConfiguration {
    private int sessionTimeout;
    private boolean brokered;
    private boolean devel;
    private String userAgent;
    private String url;
    private String proxyUser;
    private String proxyPassword;
    private URL proxyUrl;
    private int proxyPort;

    public RedHatAccessConfiguration() throws MalformedURLException {
        this.brokered = true;
        this.userAgent = "redhat-access-plugin-hawkular-1.0.4";
        this.url = "https://api.access.redhat.com";
        this.devel = false;
        this.sessionTimeout = 3000000;

        String value = System.getProperty("http.proxyUser");
        if (value != null && !value.isEmpty()) {
            this.proxyUser = value;
        }

        value = System.getProperty("http.proxyPassword");
        if (value != null && !value.isEmpty()) {
            this.proxyPassword = value;
        }

        value = System.getProperty("http.proxyPort");
        if (value != null && !value.isEmpty()) {
            this.proxyPort = Integer.parseInt(value);
        }

        value = System.getProperty("http.proxyHost");
        if (value != null && !value.isEmpty()) {
            this.proxyUrl = new URL(value);
        }
    }

    public boolean isBrokered() {
        return brokered;
    }

    public boolean isDevel() {
        return devel;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public String getUrl() {
        return url;
    }

    public String getProxyUser() {
        return proxyUser;
    }

    public String getProxyPassword() {
        return proxyPassword;
    }

    public URL getProxyUrl() {
        return proxyUrl;
    }

    public int getProxyPort() {
        return proxyPort;
    }

    public int getSessionTimeout() {
        return sessionTimeout;
    }
}
