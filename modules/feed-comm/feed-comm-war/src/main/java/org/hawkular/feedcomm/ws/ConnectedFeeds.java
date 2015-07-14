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

import javax.annotation.PostConstruct;
import javax.ejb.ConcurrencyManagement;
import javax.ejb.ConcurrencyManagementType;
import javax.ejb.Lock;
import javax.ejb.LockType;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import javax.websocket.CloseReason;
import javax.websocket.Session;

/**
 * Maintains a runtime list of feeds currently connected with this server.
 */
@Startup
@Singleton
@ConcurrencyManagement(ConcurrencyManagementType.CONTAINER)
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

    @Lock(LockType.WRITE)
    public void addSession(String feedId, Session newSession) {
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
    }

    @Lock(LockType.WRITE)
    public void removeSession(String feedId, Session doomedSession) {
        boolean removed = false;

        // If no session was passed in, remove any session associated with the given feed.
        // If a session was passed in, only remove it if the feedId is associated with that session.
        // This is to support the need to close extra sessions a feed might have created.
        if (doomedSession == null) {
            removed = this.sessions.remove(feedId) != null;
        } else {
            Session existingSession = this.sessions.get(feedId);
            if (existingSession != null && existingSession.getId().equals(doomedSession.getId())) {
                removed = this.sessions.remove(feedId) != null;
            }
        }

        if (removed) {
            MsgLogger.LOG.infof("A feed session has been removed [%s]. There are now [%d] connected feeds",
                    feedId, this.sessions.size());
        }
    }

}
