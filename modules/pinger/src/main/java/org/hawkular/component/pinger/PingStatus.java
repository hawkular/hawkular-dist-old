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


/**
 * Outcome of the ping
 *
 * @author Heiko W. Rupp
 */
public class PingStatus {

    PingDestination destination;
    int duration;
    int code;
    boolean timedOut = false;
    private long timestamp;

    public PingStatus(PingDestination destination) {
        this.destination = destination;
        this.timestamp = System.currentTimeMillis();
    }

    public PingStatus(PingDestination destination, int code, int duration) {
        this.destination = destination;
        this.code = code;
        this.duration = duration;
    }

    public PingStatus(PingDestination destination, int code, int duration, boolean timedOut) {
        this.destination = destination;
        this.code = code;
        this.duration = duration;
        this.timedOut = timedOut;
    }

    public int getCode() {
        return code;
    }

    public int getDuration() {
        return duration;
    }

    public boolean isTimedOut() {
        return timedOut;
    }

    @Override
    public String toString() {
        return "PingStatus{" +
                "destination=" + destination +
                ", code=" + code +
                ", duration=" + duration +
                ", timedOut=" + timedOut +
                '}';
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }
}
