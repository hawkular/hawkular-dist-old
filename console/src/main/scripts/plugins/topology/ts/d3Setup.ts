///
/// Copyright 2015-2016 Red Hat, Inc. and/or its affiliates
/// and other contributors as indicated by the @author tags.
///
/// Licensed under the Apache License, Version 2.0 (the "License");
/// you may not use this file except in compliance with the License.
/// You may obtain a copy of the License at
///
///    http://www.apache.org/licenses/LICENSE-2.0
///
/// Unless required by applicable law or agreed to in writing, software
/// distributed under the License is distributed on an "AS IS" BASIS,
/// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
/// See the License for the specific language governing permissions and
/// limitations under the License.
///

/// <reference path='topologyGlobals.ts'/>


module HawkularTopology {

    _module.run(($rootScope, $location) => {

        /* A cache to prevent jumping when rapidly toggling views */
        var cache = {};

        var initGraph = (selector, force, notify) => {
            var outer = d3.select(selector);

            /* Kinds of objects to show */
            var kinds = null;

            /* Data we've been fed */
            var items = {};
            var relations = [];

            /* Graph information */
            var width;
            var height;
            var radius = 20;
            var timeout;
            var nodes = [];
            var links = [];
            var lookup = {};
            var selection = null;
            var isDragging = false;

            /* Allow the force to be passed in, default if not */
            if (!force) {
                force = d3.layout.force()
                    .charge(-800)
                    .gravity(0.2)
                    .linkStrength(2)
                    .linkDistance(80);
            }

            const drag = force.drag();

            const svg = outer.selectAll('svg')
                .attr('viewBox', '0 0 1600 1200')
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .attr('class', 'hawkular-topology');

            let vertices = d3.select();
            let edges = d3.select();

            force.on('tick', () => {
                edges.attr('x1', (d) => d.source.x)
                    .attr('y1', (d) => d.source.y)
                    .attr('x2', (d) => d.target.x)
                    .attr('y2', (d) => d.target.y);

              vertices.attr('cx', (d) => d.x = d.fixed ? d.x : Math.max(radius, Math.min(width - radius, d.x)))
                .attr('cy', (d) => d.y = d.fixed ? d.y : Math.max(radius, Math.min(height - radius, d.y)))
                .attr('transform', (d) => 'translate(' + d.x + ',' + d.y + ')');
            });

            const tip = d3.tip()
                .attr('class', 'd3-tip')
                .offset([-10, 0])
                .html((d) => {
                    return '<table><tr><td><span class="chartHoverLabel">' + d.item.kind +
                        ':</span></td><td><span class="topologyHoverValue">' + d.item.metadata.name +
                         '</span></td></tr>' + (d.item.kind === 'Server' ?
                        '<tr><td><span class="chartHoverLabel">IP:</span></td><td><span class="topologyHoverValue">' +
                        d.item.metadata.ip +
                        '</span></td></tr><tr><td><span class="chartHoverLabel">Hostname:</span></td><td>' +
                        '<span class="topologyHoverValue">' +
                        d.item.metadata.hostname + '</span></td></tr></table>' : '');

                });

            drag
                .on('dragstart', (d) => {
                    tip.hide();
                    isDragging = true;
                    notify(d.item);

                    if (d.fixed !== true) {
                        d.floatpoint = [d.x, d.y];
                    }
                    d.fixed = true;
                    // d3.selectAll('g').classed('fixed', true);
                })
                .on('dragend', (d) => {
                    var moved = true;
                    isDragging = false;
                    if (d.floatpoint) {
                        moved = (d.x < d.floatpoint[0] - 5 || d.x > d.floatpoint[0] + 5) ||
                        (d.y < d.floatpoint[1] - 5 || d.y > d.floatpoint[1] + 5);
                        delete d.floatpoint;
                    }
                    d.fixed = moved && d.x > 3 && d.x < (width - 3) && d.y >= 3 && d.y < (height - 3);
                    // d3.selectAll('g').classed('fixed', d.fixed);
                });

            svg
                .on('dblclick', () => {
                    if (!d3.select(d3.event.target).datum()) {
                        svg.selectAll('g')
                            .classed('fixed', false)
                            .each((d) => d.fixed = false);
                        force.start();
                    }
                })
                .on('click', (ev) => {
                    if (!d3.select(d3.event.target).datum()) {
                        notify(null);
                    }
                });
            svg.call(tip);

            function select(item) {
                selection = item;
                svg.selectAll('g')
                    .classed('selected', (d) => d.item === item);
            }

            function adjust() {
                timeout = null;
                width = outer.node().clientWidth;
                height = outer.node().clientHeight;

                force.size([width, height]);
                svg.attr('viewBox', '0 0 ' + width + ' ' + height);
                update();
            }

            function update() {
                edges = svg.selectAll('line')
                    .data(links);

                edges.exit().remove();
                edges.enter().insert('line', ':first-child');

                edges.attr('class', (d) => d.type);

                vertices = svg.selectAll('g')
                    .data(nodes, (d) => d.id);

                vertices.exit().remove();

                const extractServerId = (id: string): string => id.substring(0, id.indexOf('/') - 1);
                const added = vertices.enter().append('g')
                    .on('mouseover', (d, i) => !isDragging && tip.show(d, i))
                    .on('mouseout', tip.hide)
                    .on('dblclick', (n) => {
                        var path;
                        switch (n.item.kind) {
                            case 'Server':
                                path = '/hawkular-ui/app/app-details/' + n.item.metadata.feedId
                                    + '/' + n.item.id.substring(0, n.item.id.length - 2) + '/overview';
                                break;
                            case 'App':
                                path = '/hawkular-ui/app/app-details/' + n.item.metadata.feedId
                                  + '/' + extractServerId(n.item.id) + '/deployments';
                                break;
                            case 'DataSource':
                                path = '/hawkular-ui/app/app-details/' + n.item.metadata.feedId
                                  + '/' + extractServerId(n.item.id) + '/datasources';
                                break;
                            case 'Platform':
                                // todo: server id is hard-coded now
                                path = '/hawkular-ui/app/app-details/' + n.item.metadata.feedId + '/Local/platform';
                                break;
                            default:
                                return;
                        }
                        $location.path(path);
                        $rootScope.$digest();
                    })
                    .call(drag);

                select(selection);

                force
                    .nodes(nodes)
                    .links(links)
                    .start();

                return added;
            }

            function digest() {
                var pnodes = nodes;
                var plookup = lookup;

                /* The actual data for the graph */
                nodes = [];
                links = [];
                lookup = {};

                var item, id, kind, node;
                angular.forEach(items, (item, id) => {
                    kind = item.kind;

                    if (kinds && !kinds[kind]) {
                        return;
                    }

                    /* Prevents flicker */
                    node = pnodes[plookup[id]];
                    if (!node) {
                        node = cache[id];
                        delete cache[id];
                        if (!node) {
                            node = {};
                        }
                    }

                    node.id = id;
                    node.item = item;

                    lookup[id] = nodes.length;
                    nodes.push(node);
                });

                var i, len, relation, s, t;
                for (i = 0, len = relations.length; i < len; i++) {
                    relation = relations[i];

                    s = lookup[relation.source];
                    t = lookup[relation.target];
                    const edgeType = lookup[relation.type];
                    if (s === undefined || t === undefined) {
                        continue;
                    }

                    links.push({ source: s, target: t, type: edgeType || nodes[s].item.kind + nodes[t].item.kind });
                }

                if (width && height) {
                    return update();
                } else {
                    return d3.select();
                }
            }

            function resized() {
                window.clearTimeout(timeout);
                timeout = window.setTimeout(adjust, 150);
            }

            window.addEventListener('resize', resized);

            adjust();
            resized();

            return {
                select: select,
                kinds: (value) => {
                    kinds = value;
                    var added = digest();
                    return [vertices, added];
                },
                data: (new_items, new_relations) => {
                    items = new_items || {};
                    relations = new_relations || [];
                    var added = digest();
                    return [vertices, added];
                },
                close: () => {
                    window.removeEventListener('resize', resized);
                    window.clearTimeout(timeout);

                    /*
                     * Keep the positions of these items cached,
                     * in case we are asked to make the same graph again.
                     */
                    var id, node;
                    cache = {};
                    angular.forEach(lookup, (value, id) => {
                        node = nodes[lookup[id]];
                        delete node.item;
                        cache[id] = node;
                    });

                    nodes = [];
                    lookup = {};
                }
            };
        };
        HawkularTopology.initGraph = initGraph;
    });
}
