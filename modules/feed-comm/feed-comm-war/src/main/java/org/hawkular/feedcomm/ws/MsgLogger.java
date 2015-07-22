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

import org.jboss.logging.BasicLogger;
import org.jboss.logging.Logger;
import org.jboss.logging.annotations.Cause;
import org.jboss.logging.annotations.LogMessage;
import org.jboss.logging.annotations.Message;
import org.jboss.logging.annotations.MessageLogger;
import org.jboss.logging.annotations.ValidIdRange;

@MessageLogger(projectCode = "HAWKFEEDCOMM")
@ValidIdRange(min = 1, max = 5000)
public interface MsgLogger extends BasicLogger {

    MsgLogger LOG = Logger.getMessageLogger(MsgLogger.class, "org.hawkular.feedcomm.ws");

    @LogMessage(level = Logger.Level.ERROR)
    @Message(id = 1, value = "Feed [%s] provided an invalid command request: [%s]")
    void errorInvalidCommandRequestFeed(String feedId, String invalidCommandRequest);

    @LogMessage(level = Logger.Level.ERROR)
    @Message(id = 2, value = "Failed to execute command [%s] for feed [%s]")
    void errorCommandExecutionFailureFeed(String commandRequest, String feedId, @Cause Throwable t);

    @LogMessage(level = Logger.Level.ERROR)
    @Message(id = 3, value = "A feed [%s] opened multiple sessions. This is a violation; closing the extra session")
    void errorClosingExtraFeedSession(String feedId);

    @LogMessage(level = Logger.Level.ERROR)
    @Message(id = 4, value = "Cannot close the extra session created by feed [%s]")
    void errorCannotCloseExtraFeedSession(String feedId, @Cause Throwable t);

    @LogMessage(level = Logger.Level.ERROR)
    @Message(id = 5, value = "UI client session [%s] provided an invalid command request: [%s]")
    void errorInvalidCommandRequestUIClient(String sessionId, String invalidCommandRequest);

    @LogMessage(level = Logger.Level.ERROR)
    @Message(id = 6, value = "Failed to execute command [%s] for UI client session [%s]")
    void errorCommandExecutionFailureUIClient(String commandRequest, String sessionId, @Cause Throwable t);

    @LogMessage(level = Logger.Level.ERROR)
    @Message(id = 7, value = "Cannot process an execute-operation message")
    void errorCannotProcessExecuteOperationMessage(@Cause Exception e);

}
