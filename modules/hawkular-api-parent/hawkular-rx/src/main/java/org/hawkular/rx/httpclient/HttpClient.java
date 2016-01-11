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

/**
 * Created by jkremser on 12/2/15.
 */

public interface HttpClient {

    RestResponse post(String authToken, String persona, String url, String json) throws IOException;

    RestResponse get(String authToken, String persona, String url) throws IOException;

    RestResponse put(String authToken, String persona, String url, String json) throws IOException;

    RestResponse delete(String authToken, String persona, String url) throws IOException;
}
