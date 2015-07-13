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

import org.hawkular.feedcomm.ws.JsonUtil;

import com.fasterxml.jackson.annotation.JsonInclude;

public class BasicResponse {
    public enum ResultStatus {
        OK, ERROR
    }

    @JsonInclude
    private final ResultStatus resultStatus;

    @JsonInclude
    private final ErrorDetails errorDetails;

    /**
     * Constructs a basic "OK" response.
     */
    public BasicResponse() {
        this.resultStatus = ResultStatus.OK;
        this.errorDetails = null;

    }

    /**
     * Constructs an error response.
     *
     * @param errorDetails error details
     */
    public BasicResponse(ErrorDetails errorDetails) {
        this.resultStatus = ResultStatus.ERROR;
        this.errorDetails = errorDetails;
    }

    public ResultStatus getResultStatus() {
        return this.resultStatus;
    }

    /**
     * Provides details on the error that occurred, if one did occur.
     * This will be <code>null</code> if {@link #getResultStatus()} is {@link ResultStatus#OK}.
     *
     * @return if this result was an error, this describes the error that occurred
     */
    public ErrorDetails getErrorDetails() {
        return this.errorDetails;
    }

    /**
     * Serialize this object into JSON.
     *
     * @return this object's JSON representation
     */
    public String toJson() {
        String json = JsonUtil.toJson(this);
        return json;
    }
}
