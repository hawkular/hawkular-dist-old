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
package org.hawkular.inventory.rest;

import static javax.ws.rs.core.Response.Status.CREATED;

import java.io.IOException;
import java.io.InputStream;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Spliterator;
import java.util.stream.StreamSupport;

import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.UriBuilder;
import javax.ws.rs.core.UriInfo;

import org.hawkular.inventory.api.paging.Page;
import org.hawkular.inventory.api.paging.PageContext;
import org.hawkular.inventory.bus.Log;
import org.hawkular.inventory.rest.json.Link;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SequenceWriter;

/**
 * @author Lukas Krejci
 * @author Heiko W. Rupp
 * @since 0.0.1
 */
final class ResponseUtil {

    /**
     * This method exists solely to concentrate usage of {@link javax.ws.rs.core.Response#created(java.net.URI)} into
     * one place until <a href="https://issues.jboss.org/browse/RESTEASY-1162">this JIRA</a> is resolved somehow.
     *
     * @param info the UriInfo instance of the current request
     * @param id   the ID of a newly created entity under the base
     * @return the response builder with status 201 and location set to the entity with the provided id.
     */
    public static Response.ResponseBuilder created(UriInfo info, String id) {
        return Response.status(CREATED).location(info.getRequestUriBuilder().segment(id).build());
    }

    /**
     * Similar to {@link #created(UriInfo, String)} but used when more than 1 entity is created during the request.
     * <p>
     * The provided list of ids is converted to URIs (by merely appending the ids using the
     * {@link UriBuilder#segment(String...)} method) and put in the response as its entity.
     *
     * @param info uri info to help with converting ids to URIs
     * @param ids  the list of ids of the entities
     * @return the response builder with status 201 and entity set
     */
    public static Response.ResponseBuilder created(UriInfo info, Spliterator<String> ids) {
        return Response.status(CREATED)
                .entity(StreamSupport.stream(ids, false).map(
                        (id) -> info.getRequestUriBuilder().segment(id).build()));
    }

    public static <T> Response.ResponseBuilder pagedResponse(Response.ResponseBuilder response, UriInfo uriInfo,
                                                             ObjectMapper mapper, Page<T> page) {
        InputStream data = null;
        try {
            //extract the data out of the page
            data = pageToStream(page, mapper, () -> {
                // the page iterator should be depleted by this time so the total size should be correctly set
                response.type(MediaType.APPLICATION_OCTET_STREAM_TYPE);
                createPagingHeader(response, uriInfo, page);
            });
        } catch (IOException e) {
            Log.LOG.error(e);
        }
        response.entity(data);
        return response;
    }

    public static <T> Response.ResponseBuilder pagedResponse(Response.ResponseBuilder response, UriInfo uriInfo,
                                                             Page<T> page, Object data) {
        response.entity(data);
        createPagingHeader(response, uriInfo, page);
        return response;
    }

    private static <T> InputStream pageToStream(Page<T> page, ObjectMapper mapper, Runnable callback) throws
            IOException {
        final PipedOutputStream outs = new PipedOutputStream();
        final PipedInputStream ins = new PipedInputStream() {
            @Override public void close() throws IOException {
                outs.close();
                super.close();
            }
        };
        outs.connect(ins);
        mapper.disable(JsonGenerator.Feature.AUTO_CLOSE_TARGET);

        PageToStreamThreadPool.getInstance().submit(() -> {
            try (Page<T> closeablePage = page;
                 PipedOutputStream out = outs;
                 SequenceWriter sequenceWriter = mapper.writer().writeValuesAsArray(out)) {
                for (T element : closeablePage) {
                    sequenceWriter.write(element);
                    sequenceWriter.flush();
                }
            } catch (IOException e) {
                throw new IllegalStateException("Unable to convert page to input stream.", e);
            } finally {
                callback.run();
            }
        });
        return ins;
    }

    /**
     * Create the paging headers for collections and attach them to the passed builder. Those are represented as
     * <i>Link:</i> http headers that carry the URL for the pages and the respective relation.
     * <br/>In addition a <i>X-Total-Count</i> header is created that contains the whole collection size.
     *
     * @param builder    The ResponseBuilder that receives the headers
     * @param uriInfo    The uriInfo of the incoming request to build the urls
     * @param resultList The collection with its paging information
     */
    public static void createPagingHeader(final Response.ResponseBuilder builder, final UriInfo uriInfo,
                                          final Page<?> resultList) {

        UriBuilder uriBuilder;

        PageContext pc = resultList.getPageContext();
        int page = pc.getPageNumber();

        List<Link> links = new ArrayList<>();

        if (pc.isLimited() && resultList.getTotalSize() > (pc.getPageNumber() + 1) * pc.getPageSize()) {
            int nextPage = page + 1;
            uriBuilder = uriInfo.getRequestUriBuilder(); // adds ?q, ?per_page, ?page, etc. if needed
            uriBuilder.replaceQueryParam("page", nextPage);

            links.add(new Link("next", uriBuilder.build().toString()));
        }

        if (page > 0) {
            int prevPage = page - 1;
            uriBuilder = uriInfo.getRequestUriBuilder(); // adds ?q, ?per_page, ?page, etc. if needed
            uriBuilder.replaceQueryParam("page", prevPage);
            links.add(new Link("prev", uriBuilder.build().toString()));
        }

        // A link to the last page
        if (pc.isLimited()) {
            long lastPage = resultList.getTotalSize() / pc.getPageSize();
            if (resultList.getTotalSize() % pc.getPageSize() == 0) {
                lastPage -= 1;
            }

            uriBuilder = uriInfo.getRequestUriBuilder(); // adds ?q, ?per_page, ?page, etc. if needed
            uriBuilder.replaceQueryParam("page", lastPage);
            links.add(new Link("last", uriBuilder.build().toString()));
        }

        // A link to the current page
        uriBuilder = uriInfo.getRequestUriBuilder(); // adds ?q, ?per_page, ?page, etc. if needed

        StringBuilder linkHeader = new StringBuilder(new Link("current", uriBuilder.build().toString())
                .rfc5988String());

        //followed by the rest of the link defined above
        links.forEach((l) -> linkHeader.append(", ").append(l.rfc5988String()));

        //add that all as a single Link header to the response
        builder.header("Link", linkHeader.toString());

        // Create a total size header
        builder.header("X-Total-Count", resultList.getTotalSize());
    }
}
