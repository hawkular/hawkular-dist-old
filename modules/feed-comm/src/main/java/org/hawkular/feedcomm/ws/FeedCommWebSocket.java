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

package org.hawkular.feedcomm.ws;

import java.util.HashMap;

import javax.websocket.CloseReason;
import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

@ServerEndpoint("/")
public class FeedCommWebSocket {

    @OnOpen
    public void clientOpen(Session client) {
        MsgLogger.LOG.infoGeneric("Client connected");
    }

    @OnMessage
    public String clientMessage(String json, Session client) {
        MsgLogger.LOG.infoGeneric("Client message: " + json);
        try {
            HashMap<String, String> command = JsonUtil.fromJson(json, HashMap.class);
            return command.toString();
        } catch (Exception e) {
            return "ERROR: " + e;
        }
    }

    @OnClose
    public void clientClose(Session client, CloseReason reason) {
        MsgLogger.LOG.infoGeneric("Client closed");
    }
}
