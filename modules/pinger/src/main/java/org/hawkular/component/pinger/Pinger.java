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
import java.net.InetAddress;
import java.net.Socket;
import java.net.UnknownHostException;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.concurrent.Future;

import javax.ejb.AsyncResult;
import javax.ejb.Asynchronous;
import javax.ejb.Stateless;
import javax.net.ssl.SSLContext;

import org.apache.http.StatusLine;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpUriRequest;
import org.apache.http.client.methods.RequestBuilder;
import org.apache.http.client.protocol.HttpClientContext;
import org.apache.http.config.RegistryBuilder;
import org.apache.http.conn.HttpClientConnectionManager;
import org.apache.http.conn.socket.ConnectionSocketFactory;
import org.apache.http.conn.socket.PlainConnectionSocketFactory;
import org.apache.http.conn.ssl.SSLConnectionSocketFactory;
import org.apache.http.conn.ssl.SSLContextBuilder;
import org.apache.http.conn.ssl.SSLContexts;
import org.apache.http.conn.ssl.TrustStrategy;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClientBuilder;
import org.apache.http.impl.conn.PoolingHttpClientConnectionManager;
import org.apache.http.protocol.HttpContext;
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

    /** A key to use when storing and retrieving remote IP address from and to {@link HttpContext} */
    static final String REMOTE_ADDRESS_ATTRIBUTE = Pinger.class.getPackage().getName() + ".remoteAddress";

    /** A custom connnection manager used by this pinger */
    private final HttpClientConnectionManager connectionManager;

    public Pinger() throws Exception {
        connectionManager = createConnectionManager();
    }

    /**
     * Creates a custom {@link HttpClientConnectionManager} that will be used by this pinger. The returned connection
     * manager accepts all SSL certificates, and stores remote IP address into {@link HttpContext} under
     * {@link #REMOTE_ADDRESS_ATTRIBUTE}.
     *
     * @return a new {@link HttpClientConnectionManager}
     */
    private HttpClientConnectionManager createConnectionManager() {

        PlainConnectionSocketFactory plainSf = new PlainConnectionSocketFactory() {
            @Override
            public Socket connectSocket(int connectTimeout, Socket socket, org.apache.http.HttpHost host,
                    java.net.InetSocketAddress remoteAddress, java.net.InetSocketAddress localAddress,
                    HttpContext context) throws IOException {
                InetAddress remoteInetAddress = remoteAddress.getAddress();
                Log.LOG.tracef("Putting remote IP address to HttpContext %s", remoteInetAddress);
                context.setAttribute(REMOTE_ADDRESS_ATTRIBUTE, remoteInetAddress);
                return super.connectSocket(connectTimeout, socket, host, remoteAddress, localAddress, context);
            }
        };

        SSLContext tmpSslContext;

        try {
            SSLContextBuilder builder = SSLContexts.custom();
            builder.loadTrustMaterial(null, new TrustStrategy() {
                @Override
                public boolean isTrusted(X509Certificate[] chain, String authType) throws CertificateException {
                    return true;
                }
            });
            tmpSslContext = builder.build();

        } catch (Exception e) {
            tmpSslContext = null;
        }

        SSLConnectionSocketFactory sslSocketFactory = new SSLConnectionSocketFactory(tmpSslContext, null, null,
                SSLConnectionSocketFactory.ALLOW_ALL_HOSTNAME_VERIFIER);

        return new PoolingHttpClientConnectionManager(RegistryBuilder.<ConnectionSocketFactory> create()
                .register("http", plainSf).register("https", sslSocketFactory).build());
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

        try (CloseableHttpClient client = HttpClientBuilder.create().setConnectionManager(connectionManager).build()) {
            long start = System.currentTimeMillis();
            HttpClientContext context = HttpClientContext.create();
            try (CloseableHttpResponse httpResponse = client.execute(request, context)) {
                InetAddress remoteAddress = (InetAddress) context.getAttribute(REMOTE_ADDRESS_ATTRIBUTE);
                StatusLine statusLine = httpResponse.getStatusLine();
                EntityUtils.consumeQuietly(httpResponse.getEntity());
                long now = System.currentTimeMillis();

                final int code = statusLine.getStatusCode();
                final int duration = (int) (now - start);
                Traits traits = Traits.collect(httpResponse, now, remoteAddress);
                PingStatus result = new PingStatus(destination, code, now, duration, traits);
                Log.LOG.debugf("Got status code %d from %s", code, destination.getUrl());
                return new AsyncResult<>(result);
            }
        } catch (UnknownHostException e) {
            PingStatus result = PingStatus.error(destination, 404, System.currentTimeMillis());
            Log.LOG.debugf("Got UnknownHostException for %s", destination.getUrl());
            return new AsyncResult<>(result);
        } catch (IOException e) {
            Log.LOG.dCouldNotPingUrl(destination.getUrl(), e.getMessage());
            PingStatus result = PingStatus.error(destination, 500, System.currentTimeMillis());
            return new AsyncResult<>(result);
        }

    }
}
