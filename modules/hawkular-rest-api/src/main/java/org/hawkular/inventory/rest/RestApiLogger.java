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
package org.hawkular.inventory.rest;


import org.hawkular.inventory.api.model.CanonicalPath;
import org.jboss.logging.BasicLogger;
import org.jboss.logging.Logger;
import org.jboss.logging.annotations.Cause;
import org.jboss.logging.annotations.LogMessage;
import org.jboss.logging.annotations.Message;
import org.jboss.logging.annotations.MessageLogger;

/**
 * Logger definitions for Jboss Logging for the rest api
 *
 * Code range is 2000-2999
 *
 * @author Heiko W. Rupp
 */
@MessageLogger(projectCode = "HAWKINV")
public interface RestApiLogger extends BasicLogger {

    RestApiLogger LOGGER = Logger.getMessageLogger(RestApiLogger.class, "org.hawkular.inventory.rest");

    RestApiLogger REQUESTS_LOGGER = Logger
        .getMessageLogger(RestApiLogger.class, "org.hawkular.inventory.rest.requests");

    @LogMessage(level = Logger.Level.INFO)
    @Message(id = 2000, value = "Hawkular-Inventory REST Api is starting...")
    void apiStarting();

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 2001, value = "Something bad has happened")
    void warn(@Cause Throwable t);

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 2002, value = "Bus Integration initialization failed. Inventory will not notify about changes on " +
            "the Hawkular message bus. Cause: [%s]")
    void busInitializationFailed(String message);

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 2003, value = "Security check failed on entity: [%s]")
    void securityCheckFailed(String entityId, @Cause Throwable cause);

    @LogMessage(level = Logger.Level.DEBUG)
    @Message(id = 2004, value = "Accepting:\nHTTP %s -> %s\n\nheaders:\n%s\npayload:\n%s\njavaMethod: %s\n")
    void restCall(String method, String url, String headers, String jsonPayload, String javaMethod);

    @LogMessage(level = Logger.Level.ERROR)
    @Message(id = 2005, value = "Creating a resource under path '%s' is not implemented. This is a bug.")
    void resourceCreationNotSupported(CanonicalPath path);

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 2006, value = "Error while creating entity on path '%s' during a bulk create.")
    void failedToCreateBulkEntity(CanonicalPath path, @Cause Throwable cause);
}
