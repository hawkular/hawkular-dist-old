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
package org.hawkular.component.pinger;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.ejb.Asynchronous;
import javax.ejb.Stateless;

import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.ContentType;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.HttpClientBuilder;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Publish metrics data
 *
 * @author Heiko W. Rupp
 */
@Stateless
public class MetricPublisher {

    private static void addDataItem(List<Map<String, Object>> mMetrics, String resourceId, long timestamp,
            Number value, String name) {
        Map<String, Number> dataMap = new HashMap<>(2);
        dataMap.put("timestamp", timestamp);
        dataMap.put("value", value);
        List<Map<String, Number>> data = new ArrayList<>(1);
        data.add(dataMap);
        Map<String, Object> outer = new HashMap<>(2);
        outer.put("id", resourceId + ".status." + name);
        outer.put("data", data);
        mMetrics.add(outer);
    }

    private final PingerConfiguration configuration = PingerConfiguration.getInstance();

    /**
     * Serializes the given {@link PingStatus} and then submits it to Hawkular-metrics service via REST
     *
     * @param status
     *            the {@link PingStatus} to publish
     */
    @Asynchronous
    public void sendToMetricsViaRest(PingStatus status) {

        List<Map<String, Object>> mMetrics = new ArrayList<>();

        final PingDestination dest = status.getDestination();
        final String resourceId = dest.getResourceId();
        final long timestamp = status.getTimestamp();
        addDataItem(mMetrics, resourceId, timestamp, status.getDuration(), "duration");
        addDataItem(mMetrics, resourceId, timestamp, status.getCode(), "code");

        // Send it to metrics via rest
        String payload;
        try {
            payload = new ObjectMapper().writeValueAsString(mMetrics);
        } catch (JsonProcessingException e) {
            Log.LOG.eCouldNotParseMessage(e);
            return;
        }
        HttpClient client = HttpClientBuilder.create().build();

        HttpPost request = new HttpPost(configuration.getMetricsBaseUri() + "/gauges/data");
        request.addHeader("Hawkular-Tenant", status.getDestination().getTenantId());

        request.setEntity(new StringEntity(payload, ContentType.APPLICATION_JSON));

        try {
            HttpResponse response = client.execute(request);
            if (response.getStatusLine().getStatusCode() > 399) {
                Log.LOG.wMetricPostStatus(response.getStatusLine().toString());
            }
        } catch (IOException e) {
            Log.LOG.eMetricsIoException(e);
        }
    }

}
