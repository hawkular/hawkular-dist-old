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

import java.io.IOException;
import java.util.Collection;
import java.util.Collections;

import javax.websocket.RemoteEndpoint.Async;
import javax.websocket.RemoteEndpoint.Basic;
import javax.websocket.Session;

import org.hawkular.bus.common.BasicMessage;
import org.hawkular.feedcomm.api.ApiDeserializer;

/**
 * Some convienence methods when working with WebSockets.
 */
public class WebSocketHelper {

    private Long asyncTimeout;

    public WebSocketHelper() {
        this.asyncTimeout = null;
    }

    /**
     * Creates a helper object.
     *
     * @param timeout number of milliseconds before an asynchronous send will timeout.
     *                A negative number means no timeout, null means use the WebSocket default timeout.
     */
    public WebSocketHelper(Long asyncTimeout) {
        this.asyncTimeout = asyncTimeout;
    }

    /**
     * Converts the given message to JSON and sends that JSON text to clients asynchronously.
     *
     * @param sessions the client sessions where the JSON message will be sent
     * @param msg the message to be converted to JSON and sent
     */
    public void sendBasicMessageAsync(Collection<Session> sessions, BasicMessage msg) {
        String text = ApiDeserializer.toHawkularFormat(msg);
        sendTextAsync(sessions, text);
    }

    /**
     * Converts the given message to JSON and sends that JSON text to clients synchronously.
     * If you send to multiple sessions, but an error occurred
     * trying to deliver to one of the sessions, this method aborts, throws an exception, and the rest
     * of the sessions will not get the message.
     *
     * @param sessions the client sessions where the message will be sent
     * @param msg the message to be converted to JSON and sent
     * @throws IOException if a problem occurred during delivery of the message to a session.
     */
    public void sendBasicMessageSync(Collection<Session> sessions, BasicMessage msg) throws IOException {
        String text = ApiDeserializer.toHawkularFormat(msg);
        sendTextSync(sessions, text);
    }

    /**
     * Sends text to clients asynchronously.
     *
     * @param sessions the client sessions where the message will be sent
     * @param text the message
     */
    public void sendTextAsync(Collection<Session> sessions, String text) {
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        if (text == null) {
            throw new IllegalArgumentException("message must not be null");
        }

        MsgLogger.LOG.infof("Attempting to send async message to [%d] clients: [%s]", sessions.size(), text);

        for (Session session : sessions) {
            if (session.isOpen()) {
                Async asyncRemote = session.getAsyncRemote();
                if (this.asyncTimeout != null) {
                    asyncRemote.setSendTimeout(this.asyncTimeout.longValue());
                }
                asyncRemote.sendText(text);
            }
        }

        return;
    }

    /**
     * Sends text to clients synchronously. If you send to multiple sessions, but an error occurred
     * trying to deliver to one of the sessions, this method aborts, throws an exception, and the rest
     * of the sessions will not get the message.
     *
     * @param sessions the client sessions where the message will be sent
     * @param text the message
     * @throws IOException if a problem occurred during delivery of the message to a session.
     */
    public void sendTextSync(Collection<Session> sessions, String text) throws IOException {
        if (sessions == null || sessions.isEmpty()) {
            return;
        }

        if (text == null) {
            throw new IllegalArgumentException("message must not be null");
        }

        MsgLogger.LOG.infof("Attempting to send message to [%d] clients: [%s]", sessions.size(), text);

        for (Session session : sessions) {
            if (session.isOpen()) {
                Basic basicRemote = session.getBasicRemote();
                basicRemote.sendText(text);
            }
        }

        return;
    }

    public void sendBasicMessageAsync(Session session, BasicMessage msg) {
        sendBasicMessageAsync(Collections.singletonList(session), msg);
    }

    public void sendBasicMessageSync(Session session, BasicMessage msg) throws IOException {
        sendBasicMessageSync(Collections.singletonList(session), msg);
    }

    public void sendTextAsync(Session session, String text) {
        sendTextAsync(Collections.singletonList(session), text);
    }

    public void sendTextSync(Session session, String text) throws IOException {
        sendTextSync(Collections.singletonList(session), text);
    }
}
