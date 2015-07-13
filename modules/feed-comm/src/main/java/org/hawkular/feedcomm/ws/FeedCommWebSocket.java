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

import javax.websocket.CloseReason;
import javax.websocket.OnClose;
import javax.websocket.OnMessage;
import javax.websocket.OnOpen;
import javax.websocket.Session;
import javax.websocket.server.ServerEndpoint;

import org.hawkular.feedcomm.ws.command.BasicResponse;
import org.hawkular.feedcomm.ws.command.Command;
import org.hawkular.feedcomm.ws.command.EchoCommand;
import org.hawkular.feedcomm.ws.command.ErrorDetails;

@ServerEndpoint("/")
public class FeedCommWebSocket {

    private static final Map<String, Class<? extends Command>> VALID_COMMANDS;
    static {
        VALID_COMMANDS = new HashMap<>();
        VALID_COMMANDS.put(EchoCommand.NAME, EchoCommand.class);
    }

    @OnOpen
    public void clientOpen(Session client) {
        MsgLogger.LOG.debug("Client connected");
    }

    /**
     * When a message is received from a feed, this method will execute the command the feed is asking for.
     *
     * @param commandAndJsonStr the name of the command followed optionally by "=" and with a json message.
     * @param client the client making the request
     * @return the results of the command invocation
     */
    @OnMessage
    public String clientMessage(String commandAndJsonStr, Session client) {
        String[] commandAndJsonArray = commandAndJsonStr.split("=", 2); // commandName[=jsonString]
        String commandName = commandAndJsonArray[0];
        String json = (commandAndJsonArray.length == 1) ? null : commandAndJsonArray[1];

        MsgLogger.LOG.debugf("Client message: command=[%s], json=[%s]", commandName, json);

        Class<? extends Command> commandClass = VALID_COMMANDS.get(commandName);
        if (commandClass == null) {
            MsgLogger.LOG.errorInvalidCommandName(commandName);
            return new BasicResponse(new ErrorDetails("Invalid command name: " + commandName)).toJson();
        }

        String response;

        try {
            Command command = commandClass.newInstance();
            response = command.execute(json);
        } catch (Throwable t) {
            MsgLogger.LOG.errorCommandExecutionFailure(commandName, json, t);
            response = new BasicResponse(new ErrorDetails("Command failed[" + commandName + "]", t)).toJson();
        }

        return response;
    }

    @OnClose
    public void clientClose(Session client, CloseReason reason) {
        MsgLogger.LOG.debugf("Client closed. Reason=[%s]", reason);
    }
}
