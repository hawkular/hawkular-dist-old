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

import org.jboss.logging.BasicLogger;
import org.jboss.logging.LogMessage;
import org.jboss.logging.Logger;
import org.jboss.logging.Message;
import org.jboss.logging.MessageLogger;

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

    @LogMessage
    @Message(id = 5001, value = "Pinging the remote threw an exception: %s")
    void wPingExeption(String message);

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 5002, value = "Post to metrics faild with post status : %s")
    void metricPostStatus(String s);

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 5003, value = "No connection to topic %s possible")
    void wNoTopicConnection(String topicName);

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 5004, value = "Could not contact inventory - there will be no resources to start pinging. " +
            "Code %d, message= %s")
    void wNoInventoryFound(int status, String reasonPhrase);
}
