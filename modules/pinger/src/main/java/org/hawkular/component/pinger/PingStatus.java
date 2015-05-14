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
 * An outcome of a ping.
 *
 * @author Heiko W. Rupp
 * @author <a href="https://github.com/ppalaga">Peter Palaga</a>
 */
public class PingStatus {

    /**
     * Returns a new {@link PingStatus} with the given {@link PingDestination}, {@code timestamp},
     * {@code duration} and {@link PingStatus#timedOut} set to {@code true}.
     *
     * @param destination the destination where the ping was sent
     * @param timestamp the value of {@code System.currentTimeMillis()} when the response was received or when the
     *                  timeout or other error was detected
     * @param duration the ping round trip duration in milliseconds or {@value #INVALID_DURATION} if the ping timed out
     * @return a new {@link PingStatus}
     */
    public static final PingStatus timeout(PingDestination destination, long timestamp, int duration) {
        return new PingStatus(destination, 503, timestamp, duration, true);
    }

    /**
     * Returns a new timeout {@link PingStatus} with the given {@link PingDestination}, HTTP response code.
     *
     * @param destination the destination where the ping was sent
     * @param code the HTTP status code of the ping response
     * @return a new {@link PingStatus}
     */
    public static final PingStatus error(PingDestination destination, int code, long timestamp) {
        return new PingStatus(destination, code, timestamp, INVALID_DURATION);
    }

    /** A value for {@link #duration} in case the ping ends up in some broken state where there is no meaningful
     * duration. The value is {@value} */
    public static final int INVALID_DURATION = -1;

    /** The destination where the ping was sent */
    final PingDestination destination;

    /** Ping round trip duration in milliseconds or {@value #INVALID_DURATION} if the ping timed out */
    final int duration;

    /** The HTTP status code of the ping response */
    final int code;

    /** {@code true} if the ping timed out, {@code false} otherwise */
    final boolean timedOut;

    /** The value of {@code System.currentTimeMillis()} when the response was received or when the timeout or other
     * error was detected. */
    final long timestamp;

    /**
     * Creates a new {@link PingStatus} with {@link #timedOut} set to {@code false}.
     *
     * @param destination where the ping was sent
     * @param code the HTTP response code
     * @param timestamp the value of {@code System.currentTimeMillis()} when the response was received or when
     *                  the timeout or other error was detected
     * @param duration Ping round trip duration in milliseconds or {@value #INVALID_DURATION} if the ping timed out
     *
     * @see #timeout(PingDestination, long, int)
     * @see #error(PingDestination, int, long)
     */
    public PingStatus(PingDestination destination, int code, long timestamp, int duration) {
        this(destination, code, timestamp, duration, false);
    }

    /**
     * @param destination where the ping was sent
     * @param code the HTTP response code
     * @param timestamp the value of {@code System.currentTimeMillis()} when the response was received or when
     *                  the timeout or other error was detected
     * @param duration Ping round trip duration in milliseconds or {@value #INVALID_DURATION} if the ping timed out
     * @param timedOut {@code true} if the ping timed out, {@code false} otherwise
     *
     * @see #timeout(PingDestination, long, int)
     * @see #error(PingDestination, int, long)
     */
    private PingStatus(PingDestination destination, int code, long timestamp, int duration, boolean timedOut) {
        this.destination = destination;
        this.code = code;
        this.timestamp = timestamp;
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
        return "PingStatus{" + "destination=" + destination + ", code=" + code + ", timestamp=" + timestamp
                + ", duration=" + duration + ", timedOut=" + timedOut + '}';
    }

    public long getTimestamp() {
        return timestamp;
    }
}
