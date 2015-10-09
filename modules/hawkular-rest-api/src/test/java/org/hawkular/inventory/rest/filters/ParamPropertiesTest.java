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
package org.hawkular.inventory.rest.filters;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;

import org.hawkular.inventory.rest.filters.ParamProperties.Parser;
import org.junit.Assert;
import org.junit.Test;

/**
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
public class ParamPropertiesTest {
    @Test
    public void testParser() {
        /* escaping */
        assertParse("\\:k1:v1,k2:v2", ":k1", "v1", "k2", "v2");
        assertParse("k\\:1:v1,k2:v2", "k:1", "v1", "k2", "v2");
        assertParse("k1\\::v1,k2:v2", "k1:", "v1", "k2", "v2");
        assertParse("k1:\\:v1,k2:v2", "k1", ":v1", "k2", "v2");
        assertParse("k1:v\\:1,k2:v2", "k1", "v:1", "k2", "v2");
        assertParse("k1:v1\\:,k2:v2", "k1", "v1:", "k2", "v2");
        assertParse("k1:v1,\\:k2:v2", "k1", "v1", ":k2", "v2");

        assertParse("\\,k1:v1,k2:v2", ",k1", "v1", "k2", "v2");
        assertParse("k\\,1:v1,k2:v2", "k,1", "v1", "k2", "v2");
        assertParse("k1\\,:v1,k2:v2", "k1,", "v1", "k2", "v2");
        assertParse("k1:\\,v1,k2:v2", "k1", ",v1", "k2", "v2");
        assertParse("k1:v\\,1,k2:v2", "k1", "v,1", "k2", "v2");
        assertParse("k1:v1\\,,k2:v2", "k1", "v1,", "k2", "v2");
        assertParse("k1:v1,\\,k2:v2", "k1", "v1", ",k2", "v2");

        assertParse("\\\\k1:v1,k2:v2", "\\k1", "v1", "k2", "v2");
        assertParse("k\\\\1:v1,k2:v2", "k\\1", "v1", "k2", "v2");
        assertParse("k1\\\\:v1,k2:v2", "k1\\", "v1", "k2", "v2");
        assertParse("k1:\\\\v1,k2:v2", "k1", "\\v1", "k2", "v2");
        assertParse("k1:v\\\\1,k2:v2", "k1", "v\\1", "k2", "v2");
        assertParse("k1:v1\\\\,k2:v2", "k1", "v1\\", "k2", "v2");
        assertParse("k1:v1,\\\\k2:v2", "k1", "v1", "\\k2", "v2");

        /* mainstream cases */
        assertParse("k1:v1", "k1", "v1");
        assertParse("k1:v1,k2:v2", "k1", "v1", "k2", "v2");

        /* multivalue */
        assertParse("k1:v1,k1:v2", "k1", new String[] {"v1", "v2"});

        /* with various parts empty */
        assertParse("");
        assertParse("k1,k2:v2", "k1", null, "k2", "v2");
        assertParse("k1:,k2:v2", "k1", "", "k2", "v2");
        assertParse(":v1,k2:v2", "", "v1", "k2", "v2");
        assertParse(":,k2:v2", "", "", "k2", "v2");

        /* spaces - no trimming */
        assertParse("k1: v1, k2:v2", "k1", " v1", " k2", "v2");
        assertParse("k 1:v1,k2:v 2", "k 1", "v1", "k2", "v 2");


    }
    private void assertParse(String serialized, Object... keys) {
        LinkedHashMap<String, List<String>> expected = new LinkedHashMap<>();
        for (int i = 0; i < keys.length; ) {
            String key = (String) keys[i++];
            Object v = keys[i++];
            if (v == null) {
                expected.put(key, null);
            } else {
                String[] valArray = v instanceof String ? new String[] {(String) v} : (String[]) v;
                List<String> valList = new ArrayList<>();
                for (String val : valArray) {
                    valList.add(val);
                }
                expected.put(key, valList);
            }
        }
        Parser p = new Parser(serialized);
        Assert.assertEquals(expected, p.parse());
    }
}
