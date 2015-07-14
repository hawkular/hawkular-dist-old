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
import javax.websocket.server.PathParam;
import javax.websocket.server.ServerEndpoint;

import org.hawkular.bus.common.BasicMessage;
import org.hawkular.feedcomm.api.ApiDeserializer;
import org.hawkular.feedcomm.api.GenericErrorResponseBuilder;
import org.hawkular.feedcomm.ws.command.Command;
import org.hawkular.feedcomm.ws.command.EchoCommand;

@ServerEndpoint("/{feedId}")
public class FeedCommWebSocket {

    private static final Map<String, Class<? extends Command>> VALID_COMMANDS;
    static {
        VALID_COMMANDS = new HashMap<>();
        VALID_COMMANDS.put(EchoCommand.REQUEST_CLASS.getName(), EchoCommand.class);
    }

    @Inject
    private ConnectedFeeds connectedFeeds;

    @OnOpen
    public void feedSessionOpen(Session session, @PathParam("feedId") String feedId) {
        MsgLogger.LOG.infof("Feed [%s] session opened", feedId);
        connectedFeeds.addSession(feedId, session);
    }

    /**
     * When a message is received from a feed, this method will execute the command the feed is asking for.
     *
     * @param nameAndJsonStr the name of the API request followed by "=" followed then by the request's JSON data
     * @param session the client session making the request
     * @param feedId identifies the feed that has connected
     * @return the results of the command invocation; this is sent back to the feed
     */
    @OnMessage
    public String feedMessage(String nameAndJsonStr, Session session, @PathParam("feedId") String feedId) {

        MsgLogger.LOG.infof("Received message from feed [%s]", feedId);

        String requestClassName = "?";
        String responseJson;

        try {
            BasicMessage request = new ApiDeserializer().deserialize(nameAndJsonStr);
            requestClassName = request.getClass().getName();

            Class<? extends Command> commandClass = VALID_COMMANDS.get(requestClassName);
            if (commandClass == null) {
                MsgLogger.LOG.errorInvalidCommandRequest(feedId, requestClassName);
                String errorMessage = "Invalid command request: " + requestClassName;
                responseJson = new GenericErrorResponseBuilder().setErrorMessage(errorMessage).build().toJSON();
            } else {
                Command command = commandClass.newInstance();
                BasicMessage response = command.execute(request);
                responseJson = response.toJSON();
            }
        } catch (Throwable t) {
            MsgLogger.LOG.errorCommandExecutionFailure(requestClassName, feedId, t);
            String errorMessage = "Command failed[" + requestClassName + "]";
            responseJson = new GenericErrorResponseBuilder()
                    .setThrowable(t)
                    .setErrorMessage(errorMessage)
                    .build()
                    .toJSON();

        }

        return responseJson;
    }

    @OnClose
    public void feedSessionClose(Session session, CloseReason reason, @PathParam("feedId") String feedId) {
        MsgLogger.LOG.infof("Feed [%s] session closed. Reason=[%s]", feedId, reason);
        connectedFeeds.removeSession(feedId, session);
    }
}
