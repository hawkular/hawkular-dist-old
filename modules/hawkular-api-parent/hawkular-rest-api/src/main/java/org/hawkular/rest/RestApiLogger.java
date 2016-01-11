/*
 * Copyright 2015-2016 Red Hat, Inc. and/or its affiliates
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
package org.hawkular.rest;


import org.jboss.logging.BasicLogger;
import org.jboss.logging.Logger;
import org.jboss.logging.annotations.Cause;
import org.jboss.logging.annotations.LogMessage;
import org.jboss.logging.annotations.Message;
import org.jboss.logging.annotations.MessageLogger;

/**
 * Logger definitions for Jboss Logging for the rest api
 * <p/>
 * Code range is 2000-2999
 *
 * @author Heiko W. Rupp
 */
@MessageLogger(projectCode = "HAWKULAR")
public interface RestApiLogger extends BasicLogger {

    RestApiLogger LOGGER = Logger.getMessageLogger(RestApiLogger.class, "org.hawkular.rest");

    RestApiLogger REQUESTS_LOGGER = Logger
            .getMessageLogger(RestApiLogger.class, "org.hawkular.rest.requests");

    @LogMessage(level = Logger.Level.INFO)
    @Message(id = 5500, value = "Hawkular REST Api is starting...") void apiStarting();

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 5501, value = "Something bad has happened") void warn(@Cause Throwable t);

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 5502, value = "Bus Integration initialization failed. Inventory will not notify about changes on " +
            "the Hawkular message bus. Cause: [%s]") void busInitializationFailed(String message);

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 5503, value = "Security check failed on entity: [%s]") void securityCheckFailed(String entityId,
                                                                                                  @Cause
                                                                                                  Throwable cause);

    @LogMessage(level = Logger.Level.DEBUG)
    @Message(id = 5504, value = "Accepting:\nHTTP %s -> %s\n\nheaders:\n%s\npayload:\n%s\njavaMethod: %s\n")
    void restCall(String method, String url, String headers, String jsonPayload, String javaMethod);
}
