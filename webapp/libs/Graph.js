sap.ui.define([], function () {
    "use strict";

    class Graph {
        constructor(edges) {
            // Array met objecten? Dit zijn edges in Cytoscape formaat
            if (!Array.isArray(edges[0])) {
                this.edges = [...edges];
                return;
            }

            // Array met alleen edge endpoints
            this.edges = edges.map(([source, target]) => {
                let sourceRoot = nodeComponents(source)[0].toString();
                let targetRoot = nodeComponents(target)[0].toString();
                return {
                    data: {
                        id: `${source} -> ${target}`,
                        source: source,
                        target: target,
                        scope: sourceRoot === targetRoot ? 'internal' : 'external',
                    }
                };
            });
        }

        get nodes() {
            let nodes = new Set();
            this.edges.forEach(({ data: { source, target } }) => nodes.add(source).add(target));
            nodes = Array.from(nodes).sort();

            return nodes.map(node => {
                return {
                    data: {
                        id: node,
                        name: node.replaceAll(componentSeparator, ' | '),
                        image: nodeImage(node),
                        width: 1,
                        height: 1,
                        sap: !nodeComponents(node)[0][1].startsWith('z'),
                    }
                };
            });
        }

        get elements() {
            return {
                nodes: this.nodes,
                edges: this.edges,
            };
        }

    }

    return Graph;
});