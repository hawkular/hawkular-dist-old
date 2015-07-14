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
package org.hawkular.feedcomm.ws.command;

import org.hawkular.bus.common.BasicMessage;
import org.hawkular.feedcomm.api.EchoRequest;
import org.hawkular.feedcomm.api.EchoResponse;

public class EchoCommand implements Command {
    public static String NAME = "echo";

    @Override
    public BasicMessage execute(String json) {
        // hydrate request object from the JSON message
        EchoRequest echoRequest = EchoRequest.fromJSON(json, EchoRequest.class);

        // execute the request
        String reply = String.format("ECHO [%s]", echoRequest.getEchoMessage());

        // return the response
        EchoResponse echoResponse = new EchoResponse();
        echoResponse.setReply(reply);
        return echoResponse;
    }
}
