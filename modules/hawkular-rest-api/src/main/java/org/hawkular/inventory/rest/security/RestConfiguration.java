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

package org.hawkular.inventory.rest.security;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import org.hawkular.inventory.api.Configuration;

/**
 * @author Jirka Kremser
 * @since 0.4.1
 */
public class RestConfiguration {
    public static final String PROPERTY_PREFIX = "rest.";

    public enum Keys implements Configuration.Property {
        STREAMING_SERIALIZATION(PROPERTY_PREFIX + "streaming.serialization", "false",
                "hawkular.inventory.rest.streaming.serialization");

        private final String propertyName;
        private final List<String> systemPropertyName;
        private final List<String> environmentVariableName;
        private final String defaultValue;

        Keys(String propertyName, String defaultValue, String systemPropertyName, String... environmentVariableName) {
            this.propertyName = propertyName;
            this.defaultValue = defaultValue;
            this.systemPropertyName = Collections.unmodifiableList(Collections.singletonList(systemPropertyName));
            this.environmentVariableName = Collections.unmodifiableList(Arrays.asList(environmentVariableName));
        }

        @Override
        public String getPropertyName() {
            return propertyName;
        }

        public String getDefaultValue() {
            return defaultValue;
        }

        @Override
        public List<String> getSystemPropertyNames() {
            return systemPropertyName;
        }

        @Override
        public List<String> getEnvironmentVariableNames() {
            return environmentVariableName;
        }

    }

    public static final String STREAMING_SERIALIZATION = PROPERTY_PREFIX + "streaming.serialization";
}
