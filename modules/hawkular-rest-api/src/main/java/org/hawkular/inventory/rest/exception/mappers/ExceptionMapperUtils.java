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
package org.hawkular.inventory.rest.exception.mappers;

import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.hawkular.inventory.api.EntityAlreadyExistsException;
import org.hawkular.inventory.api.EntityNotFoundException;
import org.hawkular.inventory.api.RelationAlreadyExistsException;
import org.hawkular.inventory.api.RelationNotFoundException;
import org.hawkular.inventory.api.filters.Filter;
import org.hawkular.inventory.rest.RestApiLogger;
import org.hawkular.inventory.rest.json.ApiError;
import org.jboss.logging.Logger;

import com.google.common.base.Throwables;

/**
 *
 * @author Lukas Krejci
 * @author Jeeva Kandasamy
 * @since 0.1.0
 */
public class ExceptionMapperUtils {
    private ExceptionMapperUtils(){

    }

    public static Response buildResponse(Throwable exception, Response.Status status){
        return buildResponse(new ApiError(Throwables.getRootCause(exception).getMessage()), exception, status);
    }

    public static Response buildResponse(ApiError error, Throwable exception, Response.Status status){
        return buildResponse(Logger.Level.WARN, error, exception, status);
    }

    public static Response buildResponse(Logger.Level lvl, ApiError error, Throwable exception, Response.Status status){
        RestApiLogger.LOGGER.log(lvl, "RestEasy exception, ", exception);
        return Response.status(status)
            .entity(error)
            .type(MediaType.APPLICATION_JSON_TYPE)
            .build();
    }

    public static class EntityTypeAndPath {
        private final String entityType;
        private final Filter[][] paths;

        public static EntityTypeAndPath fromException(EntityNotFoundException e) {
            return new EntityTypeAndPath(e.getEntityType().getSimpleName(), e.getFilters());
        }

        public EntityTypeAndPath(String entityType, Filter[][] paths) {
            this.entityType = entityType;
            this.paths = paths;
        }

        public String getEntityType() {
            return entityType;
        }

        public Filter[][] getPath() {
            return paths;
        }
    }

    public static class EntityIdAndPath {
        private final String entityId;
        private final Filter[][] paths;

        public static EntityIdAndPath fromException(EntityAlreadyExistsException e) {
            return new EntityIdAndPath(e.getEntityId(), e.getPaths());
        }

        public EntityIdAndPath(String entityId, Filter[][] paths) {
            this.entityId = entityId;
            this.paths = paths;
        }

        public String getEntityId() {
            return entityId;
        }

        public Filter[][] getPaths() {
            return paths;
        }
    }

    public static class RelationshipNameAndPath {
        private final String relationshipNameOrId;
        private final Filter[][] paths;

        public static RelationshipNameAndPath fromException(RelationNotFoundException e) {
            return new RelationshipNameAndPath(e.getNameOrId(), e.getFilters());
        }

        public static RelationshipNameAndPath fromException(RelationAlreadyExistsException e) {
            return new RelationshipNameAndPath(e.getRelationName(), e.getPath());
        }

        public RelationshipNameAndPath(String relationshipNameOrId, Filter[][] paths) {
            this.relationshipNameOrId = relationshipNameOrId;
            this.paths = paths;
        }

        public String getRelationshipNameOrId() {
            return relationshipNameOrId;
        }

        public Filter[][] getPaths() {
            return paths;
        }
    }
}
