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

import java.util.ArrayList;
import java.util.List;

import javax.ws.rs.core.MultivaluedMap;
import javax.ws.rs.core.UriInfo;

import org.hawkular.inventory.api.paging.Order;
import org.hawkular.inventory.api.paging.PageContext;
import org.hawkular.inventory.api.paging.Pager;

/**
 * @author Lukas Krejci
 * @since 0.0.1
 */
public class RequestUtil {

    private RequestUtil() {
    }

    public static Pager extractPaging(UriInfo uri) {
        MultivaluedMap<String, String> params = uri.getQueryParameters();

        String pageS = params.getFirst("page");
        String perPageS = params.getFirst("per_page");
        List<String> sort = params.get("sort");
        List<String> order = params.get("order");

        int page = pageS == null ? 0 : Integer.parseInt(pageS);
        int perPage = perPageS == null ? PageContext.UNLIMITED_PAGE_SIZE : Integer.parseInt(perPageS);

        List<Order> ordering = new ArrayList<>();

        if (sort == null || sort.isEmpty()) {
            ordering.add(Order.unspecified());
        } else {
            for (int i = 0; i < sort.size(); ++i) {
                String field = sort.get(i);
                Order.Direction dir = Order.Direction.ASCENDING;
                if (order != null && i < order.size()) {
                    dir = Order.Direction.fromShortString(order.get(i));
                }

                ordering.add(Order.by(field, dir));
            }
        }

        return new Pager(page, perPage, ordering);
    }
}
