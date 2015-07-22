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

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import javax.annotation.PostConstruct;
import javax.ejb.ConcurrencyManagement;
import javax.ejb.ConcurrencyManagementType;
import javax.ejb.Lock;
import javax.ejb.LockType;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.websocket.Session;

import org.hawkular.feedcomm.ws.MsgLogger;

/**
 * Maintains a runtime list of UI clients currently connected with this server.
 */
@Startup
@Singleton
@ConcurrencyManagement(ConcurrencyManagementType.CONTAINER)
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
public class ConnectedUIClients {

    // key=sessionID, value=UI client websocket session
    private Map<String, Session> sessions;

    @PostConstruct
    public void initialize() {
        MsgLogger.LOG.debugf("ConnectedUIClients has initialized");
        this.sessions = new HashMap<>();
    }

    @Lock(LockType.READ)
    public int getTotalSessions() {
        return this.sessions.size();

    }

    @Lock(LockType.READ)
    public Set<Session> getAllSessions() {
        return new HashSet<Session>(this.sessions.values());
    }

    @Lock(LockType.READ)
    public Set<String> getAllSessionIds() {
        return new HashSet<String>(this.sessions.keySet());
    }

    @Lock(LockType.WRITE)
    public void addSession(Session newSession) {
        this.sessions.put(newSession.getId(), newSession);
        MsgLogger.LOG.infof("A UI client session has been added [%s]. There are now [%d] connected UI clients",
                newSession.getId(), this.sessions.size());

    }

    @Lock(LockType.WRITE)
    public void removeSession(Session doomedSession) {
        Session removed = this.sessions.remove(doomedSession.getId());
        if (removed != null) {
            MsgLogger.LOG.infof("A UI client session has been removed [%s]. There are now [%d] connected UI clients",
                    removed.getId(), this.sessions.size());
        }
    }

}
