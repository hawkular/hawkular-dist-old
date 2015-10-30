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
package org.hawkular.nest.extension;

import org.jboss.as.controller.OperationContext;
import org.jboss.as.controller.OperationFailedException;
import org.jboss.as.controller.OperationStepHandler;
import org.jboss.dmr.ModelNode;
import org.jboss.logging.Logger;
import org.jboss.msc.service.ServiceName;
import org.jboss.msc.service.ServiceNotFoundException;

class NestSubsystemStart implements OperationStepHandler {

    static final NestSubsystemStart INSTANCE = new NestSubsystemStart();

    private final Logger log = Logger.getLogger(NestSubsystemStart.class);

    private NestSubsystemStart() {
    }

    @Override
    public void execute(OperationContext opContext, ModelNode model) throws OperationFailedException {
        try {
            ServiceName name = NestService.SERVICE_NAME;
            NestService service = (NestService) opContext.getServiceRegistry(true).getRequiredService(name).getValue();

            boolean restart = model.get(NestSubsystemDefinition.START_OP_PARAM_RESTART.getName()).asBoolean(false);
            if (restart) {
                log.debug("Asked to restart the nest. Will stop it, then restart it now.");
                service.stopNest();
            }
            service.startNest();
        } catch (ServiceNotFoundException snfe) {
            throw new OperationFailedException("Cannot restart nest - the nest is disabled", snfe);
        } catch (Exception e) {
            throw new OperationFailedException("Cannot restart nest", e);
        }

        opContext.stepCompleted();
        return;
    }
}
