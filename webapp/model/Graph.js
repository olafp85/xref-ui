sap.ui.define([
    "sap/ui/base/Object"
], function (BaseObject) {

    return BaseObject.extend("xref.model.Graph", {
        COMPONENT_SEPARATOR: " | ",

        constructor: function (xref) {
            let nodesMap = new Map();
            const nodes = xref.units.map(({ id, sap }) => {
                let data = {
                    id,
                    name: this.nodeName(id),
                    image: this.nodeImage(id),
                    width: 1,  // TODO NODIG?
                    height: 1,
                    sap,
                    degreeInternal: 0,
                    degreeExternal: 0,
                    degreeExternalWithoutSap: 0
                };
                nodesMap.set(id, data);
                return { data };
            });

            const edges = xref.calls.map(({ source, target }) => {
                let sourceRoot = this.nodeComponents(source)[0].toString();
                let targetRoot = this.nodeComponents(target)[0].toString();
                let internal = sourceRoot === targetRoot;
                if (internal) {
                    nodesMap.get(source).degreeInternal++;
                    nodesMap.get(target).degreeInternal++;
                } else {
                    nodesMap.get(source).degreeExternal++;
                    nodesMap.get(target).degreeExternal++;

                    if (!nodesMap.get(target).sap) {
                        nodesMap.get(source).degreeExternalWithoutSap++;
                    }
                }
                return {
                    data: {
                        id: `${source} -> ${target}`,
                        source,
                        target,
                        internal,
                        external: !internal,  // TODO nodig?
                        scope: sourceRoot === targetRoot ? "internal" : "external",  // TODO nodig?
                    }
                };
            });

            this.elements = {
                nodes,
                edges
            };
        },

        nodeComponents: function (id) {
            // \FG:SBAL\FU:BAL_LOG_CREATE => [ ["fg", "sbal"], ["fu", "bal_log_create"] ]
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
            // \FG:SBAL\FU:BAL_LOG_CREATE => fg:sbal | fu:bal_log_create 
            return id
                .toLowerCase()
                .replace(/^\\/, "")
                .replaceAll("\\", this.COMPONENT_SEPARATOR);
        }
    });
});