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

package org.hawkular.feedcomm.ws.server;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.inject.Inject;
import javax.websocket.CloseReason;
import javax.websocket.CloseReason.CloseCodes;
import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.PathParam;
import javax.websocket.server.ServerEndpoint;

import org.hawkular.bus.common.BasicMessage;
import org.hawkular.feedcomm.api.ApiDeserializer;
import org.hawkular.feedcomm.api.GenericErrorResponseBuilder;
import org.hawkular.feedcomm.ws.MsgLogger;
import org.hawkular.feedcomm.ws.command.Command;
import org.hawkular.feedcomm.ws.command.CommandContext;
import org.hawkular.feedcomm.ws.command.EchoCommand;

@ServerEndpoint("/feed/{feedId}")
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
public class FeedCommWebSocket {

    private static final Map<String, Class<? extends Command<?, ?>>> VALID_COMMANDS;

    static {
        VALID_COMMANDS = new HashMap<>();
        VALID_COMMANDS.put(EchoCommand.REQUEST_CLASS.getName(), EchoCommand.class);
    }

    @Inject
    private ConnectedFeeds connectedFeeds;

    @Inject
    private ConnectedUIClients connectedUIClients;

    @Inject
    private FeedListenerGenerator feedListenerGenerator;

    @OnOpen
    public void feedSessionOpen(Session session, @PathParam("feedId") String feedId) {
        MsgLogger.LOG.infof("Feed [%s] session opened", feedId);
        boolean successfullyAddedSession = connectedFeeds.addSession(feedId, session);
        if (successfullyAddedSession) {
            try {
                feedListenerGenerator.addListeners(feedId);
            } catch (Exception e) {
                MsgLogger.LOG.errorf(e, "Failed to add message listeners for feed [%s]. Closing session [%s]", feedId,
                        session.getId());
                try {
                    session.close(new CloseReason(CloseCodes.UNEXPECTED_CONDITION, "Internal server error"));
                } catch (IOException ioe) {
                    MsgLogger.LOG.errorf(ioe,
                            "Failed to close feed [%s] session [%s] after internal server error",
                            feedId, session.getId());
                }
            }
        }
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
    @SuppressWarnings({ "unchecked", "rawtypes" })
    public String feedMessage(String nameAndJsonStr, Session session, @PathParam("feedId") String feedId) {

        MsgLogger.LOG.infof("Received message from feed [%s]", feedId);

        String requestClassName = "?";
        BasicMessage response;

        try {
            BasicMessage request = new ApiDeserializer().deserialize(nameAndJsonStr);
            requestClassName = request.getClass().getName();

            Class<? extends Command<?, ?>> commandClass = VALID_COMMANDS.get(requestClassName);
            if (commandClass == null) {
                MsgLogger.LOG.errorInvalidCommandRequestFeed(feedId, requestClassName);
                String errorMessage = "Invalid command request: " + requestClassName;
                response = new GenericErrorResponseBuilder().setErrorMessage(errorMessage).build();
            } else {
                CommandContext context = new CommandContext(connectedFeeds, connectedUIClients,
                        feedListenerGenerator.getConnectionFactory());
                Command command = commandClass.newInstance();
                response = command.execute(request, context);
            }
        } catch (Throwable t) {
            MsgLogger.LOG.errorCommandExecutionFailureFeed(requestClassName, feedId, t);
            String errorMessage = "Command failed[" + requestClassName + "]";
            response = new GenericErrorResponseBuilder()
                    .setThrowable(t)
                    .setErrorMessage(errorMessage)
                    .build();

        }

        String responseText = (response == null) ? null : ApiDeserializer.toHawkularFormat(response);
        return responseText;
    }

    @OnClose
    public void feedSessionClose(Session session, CloseReason reason, @PathParam("feedId") String feedId) {
        MsgLogger.LOG.infof("Feed [%s] session closed. Reason=[%s]", feedId, reason);
        boolean removed = connectedFeeds.removeSession(feedId, session) != null;
        if (removed) {
            feedListenerGenerator.removeListeners(feedId);
        }
    }
}
