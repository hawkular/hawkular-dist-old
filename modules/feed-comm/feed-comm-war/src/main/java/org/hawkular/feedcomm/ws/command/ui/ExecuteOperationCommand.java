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
package org.hawkular.feedcomm.ws.command.ui;

import java.util.Collections;
import java.util.Map;
import java.util.Set;

import org.hawkular.bus.common.ConnectionContextFactory;
import org.hawkular.bus.common.Endpoint;
import org.hawkular.bus.common.MessageId;
import org.hawkular.bus.common.MessageProcessor;
import org.hawkular.bus.common.producer.ProducerConnectionContext;
import org.hawkular.feedcomm.api.ExecuteOperationRequest;
import org.hawkular.feedcomm.api.GenericSuccessResponse;
import org.hawkular.feedcomm.ws.Constants;
import org.hawkular.feedcomm.ws.command.Command;
import org.hawkular.feedcomm.ws.command.CommandContext;

/**
 * UI client requesting to execute an operation on a resource managed by a feed.
 */
public class ExecuteOperationCommand implements Command<ExecuteOperationRequest, GenericSuccessResponse> {
    public static final Class<ExecuteOperationRequest> REQUEST_CLASS = ExecuteOperationRequest.class;

    @Override
    public GenericSuccessResponse execute(ExecuteOperationRequest request, CommandContext context) throws Exception {

        // determine what feed needs to be sent the message
        String feedId;

        // TODO: THIS IS JUST FOR TESTING - JUST PICK A FEED, ANY FEED.
        //       IN THE FUTURE, WE NEED TO LOOK AT THE RESOURCE ID AND FIGURE OUT THE FEED RESPONSIBLE FOR IT
        Set<String> feeds = context.getConnectedFeeds().getAllFeeds();
        feedId = feeds.iterator().next();

        GenericSuccessResponse response;
        try (ConnectionContextFactory ccf = new ConnectionContextFactory(context.getConnectionFactory())) {
            Endpoint endpoint = new Endpoint(Endpoint.Type.TOPIC, Constants.DEST_FEED_EXECUTE_OP);
            ProducerConnectionContext pcc = ccf.createProducerConnectionContext(endpoint);
            Map<String, String> feedIdHeader = Collections.singletonMap(Constants.HEADER_FEEDID, feedId);
            MessageId mid = new MessageProcessor().send(pcc, request, feedIdHeader);
            response = new GenericSuccessResponse();
            response.setMessage("The execution request has been forwarded (id=" + mid + ")");
        }
        return response;
    }
}
