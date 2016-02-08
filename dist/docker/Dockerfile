#
# Copyright 2015-2016 Red Hat, Inc. and/or its affiliates
# and other contributors as indicated by the @author tags.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

# Dockerfile for hawkular-kettle

FROM jboss/base-jdk:8

MAINTAINER Viet Nguyen <vnguyen@redhat.com>

ADD hawkular-*.zip /opt/hawkular.zip

USER root

RUN unzip -qq -d /opt /opt/hawkular.zip;\
    rm /opt/hawkular.zip;\
    mkdir /opt/data;
#    /opt/hawkular-1.0.0.Alpha7-SNAPSHOT/bin/add-user.sh hawkularadmin hawkularadmin --silent

# env variable controlling which Cassandra to use. Choose 'embeded_cassandra' or 'cassandra'
env HAWKULAR_BACKEND=embedded_cassandra

# host name(s) of the cassandra nodes. When linking containers, use the C* container name
env CASSANDRA_NODES=cassandra

# We put the WildFly data dir into this mount
VOLUME /opt/data

# Internal ports visible to the outside
EXPOSE 8080 8443

CMD ["/opt/hawkular-1.0.0.Alpha8-SNAPSHOT/bin/standalone.sh","-b","0.0.0.0","-bmanagement","0.0.0.0","-Djboss.server.data.dir=/opt/data"]
