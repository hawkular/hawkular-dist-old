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
package org.hawkular.nest.extension.log;

import org.jboss.logging.Logger;
import org.jboss.logging.Logger.Level;
import org.jboss.logging.annotations.Cause;
import org.jboss.logging.annotations.LogMessage;
import org.jboss.logging.annotations.Message;
import org.jboss.logging.annotations.MessageLogger;
import org.jboss.logging.annotations.ValidIdRange;

/**
 * @author John Mazzitelli
 */
@MessageLogger(projectCode = "HAWKBUS")
@ValidIdRange(min = 130000, max = 139999)
public interface MsgLogger {
    MsgLogger LOGGER = Logger.getMessageLogger(MsgLogger.class, MsgLogger.class.getPackage().getName());

    @LogMessage(level = Level.INFO)
    @Message(id = 130000, value = "Nest service starting")
    void infoNestStarting();

    @LogMessage(level = Level.INFO)
    @Message(id = 130001, value = "Nest service started")
    void infoNestStarted();

    @LogMessage(level = Level.INFO)
    @Message(id = 130002, value = "Nest service stopping")
    void infoNestStopping();

    @LogMessage(level = Level.INFO)
    @Message(id = 130003, value = "Nest service stopped")
    void infoNestStopped();

    @LogMessage(level = Level.INFO)
    @Message(id = 130004, value = "Nest name=[%s]")
    void infoNestName(String name);

    @LogMessage(level = Level.INFO)
    @Message(id = 130005, value = "Broker service is not started")
    void infoBrokerServiceNotStarted();

    @LogMessage(level = Level.ERROR)
    @Message(id = 130006, value = "Cannot close the messaging connection context factory")
    void errorCannotCloseMsgConnCtxFactory(@Cause Throwable t);

    @LogMessage(level = Level.INFO)
    @Message(id = 130007, value = "There is a broker at [%s]")
    void infoBrokerExists(String brokerUrl);

    @LogMessage(level = Level.INFO)
    @Message(id = 130008, value = "[%d] deployments found")
    void infoDeploymentsFound(int deploymentsCount);

    @LogMessage(level = Level.INFO)
    @Message(id = 130009, value = "%d. Deploying [%s]")
    void infoDeploying(int deploymentNumber, String deploymentName);

    @LogMessage(level = Level.ERROR)
    @Message(id = 130010, value = "Failed to get deployments from [%s] - nothing will be deployed")
    void errorFailedGettingDeployments(String deploymentsLocation);

    @LogMessage(level = Level.ERROR)
    @Message(id = 130011, value = "[%s] is not a directory - nothing will be deployed")
    void errorBadDeploymentsDirectory(String deploymentsLocation);

    @LogMessage(level = Level.ERROR)
    @Message(id = 130012, value = "Missing directory [%s] - nothing will be deployed")
    void errorMissingDeploymentsDirectory(String deploymentsLocation);

    @LogMessage(level = Level.INFO)
    @Message(id = 130013, value = "Nest is not enabled and will not be deployed")
    void infoNestNotEnabled();

    @LogMessage(level = Level.INFO)
    @Message(id = 130014, value = "Nest is enabled and will be deployed")
    void infoNestEnabled();

    @LogMessage(level = Level.INFO)
    @Message(id = 130015, value = "Initializing Nest subsystem")
    void infoInitializingNestSubsystem();

}
