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
import org.jboss.logging.LogMessage;
import org.jboss.logging.Message;
import org.jboss.logging.MessageLogger;
import org.jboss.logging.annotations.ValidIdRange;

@MessageLogger(projectCode = "HAWKFEEDCOMM")
@ValidIdRange(min = 1, max = 5000)
public interface MsgLogger extends BasicLogger {

    MsgLogger LOG = Logger.getMessageLogger(MsgLogger.class, "org.hawkular.feedcom.ws");

    @LogMessage(level = Logger.Level.INFO)
    @Message(id = 1, value = "%s")
    void infoGeneric(String msg);

    @LogMessage(level = Logger.Level.WARN)
    @Message(id = 2, value = "%s")
    void warnGeneric(String msg);

    @LogMessage(level = Logger.Level.ERROR)
    @Message(id = 3, value = "%s")
    void errorGeneric(String msg);
}
