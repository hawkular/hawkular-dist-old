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
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;
import java.util.zip.ZipOutputStream;

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
    private static final String SYSPROP_AGENT_DOWNLOADS_LIMIT = "hawkular.wildfly.agent.downloads.limit";

    // if the system property is not set or invalid, this is the default limit for number of concurrent downloads
    private static final int DEFAULT_AGENT_DOWNLOADS_LIMIT = 100;

    // name of the property file stored in the root of the installer jar file
    private static String AGENT_INSTALLER_PROPERTIES_FILE_NAME = "hawkular-wildfly-agent-installer.properties";

    private static String AGENT_INSTALLER_PROPERTY_WILDFLY_HOME = "wildfly-home";
    private static String AGENT_INSTALLER_PROPERTY_MODULE_DIST = "module-dist";
    private static String AGENT_INSTALLER_PROPERTY_HAWKULAR_SERVER = "hawkular-server-url";
    private static String AGENT_INSTALLER_PROPERTY_USERNAME = "hawkular-username";
    private static String AGENT_INSTALLER_PROPERTY_PASSWORD = "hawkular-password";

    // the error code that will be returned if the server has been configured to disable agent updates
    private static final int ERROR_CODE_AGENT_UPDATE_DISABLED = HttpServletResponse.SC_FORBIDDEN;

    // the error code that will be returned if the server has too many agents downloading the agent update binary
    private static final int ERROR_CODE_TOO_MANY_DOWNLOADS = HttpServletResponse.SC_SERVICE_UNAVAILABLE;

    private AtomicInteger numActiveDownloads = null;
    private File moduleDownloadFile = null;
    private File installerDownloadFile = null;

    @Override
    public void init() throws ServletException {
        log("Starting the WildFly Agent download servlet");
        numActiveDownloads = new AtomicInteger(0);
        try {
            log("Agent Module File: " + getAgentModuleDownloadFile());
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
    }

    private void downloadAgentModule(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            File agentModuleZip = getAgentModuleDownloadFile();
            resp.setContentType("application/octet-stream");
            resp.setHeader("Content-Disposition", "attachment; filename=" + agentModuleZip.getName());
            resp.setContentLength((int) agentModuleZip.length());
            resp.setDateHeader("Last-Modified", agentModuleZip.lastModified());
            try (FileInputStream agentModuleZipStream = new FileInputStream(agentModuleZip)) {
                copy(agentModuleZipStream, resp.getOutputStream());
            }
        } catch (Throwable t) {
            String clientAddr = getClientAddress(req);
            log("Failed to stream file to remote client [" + clientAddr + "]", t);
            disableBrowserCache(resp);
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to stream file");
        }
    }

    private void downloadAgentInstaller(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            File agentInstallerJar = getAgentInstallerDownloadFile();
            resp.setContentType("application/octet-stream");
            resp.setHeader("Content-Disposition", "attachment; filename=" + agentInstallerJar.getName());
            resp.setContentLength((int) agentInstallerJar.length());
            resp.setDateHeader("Last-Modified", agentInstallerJar.lastModified());

            ZipFile agentInstallerZip = new ZipFile(agentInstallerJar);
            ZipOutputStream zos = new ZipOutputStream(resp.getOutputStream(), StandardCharsets.UTF_8);
            final String wildflyHome = getValueFromQueryParam(req, AGENT_INSTALLER_PROPERTY_WILDFLY_HOME, null);
            final String hawkularServer = getValueFromQueryParam(req, AGENT_INSTALLER_PROPERTY_HAWKULAR_SERVER,
                    "http://localhost:8080");
            String defaultModuleDist = hawkularServer.startsWith("http:") ? hawkularServer +
                    "/hawkular/wildfly-agent/download" : "http://localhost:8080/wildfly-agent/download";
            final String moduleDist = getValueFromQueryParam(req, AGENT_INSTALLER_PROPERTY_MODULE_DIST,
                    defaultModuleDist);
            final String username = getValueFromQueryParam(req, AGENT_INSTALLER_PROPERTY_USERNAME, null);
            final String password = getValueFromQueryParam(req, AGENT_INSTALLER_PROPERTY_PASSWORD, null);


            for (Enumeration<? extends ZipEntry> e = agentInstallerZip.entries(); e.hasMoreElements(); ) {
                ZipEntry entryIn = e.nextElement();
                if (!entryIn.getName().equalsIgnoreCase(AGENT_INSTALLER_PROPERTIES_FILE_NAME)) {
                    // skip everything else
                    zos.putNextEntry(entryIn);
                    try (InputStream is = agentInstallerZip.getInputStream(entryIn)) {
                        byte[] buf = new byte[4096];
                        int len;
                        while ((len = (is.read(buf))) > 0) {
                            zos.write(buf, 0, len);
                        }
                    }
                } else {
                    zos.putNextEntry(new ZipEntry(AGENT_INSTALLER_PROPERTIES_FILE_NAME));
                    try (BufferedReader br =
                                 new BufferedReader(
                                         new InputStreamReader(agentInstallerZip.getInputStream(entryIn),
                                                 StandardCharsets.UTF_8)
                                 )) {
                        String line;
                        while ((line = br.readLine()) != null) {
                            //todo: it'd be better to reuse the strings from the agent installer module to keep it DRY
                            // and resilient against the changes
                            if (wildflyHome != null && line.contains("#wildfly-home=/opt/wildfly")) {
                                line = line.replaceAll("#wildfly-home=/opt/wildfly", "wildfly-home=" + wildflyHome);
                            } else if (line.contains("#module-dist=")) {
                                line = line.replaceAll("#module-dist=", "module-dist=" + moduleDist);
                            } else if (line.contains("#hawkular-server-url=http://localhost:8080")) {
                                line = line.replaceAll("#hawkular-server-url=http://localhost:8080",
                                        "hawkular-server-url=" + hawkularServer);
                            } else if (username != null && line.contains("hawkular-username=")) {
                                line = line.replaceAll("hawkular-username=", "hawkular-username=" + username);
                            } else if (password != null && line.contains("hawkular-password=")) {
                                line = line.replaceAll("hawkular-password=", "hawkular-password=" + password);
                            }
                            byte[] buf = (line + '\n').getBytes(StandardCharsets.UTF_8);
                            zos.write(buf);
                        }
                    }
                }
                zos.closeEntry();
            }
            zos.close();
        } catch (Throwable t) {
            String clientAddr = getClientAddress(req);
            log("Failed to stream file to remote client [" + clientAddr + "]", t);
            disableBrowserCache(resp);
            resp.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Failed to stream file");
        }
    }

    private String getValueFromQueryParam(HttpServletRequest req, String key, String
            defaultValue) throws IOException {
        String value = req.getParameter(key);
        if (value == null || value.isEmpty()) {
            return defaultValue;
        }
        return value;
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
        // ?installer=true downloads the installer
        if ("true".equals(req.getParameter("installer"))) {
            downloadAgentInstaller(req, resp);
        } else {
            downloadAgentModule(req, resp);
        }
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

    private File getAgentModuleDownloadFile() throws Exception {
        if (moduleDownloadFile != null) {
            if (moduleDownloadFile.exists()) {
                return moduleDownloadFile;
            } else {
                moduleDownloadFile = null; // the file was removed recently - let's look for a new one
            }
        }

        File configDir = new File(System.getProperty("jboss.server.config.dir"));
        for (File file : configDir.listFiles()) {
            if (file.getName().startsWith("hawkular-wildfly-agent-wf-extension") && file.getName().endsWith(".zip")) {
                moduleDownloadFile = file;
                return moduleDownloadFile;
            }
        }
        throw new FileNotFoundException("Cannot find agent module download in: " + configDir);
    }

    private File getAgentInstallerDownloadFile() throws Exception {
        if (installerDownloadFile != null) {
            if (installerDownloadFile.exists()) {
                return installerDownloadFile;
            } else {
                installerDownloadFile = null; // the file was removed recently - let's look for a new one
            }
        }

        File configDir = new File(System.getProperty("jboss.server.config.dir"));
        for (File file : configDir.listFiles()) {
            if (file.getName().startsWith("agent-installer") && file.getName().endsWith(".jar")) {
                installerDownloadFile = file;
                return installerDownloadFile;
            }
        }
        throw new FileNotFoundException("Cannot find agent installer download in: " + configDir);
    }

}
