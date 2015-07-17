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
package org.hawkular.component.pinger;

import java.io.IOException;

import org.jboss.logging.BasicLogger;
import org.jboss.logging.Logger;
import org.jboss.logging.annotations.LogMessage;
import org.jboss.logging.annotations.Message;
import org.jboss.logging.annotations.MessageLogger;
import org.jboss.logging.annotations.Cause;

/**
 * Log messages of the pinger
 *
 * @author Heiko W. Rupp
 */
@MessageLogger(projectCode = "HAWKULAR")
public interface Log extends BasicLogger {

    Log LOG = Logger.getMessageLogger(Log.class, "org.hawkular.component.pinger");


    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 5000, value = "No action in message headers found")
    void wNoAction();

    @LogMessage(level = Logger.Level.DEBUG)
    @Message(id = 5001, value = "Could not ping URL '%s': %s")
    void dCouldNotPingUrl(String url, String message);

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 5002, value = "Post to Hawkular Metrics failed with post status : %s")
    void wMetricPostStatus(String s);

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 5003, value = "No connection to topic %s possible")
    void wNoTopicConnection(String topicName);

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 5004, value = "Could not contact Hawkular Inventory - there will be no resources to start pinging. " +
            "Code %d, message= %s")
    void wNoInventoryFound(int status, String reasonPhrase);

    @LogMessage(level = Logger.Level.INFO)
    @Message(id = 5005, value = "Resource '%s' of tenant '%s' is no longer present in inventory.")
    void iResourceNotFound(String resourceId, String tenantId);

    @LogMessage(level = Logger.Level.INFO)
    @Message(id = 5006, value = "About to initialize Hawkular Pinger with %d URLs")
    void iInitializedWithUrls(int urlsCount);

    @LogMessage(level = Logger.Level.ERROR)
    @Message(id = 5007, value = "Could not send a message to Hawkular Bus")
    void eCouldNotSendMessage(@Cause Throwable e);

    @LogMessage(level = Logger.Level.ERROR)
    @Message(id = 5008, value = "IOException accessing Hawkular Metrics")
    void eMetricsIoException(@Cause IOException e);

}
