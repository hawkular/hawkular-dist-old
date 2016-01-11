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
package org.hawkular.rx.httpclient;

import java.io.IOException;

import javax.enterprise.inject.Default;

import com.squareup.okhttp.MediaType;
import com.squareup.okhttp.OkHttpClient;
import com.squareup.okhttp.Request;
import com.squareup.okhttp.RequestBody;
import com.squareup.okhttp.Response;

/**
 * @author Jirka Kremser
 */
@Default
public class OkClient implements HttpClient {

    public static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");

    private final OkHttpClient delegatingClient = new OkHttpClient();

    public RestResponse post(String authToken, String persona, String url, String json) throws IOException {
        RequestBody body = RequestBody.create(JSON, json);
        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", authToken)
                .addHeader("Hawkular-Persona", persona)
                .post(body)
                .build();
//        this.delegatingClient.interceptors().add(null);

        Response response = this.delegatingClient.newCall(request).execute();

        // todo: async
//        Response response = this.delegatingClient.newCall(request).enqueue(new Callback() {
//            @Override public void onFailure(Request request, IOException e) {
//
//            }
//
//            @Override public void onResponse(Response response) throws IOException {
//
//            }
//        });
        return new RestResponse(response);
    }

    public RestResponse get(String authToken, String persona, String url) throws IOException {
        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", authToken)
                .addHeader("Hawkular-Persona", persona)
                .get()
                .build();

        Response response = this.delegatingClient.newCall(request).execute();
        return new RestResponse(response);
    }

    public RestResponse put(String authToken, String persona, String url, String json) throws IOException {
        RequestBody body = RequestBody.create(JSON, json);
        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", authToken)
                .addHeader("Hawkular-Persona", persona)
                .put(body)
                .build();

        Response response = this.delegatingClient.newCall(request).execute();
        return new RestResponse(response);
    }

    public RestResponse delete(String authToken, String persona, String url) throws IOException {
        Request request = new Request.Builder()
                .url(url)
                .addHeader("Authorization", authToken)
                .addHeader("Hawkular-Persona", persona)
                .delete()
                .build();

        Response response = this.delegatingClient.newCall(request).execute();
        return new RestResponse(response);
    }
}
