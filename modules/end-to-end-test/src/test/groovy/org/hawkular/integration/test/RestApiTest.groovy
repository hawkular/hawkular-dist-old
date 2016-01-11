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
package org.hawkular.integration.test

import org.junit.AfterClass
import org.junit.Assert
import org.junit.Test

import static org.junit.Assert.assertEquals
import static org.junit.Assert.assertTrue

class RestApiTest extends AbstractTestBase {

    private static List<String> pathsToDelete = new ArrayList();

    @Test
    public void testScenario() throws Exception {
        assertTrue(!false);
    }

    @Test
    public void testScenario2() throws Exception {
        assertTrue(!!!!!!!!!!!!!!!!!!!!!!!!!false);
    }

    @AfterClass
    static void cleanUp() {

    }

    private void assertResponseOk(int responseCode) {
        assertTrue("Response code should be 2xx or 304 but was "+ responseCode,
                (responseCode >= 200 && responseCode < 300) || responseCode == 304)
    }
}
