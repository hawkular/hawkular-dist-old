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
package org.hawkular.feedcomm.ws.command;

import javax.jms.ConnectionFactory;

import org.hawkular.feedcomm.ws.server.ConnectedFeeds;
import org.hawkular.feedcomm.ws.server.ConnectedUIClients;

public class CommandContext {
    public final ConnectedFeeds connectedFeeds;
    public final ConnectedUIClients connectedUIClients;
    public final ConnectionFactory connectionFactory;

    public CommandContext(ConnectedFeeds f, ConnectedUIClients ui, ConnectionFactory cf) {
        this.connectedFeeds = f;
        this.connectedUIClients = ui;
        this.connectionFactory = cf;
    }

    public ConnectedFeeds getConnectedFeeds() {
        return connectedFeeds;
    }

    public ConnectedUIClients getConnectedUIClients() {
        return connectedUIClients;
    }

    public ConnectionFactory getConnectionFactory() {
        return connectionFactory;
    }
}