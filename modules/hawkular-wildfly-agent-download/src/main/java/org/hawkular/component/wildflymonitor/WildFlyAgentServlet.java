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
package org.hawkular.component.wildflymonitor;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.concurrent.atomic.AtomicInteger;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * Serves the Hawkular WildFly Agent download that is stored in the server's download area.
 */
@WebServlet(urlPatterns = { "/download" }, loadOnStartup = 1)
public class WildFlyAgentServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;

    // the system property that defines how many concurrent downloads we will allow (0 == disable)
    private static String SYSPROP_AGENT_DOWNLOADS_LIMIT = "hawkular-wildfly-agent-downloads-limit";

    // if the system property is not set or invalid, this is the default limit for number of concurrent downloads
    private static int DEFAULT_AGENT_DOWNLOADS_LIMIT = 100;

    // the error code that will be returned if the server has been configured to disable agent updates
    private static final int ERROR_CODE_AGENT_UPDATE_DISABLED = HttpServletResponse.SC_FORBIDDEN;

    // the error code that will be returned if the server has too many agents downloading the agent update binary
    private static final int ERROR_CODE_TOO_MANY_DOWNLOADS = HttpServletResponse.SC_SERVICE_UNAVAILABLE;

    private AtomicInteger numActiveDownloads = null;
    private File downloadFile = null;

    @Override
    public void init() throws ServletException {
        log("Starting the WildFly Agent download servlet");
        numActiveDownloads = new AtomicInteger(0);
        try {
            log("Agent File: " + getAgentDownloadFile());
        } catch (Throwable t) {
            throw new ServletException("Missing Hawkular WildFly Agent download file", t);
        }
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

        disableBrowserCache(resp);

        String servletPath = req.getServletPath();
        if (servletPath != null) {
            if (servletPath.endsWith("download")) {
                try {
                    numActiveDownloads.incrementAndGet();
                    getDownload(req, resp);
                } finally {
                    numActiveDownloads.decrementAndGet();
                }
            } else {
                resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid servlet path [" + servletPath
                        + "] - please contact administrator");
            }
        } else {
            resp.sendError(HttpServletResponse.SC_BAD_REQUEST, "Invalid servlet path - please contact administrator");
        }

        return;
    }

    private void getDownload(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        int limit = getDownloadLimit();
        if (limit <= 0) {
            sendErrorDownloadsDisabled(resp);
            return;
        } else if (limit < numActiveDownloads.get()) {
            sendErrorTooManyDownloads(resp);
            return;
        }

        try {
            File agentJar = getAgentDownloadFile();
            resp.setContentType("application/octet-stream");
            resp.setHeader("Content-Disposition", "attachment; filename=" + agentJar.getName());
            resp.setContentLength((int) agentJar.length());
            resp.setDateHeader("Last-Modified", agentJar.lastModified());
            try (FileInputStream agentJarStream = new FileInputStream(agentJar)) {
                copy(agentJarStream, resp.getOutputStream());
            }
        } catch (Throwable t) {
            String clientAddr = getClientAddress(req);
            log("Failed to stream file to remote client [" + clientAddr + "]", t);
            disableBrowserCache(resp);
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to stream file");
        }

        return;
    }

    private int getDownloadLimit() {
        String limitStr = System.getProperty(SYSPROP_AGENT_DOWNLOADS_LIMIT,
                String.valueOf(DEFAULT_AGENT_DOWNLOADS_LIMIT));
        int limit;
        try {
            limit = Integer.parseInt(limitStr);
        } catch (Exception e) {
            limit = DEFAULT_AGENT_DOWNLOADS_LIMIT;
            log("Agent downloads limit system property [" + SYSPROP_AGENT_DOWNLOADS_LIMIT
                    + "] is invalid [" + limitStr + "] - limit will be [" + limit + "].");
        }

        return limit;
    }

    private void disableBrowserCache(HttpServletResponse resp) {
        resp.setHeader("Cache-Control", "no-cache, no-store");
        resp.setHeader("Expires", "-1");
        resp.setHeader("Pragma", "no-cache");
    }

    private void sendErrorDownloadsDisabled(HttpServletResponse resp) throws IOException {
        disableBrowserCache(resp);
        resp.sendError(ERROR_CODE_AGENT_UPDATE_DISABLED, "Downloads have been disabled");
    }

    private void sendErrorTooManyDownloads(HttpServletResponse resp) throws IOException {
        disableBrowserCache(resp);
        resp.setHeader("Retry-After", "30");
        resp.sendError(ERROR_CODE_TOO_MANY_DOWNLOADS, "Maximum limit exceeded - try again later");
    }

    private String getClientAddress(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
            if (ip == null || ip.length() == 0 || "unknown".equalsIgnoreCase(ip)) {
                ip = String.format("%s (%s)", request.getRemoteHost(), request.getRemoteAddr());
            }
        }
        return ip;
    }

    private void copy(InputStream input, OutputStream output) throws IOException {
        byte[] buffer = new byte[32768];
        input = new BufferedInputStream(input, buffer.length);
        for (int bytesRead = input.read(buffer); bytesRead != -1; bytesRead = input.read(buffer)) {
            output.write(buffer, 0, bytesRead);
        }
        output.flush();
    }

    private File getAgentDownloadFile() throws Exception {
        if (downloadFile != null) {
            if (downloadFile.exists()) {
                return downloadFile;
            } else {
                downloadFile = null; // the file was removed recently - let's look for a new one
            }
        }

        File configDir = new File(System.getProperty("jboss.server.config.dir"));
        for (File file : configDir.listFiles()) {
            if (file.getName().startsWith("hawkular-monitor-wf-extension") && file.getName().endsWith(".zip")) {
                downloadFile = file;
                return downloadFile;
            }
        }
        throw new FileNotFoundException("Cannot find agent download in: " + configDir);
    }

}
