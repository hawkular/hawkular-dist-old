<?xml version="1.0" encoding="UTF-8"?>
<!--

    Copyright 2015 Red Hat, Inc. and/or its affiliates
    and other contributors as indicated by the @author tags.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

-->

<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xalan="http://xml.apache.org/xalan"
                xmlns:ds="urn:jboss:domain:datasources:4.0"
                xmlns:ra="urn:jboss:domain:resource-adapters:3.0"
                xmlns:ejb3="urn:jboss:domain:ejb3:4.0"
                xmlns:logging="urn:jboss:domain:logging:3.0"
                xmlns:undertow="urn:jboss:domain:undertow:2.0"
                xmlns:tx="urn:jboss:domain:transactions:3.0"
                version="2.0"
                exclude-result-prefixes="xalan ds ra ejb3 logging undertow tx">

  <!-- will indicate if this is a "dev" build or "production" build -->
  <xsl:param name="kettle.build.type"/>
  <xsl:param name="uuid.hawkular.accounts.backend"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes" xalan:indent-amount="4" standalone="no"/>
  <xsl:strip-space elements="*"/>

  <!-- enable/disable deployment scanner -->
  <xsl:template name="deployment-scanner">
    <xsl:attribute name="scan-enabled">
      <xsl:choose>
        <xsl:when test="$kettle.build.type='dev'">true</xsl:when>
        <xsl:otherwise>false</xsl:otherwise>
      </xsl:choose>
    </xsl:attribute>
  </xsl:template>

  <xsl:template match="node()[name(.)='deployment-scanner']">
    <xsl:copy>
      <xsl:call-template name="deployment-scanner"/>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

  <!-- add some logger categories -->
  <xsl:template name="loggers">
    <logger category="org.hawkular">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log:INFO}</xsl:text></xsl:attribute>
      </level>
    </logger>
    <logger category="org.hawkular.accounts">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.accounts:INFO}</xsl:text></xsl:attribute>
      </level>
    </logger>
    <logger category="org.hawkular.agent">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.agent:INFO}</xsl:text></xsl:attribute>
      </level>
    </logger>
    <logger category="org.hawkular.alerts">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.alerts:INFO}</xsl:text></xsl:attribute>
      </level>
    </logger>
    <logger category="org.hawkular.cmdgw">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.cmdgw:INFO}</xsl:text></xsl:attribute>
      </level>
    </logger>
    <logger category="org.hawkular.component.availcreator">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.availcreator:INFO}</xsl:text></xsl:attribute>
      </level>
    </logger>
    <logger category="org.hawkular.component.pinger">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.pinger:INFO}</xsl:text></xsl:attribute>
      </level>
    </logger>
    <logger category="org.hawkular.inventory">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.inventory:INFO}</xsl:text></xsl:attribute>
      </level>
    </logger>
    <logger category="org.hawkular.inventory.rest.requests">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.inventory.rest.requests:INFO}</xsl:text></xsl:attribute>
      </level>
    </logger>
    <logger category="org.hawkular.metrics">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.metrics:INFO}</xsl:text></xsl:attribute>
      </level>
    </logger>

    <logger category="com.datastax.driver">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.datastax.driver:INFO}</xsl:text></xsl:attribute>
      </level>
    </logger>
    <logger category="liquibase">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.liquibase:WARN}</xsl:text></xsl:attribute>
      </level>
    </logger>
    <logger category="org.jboss.as.ejb3">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.ejb3:WARN}</xsl:text></xsl:attribute>
      </level>
    </logger>
    <logger category="org.ocpsoft.rewrite">
      <level>
        <xsl:attribute name="name"><xsl:text disable-output-escaping="yes">${hawkular.log.rewrite:WARN}</xsl:text></xsl:attribute>
      </level>
    </logger>
  </xsl:template>

  <xsl:template match="node()[name(.)='periodic-rotating-file-handler']">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
    <xsl:call-template name="loggers"/>
  </xsl:template>

  <!-- set the console log level -->
  <xsl:template match="logging:console-handler[@name='CONSOLE']/logging:level">
    <xsl:if test="$kettle.build.type='production'"><level name="INFO"/></xsl:if>
  </xsl:template>

  <xsl:template match="undertow:subsystem">
    <xsl:copy>
      <xsl:attribute name="statistics-enabled">true</xsl:attribute>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="tx:subsystem">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
      <coordinator-environment statistics-enabled="true"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template name="mdb">
    <mdb>
      <resource-adapter-ref>
        <xsl:attribute name="resource-adapter-name">
          <xsl:text disable-output-escaping="true">${ejb.resource-adapter-name:activemq-ra.rar}</xsl:text>
        </xsl:attribute>
      </resource-adapter-ref>
      <bean-instance-pool-ref pool-name="mdb-strict-max-pool"/>
    </mdb>
  </xsl:template>

  <xsl:template match="ejb3:subsystem">
    <!--<xsl:copy>-->
      <!--<xsl:call-template name="mdb"/>-->
      <!--<statistics enabled="true"/>-->
      <!--<xsl:apply-templates select="node()|@*"/>-->
    <!--</xsl:copy>-->
    <subsystem xmlns="urn:jboss:domain:ejb3:4.0">
      <session-bean>
        <stateful default-access-timeout="5000" cache-ref="simple" passivation-disabled-cache-ref="simple"/>
        <stateless>
          <bean-instance-pool-ref pool-name="slsb-strict-max-pool"/>
        </stateless>
        <singleton default-access-timeout="5000"/>
      </session-bean>
      <mdb>
        <resource-adapter-ref>
          <xsl:attribute name="resource-adapter-name">
            <xsl:text disable-output-escaping="true">${ejb.resource-adapter-name:activemq-ra.rar}</xsl:text>
          </xsl:attribute>
        </resource-adapter-ref>
        <bean-instance-pool-ref pool-name="mdb-strict-max-pool"/>
      </mdb>
      <pools>
        <bean-instance-pools>
          <!-- Automatically configure pools. Alternatively, max-pool-size can be set to a specific value -->
          <strict-max-pool name="slsb-strict-max-pool" derive-size="from-worker-pools" instance-acquisition-timeout="5"
                           instance-acquisition-timeout-unit="MINUTES"/>
          <strict-max-pool name="mdb-strict-max-pool" derive-size="from-cpu-count" instance-acquisition-timeout="5"
                           instance-acquisition-timeout-unit="MINUTES"/>
        </bean-instance-pools>
      </pools>
      <caches>
        <cache name="simple"/>
        <cache name="distributable" aliases="passivating clustered" passivation-store-ref="infinispan"/>
      </caches>
      <passivation-stores>
        <passivation-store name="infinispan" cache-container="ejb" max-size="10000"/>
      </passivation-stores>
      <async thread-pool-name="default"/>
      <timer-service thread-pool-name="default" default-data-store="default-file-store">
        <data-stores>
          <file-data-store name="default-file-store" path="timer-service-data" relative-to="jboss.server.data.dir"/>
        </data-stores>
      </timer-service>
      <remote connector-ref="http-remoting-connector" thread-pool-name="default"/>
      <thread-pools>
        <thread-pool name="default">
          <max-threads count="10"/>
          <keepalive-time time="100" unit="milliseconds"/>
        </thread-pool>
      </thread-pools>
      <iiop enable-by-default="false" use-qualified-name="false"/>
      <default-security-domain value="other"/>
      <default-missing-method-permissions-deny-access value="true"/>
      <log-system-exceptions value="true"/>
    </subsystem>
  </xsl:template>

  <!-- Remove the out-of-box datasource example and add our own datasource -->
  <xsl:template name="datasources:subsystem">
    <datasources>
      <datasource jta="true" jndi-name="java:jboss/datasources/HawkularDS" pool-name="HawkularDS" enabled="true" use-ccm="true" statistics-enabled="true">
        <connection-url>jdbc:h2:${jboss.server.data.dir}/hawkular_db;MVCC=TRUE</connection-url>
        <driver-class>org.h2.Driver</driver-class>
        <driver>h2</driver>
        <security>
          <user-name>sa</user-name>
          <password>sa</password>
        </security>
        <validation>
          <validate-on-match>false</validate-on-match>
          <background-validation>false</background-validation>
        </validation>
        <timeout>
          <set-tx-query-timeout>false</set-tx-query-timeout>
          <blocking-timeout-millis>0</blocking-timeout-millis>
          <idle-timeout-minutes>0</idle-timeout-minutes>
          <query-timeout>0</query-timeout>
          <use-try-lock>0</use-try-lock>
          <allocation-retry>0</allocation-retry>
          <allocation-retry-wait-millis>0</allocation-retry-wait-millis>
        </timeout>
        <statement>
          <share-prepared-statements>false</share-prepared-statements>
        </statement>
      </datasource>
      <datasource jndi-name="java:jboss/datasources/KeycloakDS" pool-name="KeycloakDS" enabled="true" use-java-context="true" statistics-enabled="true">
        <connection-url>jdbc:h2:${jboss.server.data.dir}${/}h2${/}keycloak;AUTO_SERVER=TRUE</connection-url>
        <driver>h2</driver>
        <security>
          <user-name>sa</user-name>
          <password>sa</password>
        </security>
      </datasource>
      <drivers>
        <driver name="h2" module="com.h2database.h2">
          <xa-datasource-class>org.h2.jdbcx.JdbcDataSource</xa-datasource-class>
        </driver>
      </drivers>
    </datasources>
  </xsl:template>

  <xsl:template match="ds:datasources">
    <xsl:call-template name="datasources" />
  </xsl:template>

  <xsl:template match="@datasource[.='java:jboss/datasources/ExampleDS']">
    <xsl:attribute name="datasource">java:jboss/datasources/HawkularDS</xsl:attribute>
  </xsl:template>

  <!-- add system properties -->
  <xsl:template name="system-properties">
    <system-properties>
      <property>
        <xsl:attribute name="name">hawkular.backend</xsl:attribute>
        <xsl:attribute name="value">&#36;{hawkular.backend:embedded_cassandra}</xsl:attribute>
      </property>
      <!-- regardless of the backend, we want the metrics service to start synchronously so that
           any dependent deployments don't deploy before startup is actually complete. -->
      <property>
        <xsl:attribute name="name">hawkular.metrics.waitForService</xsl:attribute>
        <xsl:attribute name="value">&#36;{hawkular.metrics.waitForService:True}</xsl:attribute>
      </property>
      <property>
        <xsl:attribute name="name">hawkular.events.listener.rest.endpoint</xsl:attribute>
        <xsl:attribute name="value">http://&#36;{jboss.bind.address:127.0.0.1}:&#36;{jboss.http.port:8080}/hawkular-accounts-events-backend/events</xsl:attribute>
      </property>
      <xsl:choose>
        <xsl:when test="$kettle.build.type='dev'">
        <property>
          <xsl:attribute name="name">keycloak.import</xsl:attribute>
          <xsl:attribute name="value">&#36;{jboss.home.dir}/standalone/configuration/hawkular-realm-for-dev.json</xsl:attribute>
        </property>
        </xsl:when>
        <xsl:when test="$kettle.build.type='production'">
        <property>
          <xsl:attribute name="name">keycloak.import</xsl:attribute>
          <xsl:attribute name="value">&#36;{jboss.home.dir}/standalone/configuration/hawkular-realm.json</xsl:attribute>
        </property>
        </xsl:when>
        <xsl:otherwise>
          <xsl:message terminate="yes">
            Unexpected value of &#36;kettle.build.type: '$kettle.build.type'. Expected 'dev' or 'production'
          </xsl:message>
        </xsl:otherwise>
      </xsl:choose>
    </system-properties>
  </xsl:template>

  <!-- add additional subsystem extensions -->
  <xsl:template match="node()[name(.)='extensions']">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
      <extension module="org.keycloak.keycloak-adapter-subsystem"/>
      <extension module="org.keycloak.keycloak-server-subsystem"/>
      <extension module="org.wildfly.extension.messaging-activemq"/>
    </xsl:copy>
    <xsl:call-template name="system-properties"/>
  </xsl:template>

  <!-- add extension subsystem configurations -->
  <xsl:template match="node()[name(.)='profile']">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>

      <subsystem xmlns="urn:jboss:domain:messaging-activemq:1.0">
        <server name="default">
          <security-setting name="#">
            <role name="guest" send="true" consume="true" create-non-durable-queue="true" delete-non-durable-queue="true"/>
          </security-setting>
          <address-setting name="#" dead-letter-address="jms.queue.DLQ" expiry-address="jms.queue.ExpiryQueue" max-size-bytes="10485760" page-size-bytes="2097152" message-counter-history-day-limit="10"/>
          <http-connector name="http-connector" socket-binding="http" endpoint="http-acceptor"/>
          <http-connector name="http-connector-throughput" socket-binding="http" endpoint="http-acceptor-throughput">
            <param name="batch-delay" value="50"/>
          </http-connector>
          <in-vm-connector name="in-vm" server-id="0"/>
          <http-acceptor name="http-acceptor" http-listener="default"/>
          <http-acceptor name="http-acceptor-throughput" http-listener="default">
            <param name="batch-delay" value="50"/>
            <param name="direct-deliver" value="false"/>
          </http-acceptor>
          <in-vm-acceptor name="in-vm" server-id="0"/>
          <jms-queue name="ExpiryQueue" entries="java:/jms/queue/ExpiryQueue"/>
          <jms-queue name="DLQ" entries="java:/jms/queue/DLQ"/>

          <jms-queue name="UiCommandQueue" entries="java:/jms/queue/UiCommandQueue"/>
          <jms-queue name="FeedCommandQueue" entries="java:/jms/queue/FeedCommandQueue"/>
          <jms-queue name="HawkularAlertsActionsResponseQueue" entries="java:/jms/queue/HawkularAlertsActionsResponseQueue"/>
          <jms-queue name="HawkularAlertsPluginsQueue" entries="java:/jms/queue/HawkularAlertsPluginsQueue"/>

          <jms-topic name="HawkularMetricData" entries="java:/jms/topic/HawkularMetricData"/>
          <jms-topic name="HawkularAvailData" entries="java:/jms/topic/HawkularAvailData"/>
          <jms-topic name="HawkularInventoryChanges" entries="java:/jms/topic/HawkularInventoryChanges"/>
          <jms-topic name="HawkularAlertsActionsTopic" entries="java:/jms/topic/HawkularAlertsActionsTopic"/>

          <connection-factory name="InVmConnectionFactory" connectors="in-vm" entries="java:/ConnectionFactory java:/HawkularBusConnectionFactory"/>
          <connection-factory name="RemoteConnectionFactory" connectors="http-connector" entries="java:jboss/exported/jms/RemoteConnectionFactory"/>
          <pooled-connection-factory name="activemq-ra" transaction="xa" connectors="in-vm" entries="java:/JmsXA java:jboss/DefaultJMSConnectionFactory"/>
        </server>
      </subsystem>

       <!--Keycloak-related - our secured deployments (important)-->
      <subsystem xmlns="urn:jboss:domain:keycloak-server:1.1">
        <web-context>auth</web-context>
      </subsystem>
      <subsystem xmlns="urn:jboss:domain:keycloak:1.1">
        <realm name="hawkular">
          <auth-server-url>http://localhost:8080/auth</auth-server-url>
          <ssl-required>none</ssl-required>
        </realm>
        <secure-deployment name="hawkular-accounts.war">
          <realm>hawkular</realm>
          <resource>hawkular-accounts-backend</resource>
          <use-resource-role-mappings>true</use-resource-role-mappings>
          <enable-cors>true</enable-cors>
          <enable-basic-auth>true</enable-basic-auth>
          <credential name="secret"><xsl:value-of select="$uuid.hawkular.accounts.backend" /></credential>
        </secure-deployment>
        <secure-deployment name="hawkular-inventory-dist.war">
          <realm>hawkular</realm>
          <resource>hawkular-accounts-backend</resource>
          <use-resource-role-mappings>true</use-resource-role-mappings>
          <enable-cors>true</enable-cors>
          <enable-basic-auth>true</enable-basic-auth>
          <credential name="secret">
            <xsl:value-of select="$uuid.hawkular.accounts.backend"/>
          </credential>
        </secure-deployment>
        <secure-deployment name="hawkular-alerts-rest.war">
          <realm>hawkular</realm>
          <resource>hawkular-accounts-backend</resource>
          <use-resource-role-mappings>true</use-resource-role-mappings>
          <enable-cors>true</enable-cors>
          <enable-basic-auth>true</enable-basic-auth>
          <credential name="secret">
            <xsl:value-of select="$uuid.hawkular.accounts.backend"/>
          </credential>
        </secure-deployment>
        <secure-deployment name="hawkular-redhat-access-integration-backend.war">
          <realm>hawkular</realm>
          <resource>hawkular-accounts-backend</resource>
          <use-resource-role-mappings>true</use-resource-role-mappings>
          <enable-cors>true</enable-cors>
          <enable-basic-auth>true</enable-basic-auth>
          <credential name="secret">
            <xsl:value-of select="$uuid.hawkular.accounts.backend"/>
          </credential>
        </secure-deployment>
        <secure-deployment name="hawkular-command-gateway-war.war">
          <realm>hawkular</realm>
          <resource>hawkular-accounts-backend</resource>
          <use-resource-role-mappings>true</use-resource-role-mappings>
          <enable-cors>true</enable-cors>
          <enable-basic-auth>true</enable-basic-auth>
          <credential name="secret">
            <xsl:value-of select="$uuid.hawkular.accounts.backend"/>
          </credential>
        </secure-deployment>
        <secure-deployment name="hawkular-accounts-secret-store.war">
          <realm>hawkular</realm>
          <resource>hawkular-accounts-backend</resource>
          <use-resource-role-mappings>true</use-resource-role-mappings>
          <enable-cors>true</enable-cors>
          <enable-basic-auth>true</enable-basic-auth>
          <credential name="secret"><xsl:value-of select="$uuid.hawkular.accounts.backend" /></credential>
        </secure-deployment>
      </subsystem>
    </xsl:copy>
  </xsl:template>

  <!-- Keycloak-related - security-domain definitions -->
  <xsl:template match="node()[name(.)='security-domains']">
    <xsl:copy>
      <xsl:apply-templates select="node()[name(.)='security-domain']"/>
      <security-domain name="keycloak">
        <authentication>
          <login-module code="org.keycloak.adapters.jboss.KeycloakLoginModule" flag="required"/>
        </authentication>
      </security-domain>
      <security-domain name="sp" cache-type="default">
        <authentication>
          <login-module code="org.picketlink.identity.federation.bindings.wildfly.SAML2LoginModule" flag="required"/>
        </authentication>
      </security-domain>
    </xsl:copy>
  </xsl:template>

  <!-- Add a cache for Hawkular Accounts and Keycloak -->
  <xsl:template match="node()[name(.)='cache-container'][1]">
    <xsl:copy>
      <xsl:copy-of select="node()|@*"/>
    </xsl:copy>
    <cache-container name="keycloak" jndi-name="infinispan/Keycloak">
      <local-cache name="realms"/>
      <local-cache name="users"/>
      <local-cache name="sessions"/>
      <local-cache name="loginFailures"/>
    </cache-container>
    <cache-container name="hawkular-accounts" default-cache="role-cache" statistics-enabled="true">
      <local-cache name="role-cache"/>
      <local-cache name="operation-cache"/>
    </cache-container>
  </xsl:template>

  <!-- copy everything else as-is -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*" />
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>
