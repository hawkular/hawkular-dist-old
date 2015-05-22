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

import java.io.IOException;
import java.net.UnknownHostException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.concurrent.Future;

import javax.ejb.AsyncResult;
import javax.ejb.Asynchronous;
import javax.ejb.Stateless;
import javax.net.ssl.SSLContext;

import org.apache.http.HttpResponse;
import org.apache.http.StatusLine;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.methods.RequestBuilder;
import org.apache.http.conn.ssl.SSLContextBuilder;
import org.apache.http.conn.ssl.SSLContexts;
import org.apache.http.conn.ssl.TrustStrategy;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.util.EntityUtils;

/**
 * Bean that does the pinging. {@link #ping(PingDestination)} runs asynchronously.
 *
 * @author Heiko W. Rupp
 * @author Martin Večeřa
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 *
 */
@Stateless
public class Pinger {

    /**
     * SSL Context trusting all certificates.
     */
    private final SSLContext sslContext;

    public Pinger() throws Exception {
        SSLContext tmpSslContext;

        try {
            SSLContextBuilder builder = SSLContexts.custom();
            builder.loadTrustMaterial(null, new TrustStrategy() {
                @Override
                public boolean isTrusted(X509Certificate[] chain, String authType)
                      throws CertificateException {
                    return true;
                }
            });
            tmpSslContext = builder.build();

        } catch (Exception e) {
            tmpSslContext = null;
        }

        sslContext = tmpSslContext;
    }

    private CloseableHttpClient getHttpClient(final String url) {
        if (url != null && url.startsWith("https://") && sslContext != null) {
            return HttpClientBuilder.create().setSslcontext(sslContext).build();
        } else {
            return HttpClientBuilder.create().build();
        }
    }

    /**
     * Performs a test request against the given {@link PingDestination}.
     *
     * @param destination the destination to ping
     * @return a {@link Future}
     */
    @Asynchronous
    public Future<PingStatus> ping(final PingDestination destination) {
        Log.LOG.debugf("About to ping %s", destination.getUrl());
        HttpUriRequest request = RequestBuilder.create(destination.getMethod()).setUri(destination.getUrl()).build();

        try (CloseableHttpClient client = getHttpClient(destination.getUrl())) {
            long start = System.currentTimeMillis();
            HttpResponse httpResponse = client.execute(request);
            StatusLine statusLine = httpResponse.getStatusLine();
            EntityUtils.consumeQuietly(httpResponse.getEntity());
            long now = System.currentTimeMillis();

            final int code = statusLine.getStatusCode();
            final int duration = (int) (now - start);
            Traits traits = Traits.collect(httpResponse, now);
            PingStatus result = new PingStatus(destination, code, now, duration, traits);
            Log.LOG.debugf("Pinged %d %s", code, destination.getUrl());
            return new AsyncResult<>(result);
        } catch (UnknownHostException e) {
            PingStatus result = PingStatus.error(destination, 404, System.currentTimeMillis());
            return new AsyncResult<>(result);
        } catch (IOException e) {
            Log.LOG.wPingExeption(e.getMessage());
            PingStatus result = PingStatus.error(destination, 500, System.currentTimeMillis());
            return new AsyncResult<>(result);
        }

    }
}
