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
package org.hawkular.component.availcreator;

import org.jboss.logging.BasicLogger;
import org.jboss.logging.Logger;
import org.jboss.logging.annotations.Cause;
import org.jboss.logging.annotations.LogMessage;
import org.jboss.logging.annotations.Message;
import org.jboss.logging.annotations.MessageLogger;

/**
 * Log messages of the creator
 *
 * @author Heiko W. Rupp
 */
@MessageLogger(projectCode = "HAWKULAR")
public interface Log extends BasicLogger {

    Log LOG = Logger.getMessageLogger(Log.class, "org.hawkular.component.availcreator");

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 5100, value = "No connection to topic %s possible")
    void wNoTopicConnection(String topicName);

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 5101, value = "Problem sending availabiliy to Hawkular Metrics: %s")
    void wAvailPostStatus(String s);

    @LogMessage(level = Logger.Level.ERROR)
    @Message(id = 5102, value = "Could not send a message to Hawkular Bus")
    void eCouldNotSendMessage(@Cause Throwable e);

    @LogMessage(level = Logger.Level.ERROR)
    @Message(id = 5103, value = "Could not handle a message from Hawkular Bus")
    void eCouldNotHandleBusMessage(@Cause Exception e);

    @LogMessage(level = Logger.Level.ERROR)
    @Message(id = 5104, value = "Could not parse a message to json format")
    void eCouldNotParseMessage(@Cause Throwable e);
}
