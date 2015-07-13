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

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Contains some details that describe an error that occurred.
 */
public class ErrorDetails {

    @JsonInclude
    private final String errorMessage;

    @JsonInclude
    private final String exception;

    public ErrorDetails(String errorMessage) {
        this.errorMessage = errorMessage;
        this.exception = null;
    }

    public ErrorDetails(Throwable throwable) {
        this.errorMessage = null;
        this.exception = throwable.toString();
    }

    public ErrorDetails(String errorMessage, Throwable throwable) {
        this.errorMessage = errorMessage;
        this.exception = throwable.toString();
    }

}
