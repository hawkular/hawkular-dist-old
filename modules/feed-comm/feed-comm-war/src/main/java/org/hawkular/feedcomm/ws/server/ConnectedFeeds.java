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
import javax.websocket.CloseReason;
import javax.websocket.Session;

import org.hawkular.feedcomm.ws.MsgLogger;

/**
 * Maintains a runtime list of feeds currently connected with this server.
 */
@Startup
@Singleton
@ConcurrencyManagement(ConcurrencyManagementType.CONTAINER)
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
public class ConnectedFeeds {

    // key=feedID, value=feed websocket session
    private Map<String, Session> sessions;

    @PostConstruct
    public void initialize() {
        MsgLogger.LOG.debugf("ConnectedFeeds has initialized");
        this.sessions = new HashMap<>();
    }

    @Lock(LockType.READ)
    public int getTotalSessions() {
        return this.sessions.size();

    }

    @Lock(LockType.READ)
    public Session getSession(String feedId) {
        return this.sessions.get(feedId);
    }

    @Lock(LockType.READ)
    public Set<Session> getAllSessions() {
        return new HashSet<Session>(this.sessions.values());
    }

    @Lock(LockType.READ)
    public Set<String> getAllFeeds() {
        return new HashSet<String>(this.sessions.keySet());
    }

    /**
     * Adds the given session and associates it with the given feed ID.
     * If there is already a session associated with the given feed ID,
     * the given session is closed, it is not added or associated with the given feed ID
     * and a error will be logged. The original session remains associated with the feed ID.
     *
     * @param feedId the feed ID that will be associated wit the new session
     * @param newSession the new session to add
     * @return if the session was added true is returned; false otherwise.
     */
    @Lock(LockType.WRITE)
    public boolean addSession(String feedId, Session newSession) {
        Session oldSession = this.sessions.putIfAbsent(feedId, newSession);

        if (oldSession == null) {
            MsgLogger.LOG.infof("A feed session has been added [%s]. There are now [%d] connected feeds",
                    feedId, this.sessions.size());
        } else {
            // a feed already had a session open, cannot open more than one
            try {
                MsgLogger.LOG.errorClosingExtraFeedSession(feedId);
                newSession.close(new CloseReason(CloseReason.CloseCodes.VIOLATED_POLICY,
                        "Cannot have multiple sessions open, the new one will be closed"));
            } catch (Exception e) {
                MsgLogger.LOG.errorCannotCloseExtraFeedSession(feedId, e);
            }
        }

        return oldSession == null;
    }

    /**
     * Removes the session associated with the given feed ID.
     * If doomedSession is not null, the feed's session will only be removed
     * if that feed session has the same ID as the given doomedSession.
     *
     * @param feedId identifies the session to be removed
     * @param doomedSession if not null, ensures that only this session will be removed
     * @return the removed session or null if nothing was removed
     */
    @Lock(LockType.WRITE)
    public Session removeSession(String feedId, Session doomedSession) {
        Session removed = null;

        // If no session was passed in, remove any session associated with the given feed.
        // If a session was passed in, only remove it if the feedId is associated with that session.
        // This is to support the need to close extra sessions a feed might have created.
        if (doomedSession == null) {
            removed = this.sessions.remove(feedId);
        } else {
            Session existingSession = this.sessions.get(feedId);
            if (existingSession != null && existingSession.getId().equals(doomedSession.getId())) {
                removed = this.sessions.remove(feedId);
            }
        }

        if (removed != null) {
            MsgLogger.LOG.infof("Session [%s] for feed [%s] has been removed. There are now [%d] connected feeds",
                    removed.getId(), feedId, this.sessions.size());
        }

        return removed;
    }
}
