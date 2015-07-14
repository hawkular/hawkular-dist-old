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
import java.util.Map;

import javax.inject.Inject;
import javax.websocket.CloseReason;
import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

import org.hawkular.bus.common.BasicMessage;
import org.hawkular.feedcomm.api.ApiDeserializer;
import org.hawkular.feedcomm.api.GenericErrorResponseBuilder;
import org.hawkular.feedcomm.ws.command.Command;
import org.hawkular.feedcomm.ws.command.EchoCommand;

/**
 * This is similiar to the feed web socket endpoint, however, it has a different set of allowed commants
 * that can be processed for a UI client.
 */
@ServerEndpoint("/ui")
public class UIClientCommWebSocket {

    private static final Map<String, Class<? extends Command<?, ?>>> VALID_COMMANDS;
    static {
        VALID_COMMANDS = new HashMap<>();
        VALID_COMMANDS.put(EchoCommand.REQUEST_CLASS.getName(), EchoCommand.class);
    }

    @Inject
    private ConnectedUIClients connectedUIClients;

    @OnOpen
    public void uiClientSessionOpen(Session session) {
        MsgLogger.LOG.infof("UI client session [%s] opened", session.getId());
        connectedUIClients.addSession(session);
    }

    /**
     * When a message is received from a UI client, this method will execute the command the client is asking for.
     *
     * @param nameAndJsonStr the name of the API request followed by "=" followed then by the request's JSON data
     * @param session the client session making the request
     * @return the results of the command invocation; this is sent back to the UI client
     */
    @OnMessage
    @SuppressWarnings({ "unchecked", "rawtypes" })
    public String uiClientMessage(String nameAndJsonStr, Session session) {

        MsgLogger.LOG.infof("Received message from UI client [%s]", session.getId());

        String requestClassName = "?";
        BasicMessage response;

        try {
            BasicMessage request = new ApiDeserializer().deserialize(nameAndJsonStr);
            requestClassName = request.getClass().getName();

            Class<? extends Command<?, ?>> commandClass = VALID_COMMANDS.get(requestClassName);
            if (commandClass == null) {
                MsgLogger.LOG.errorInvalidCommandRequestUIClient(session.getId(), requestClassName);
                String errorMessage = "Invalid command request: " + requestClassName;
                response = new GenericErrorResponseBuilder().setErrorMessage(errorMessage).build();
            } else {
                Command command = commandClass.newInstance();
                response = command.execute(request);
            }
        } catch (Throwable t) {
            MsgLogger.LOG.errorCommandExecutionFailureUIClient(requestClassName, session.getId(), t);
            String errorMessage = "Command failed[" + requestClassName + "]";
            response = new GenericErrorResponseBuilder()
                    .setThrowable(t)
                    .setErrorMessage(errorMessage)
                    .build();

        }

        String responseText = ApiDeserializer.toHawkularFormat(response);
        return responseText;
    }

    @OnClose
    public void uiClientSessionClose(Session session, CloseReason reason) {
        MsgLogger.LOG.infof("UI client session [%s] closed. Reason=[%s]", session.getId(), reason);
        connectedUIClients.removeSession(session);
    }
}
