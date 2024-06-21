/**
 * Dit graph model converteert het Xref-formaat (met units en calls) naar het Cytoscape graph-formaat (nodes en edges)
 */
sap.ui.define([
    "sap/ui/base/Object"
], function (BaseObject) {

    return BaseObject.extend("xref.model.Graph", {
        COMPONENT_SEPARATOR: " | ",

        nodeDepth: 0,
        elements: {},

        constructor: function (xref) {
            this.nodeDepth = xref.units.reduce((max, { id }) => {
                let depth = this.nodeComponents(id).length - 1;
                return Math.max(max, depth);
            }, 0);

            let nodes = xref.units.map(({ id, sap, package }) => {
                return {
                    data: {
                        id,
                        name: this.nodeName(id),
                        image: this.nodeImage(id),
                        sap,
                        package
                    }
                };
            });

            let edges = xref.calls.map(({ source, target }) => {
                let sourceRoot = this.nodeComponents(source)[0].toString();
                let targetRoot = this.nodeComponents(target)[0].toString();
                return {
                    data: {
                        id: `${source} -> ${target}`,
                        source,
                        target,
                        scope: sourceRoot === targetRoot ? "internal" : "external",
                    }
                };
            });

            this.elements = {
                nodes,
                edges
            };
        },

        nodeComponents: function (id) {
            // "\FG:SBAL\FU:BAL_LOG_CREATE" » [ ["fg", "sbal"], ["fu", "bal_log_create"] ]
            return this.nodeName(id)
                .split(this.COMPONENT_SEPARATOR)
                .map(component => component.split(":"));
        },

        nodeImage: function (id) {
            let svgTemplate = document.getElementById("svg-template");
            let svgFragment = svgTemplate.content.cloneNode(true);

            document.body.append(svgFragment);
            let svg = document.body.querySelector("svg");

            let table = svg.querySelector("table");
            for (let component of this.nodeComponents(id)) {
                let row = table.insertRow();
                for (let segment of component) {
                    let cell = row.insertCell();
                    cell.innerHTML = segment;
                }
            }

            svg.setAttribute("width", table.offsetWidth);
            svg.setAttribute("height", table.offsetHeight);

            let svgXml = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg>' + new XMLSerializer().serializeToString(svg);
            let image = {
                width: table.offsetWidth,
                height: table.offsetHeight,
                data: "data:image/svg+xml;utf8," + encodeURIComponent(svgXml),
            };

            svg.remove();
            return image;
        },

        nodeName: function (id) {
            // "\FG:SBAL\FU:BAL_LOG_CREATE" => "fg:sbal | fu:bal_log_create" 
            const newId = id
                .slice(1)
                .replaceAll("\\", this.COMPONENT_SEPARATOR);
            return (newId.startsWith('cds:')) ? newId : newId.toLowerCase()
        }
    });
});