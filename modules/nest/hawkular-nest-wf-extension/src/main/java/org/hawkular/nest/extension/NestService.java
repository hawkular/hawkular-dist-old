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

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.hawkular.bus.broker.extension.BrokerService;
import org.hawkular.bus.common.ConnectionContextFactory;
import org.hawkular.nest.extension.log.MsgLogger;
import org.jboss.as.server.ServerEnvironment;
import org.jboss.logging.Logger;
import org.jboss.msc.service.Service;
import org.jboss.msc.service.ServiceName;
import org.jboss.msc.service.StartContext;
import org.jboss.msc.service.StartException;
import org.jboss.msc.service.StopContext;
import org.jboss.msc.value.InjectedValue;

public class NestService implements Service<NestService> {

    public static final ServiceName SERVICE_NAME = ServiceName.of("org.hawkular.nest").append(
            NestSubsystemExtension.SUBSYSTEM_NAME);

    private final MsgLogger msglog = MsgLogger.LOGGER;
    private final Logger log = Logger.getLogger(NestService.class);

    /**
     * Our subsystem add-step handler will inject this as a dependency for us. This service gives us information about
     * the server, like the install directory, data directory, etc. Package-scoped so the add-step handler can access
     * this.
     */
    final InjectedValue<ServerEnvironment> envServiceValue = new InjectedValue<ServerEnvironment>();

    /**
     * Our subsystem add-step handler will inject this as a dependency for us.
     */
    final InjectedValue<BrokerService> brokerService = new InjectedValue<BrokerService>();

    /**
     * Configuration settings that help complete the configuration.
     * These are settings that the user set in the subsystem (e.g. standalone.xml or via CLI).
     */
    private Map<String, String> customConfigProperties = Collections.synchronizedMap(new HashMap<String, String>());

    /**
     * Indicates if this service has been started.
     */
    private boolean started = false;

    /**
     * The name this service identifies itself as.
     */
    private String nestName;

    /**
     * Use this to create contexts needed to talk to the messaging system.
     */
    private ConnectionContextFactory messagingConnectionContextFactory;

    public NestService() {
    }

    @Override
    public NestService getValue() throws IllegalStateException, IllegalArgumentException {
        return this;
    }

    @Override
    public void start(StartContext context) throws StartException {
        msglog.infoNestStarting();
        startNest();
        msglog.infoNestStarted();
    }

    @Override
    public void stop(StopContext context) {
        msglog.infoNestStopping();
        stopNest();
        msglog.infoNestStopped();
    }

    public boolean isStarted() {
        return this.started;
    }

    protected void startNest() throws StartException {
        if (isStarted()) {
            return; // nothing to do, already started
        }

        msglog.infoNestName(getNestName());

        // we don't necessarily need the broker, but if it is not started, log that fact.
        BrokerService broker = this.brokerService.getValue();
        if (broker.isBrokerStarted()) {
            try {
                setupMessaging(broker);
            } catch (Exception e) {
                throw new StartException("Cannot initialize messaging client", e);
            }
        } else {
            msglog.infoBrokerServiceNotStarted();
        }

        this.started = true;
    }

    protected void stopNest() {
        if (!isStarted()) {
            return; // nothing to do, already stopped
        }

        try {
            if (messagingConnectionContextFactory != null) {
                messagingConnectionContextFactory.close();
            }
        } catch (Exception e) {
            msglog.errorCannotCloseMsgConnCtxFactory(e);
        }

        this.started = false;
    }

    protected void setNestName(String name) {
        nestName = name;
    }

    /**
     * Do not call this until the nest has been initialized - it needs a dependent service.
     *
     * @return the name this nest is to be identified as
     */
    protected String getNestName() {
        if (nestName == null || nestName.equals(NestSubsystemExtension.NEST_NAME_AUTOGENERATE)) {
            return this.envServiceValue.getValue().getNodeName();
        } else {
            return nestName;
        }
    }

    protected void setCustomConfigurationProperties(Map<String, String> properties) {
        synchronized (customConfigProperties) {
            customConfigProperties.clear();
            if (properties != null) {
                customConfigProperties.putAll(properties);
            }
        }
    }

    protected void setupMessaging(BrokerService broker) throws Exception {
        String brokerURL = "vm://" + broker.getBrokerName();
        msglog.infoBrokerExists(brokerURL);
        messagingConnectionContextFactory = new ConnectionContextFactory(brokerURL);
    }
}
