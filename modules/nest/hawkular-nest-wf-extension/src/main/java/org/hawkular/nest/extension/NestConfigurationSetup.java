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
package org.hawkular.nest.extension;

import java.util.Map;

import org.jboss.as.server.ServerEnvironment;
import org.jboss.common.beans.property.PropertiesValueResolver;
import org.jboss.logging.Logger;

public class NestConfigurationSetup {

    private final Logger log = Logger.getLogger(NestConfigurationSetup.class);

    /**
     * Properties that will be used to complete the out-of-box configuration.
     */
    private final Map<String, String> customConfiguration;

    /**
     * Provides environment information about the server in which we are embedded.
     */
    private final ServerEnvironment serverEnvironment;

    public NestConfigurationSetup(Map<String, String> customConfigProps, ServerEnvironment serverEnv) {
        this.customConfiguration = customConfigProps;
        this.serverEnvironment = serverEnv;
        prepareConfiguration();
    }

    public Map<String, String> getCustomConfiguration() {
        return customConfiguration;
    }

    public ServerEnvironment getServerEnvironment() {
        return serverEnvironment;
    }

    private void prepareConfiguration() {
        // replace ${x} tokens in all values
        for (Map.Entry<String, String> entry : this.customConfiguration.entrySet()) {
            String value = entry.getValue();
            if (value != null) {
                entry.setValue(PropertiesValueResolver.replaceProperties(value));
            }
        }

        log.debugf("configuration: [%s]", this.customConfiguration);
        return;
    }
}
