/**
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
package org.hawkular.integration.test

import groovyx.net.http.ContentType
import groovyx.net.http.RESTClient

import org.junit.BeforeClass

class AbstractTestBase {

  protected static final String testUser = 'jdoe'
  protected static final String testPasword = 'password'

  protected static final String baseURI
  static {
      String host = System.getProperty('hawkular.bind.address') ?: 'localhost'
      if ("0.0.0.0".equals(host)) {
          host = "localhost"
      }
      int portOffset = Integer.parseInt(System.getProperty('hawkular.port.offset') ?: '0')
      int httpPort = portOffset + 8080
      baseURI = "http://${host}:${httpPort}"
  }
  static RESTClient client

  @BeforeClass
  static void initClient() {
    client = new RESTClient(baseURI, ContentType.JSON)

    /* http://en.wikipedia.org/wiki/Basic_access_authentication#Client_side :
     * The Authorization header is constructed as follows:
     *  * Username and password are combined into a string "username:password"
     *  * The resulting string is then encoded using the RFC2045-MIME variant of Base64,
     *    except not limited to 76 char/line[9]
     *  * The authorization method and a space i.e. "Basic " is then put before the encoded string.
     */
    String encodedCredentials = Base64.getMimeEncoder().encodeToString("$testUser:$testPasword".getBytes("utf-8"))
    client.defaultRequestHeaders.Authorization = "Basic "+ encodedCredentials

  }

}
