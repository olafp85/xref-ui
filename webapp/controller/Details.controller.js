sap.ui.define([
    "xref/controller/BaseController",
    "xref/libs/cytoscape",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (BaseController, cytoscape, MessageBox, JSONModel) {
    "use strict";

    return BaseController.extend("xref.controller.Details", {
        Xref: null,
        cy: null,
        viewModel: null,

        importGraph: function (oXref) {
            let nodes = oXref.units.map(({ id, sap }) => {
                return {
                    data: {
                        id,
                        image: this.nodeImage(id),
                        width: 1,
                        height: 1,
                        sap
                    }
                };
            });

            let edges = oXref.calls.map(({ source, target }) => {
                return {
                    data: {
                        id: `${source} -> ${target}`,
                        source,
                        target,
                    }
                };
            });

            return {
                nodes,
                edges
            };
        },

        nodeComponents: function (id) {
            return id
                .split("\\")
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

            let svgXml = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg>` + new XMLSerializer().serializeToString(svg);
            let image = {
                width: table.offsetWidth,
                height: table.offsetHeight,
                data: "data:image/svg+xml;utf8," + encodeURIComponent(svgXml),
            };

            svg.remove();
            return image;
        },

        nodeName: function (id) {
            return id
                .toLowerCase()
                .replace(/^\\/, "")
                .replaceAll("\\", " | ");
        },

        onEdgeLengthChange: function () {
            this.refreshLayout();
        },

        onInit: function () {
            // Initialize the xref model
            this.Xref = this.getOwnerComponent().XrefModel;
            this.Xref.attachRequestSent(() => this.getView().setBusy(true));
            this.Xref.attachRequestCompleted(() => this.getView().setBusy(false));

            // Initialize the view model
            this.viewModel = new JSONModel({
                unit: null,
                labels: false,
                spring: false,
                edgeLength: 0
            });
            this.getView().setModel(this.viewModel, "view");

            this.getRouter().getRoute("Details").attachMatched(this.onRouteMatch, this);
        },

        onLabelsSelect: function (oEvent) {
            this.setLabels();
            this.refreshLayout();
        },

        onNodeSelect: function (oEvent) {
            let oNode = oEvent.target;
            this.viewModel.setProperty("/unit", oNode.id());
        },

        onRouteMatch: function (oEvent) {
            let { id } = oEvent.getParameter("arguments");
            this.Xref.load(id)
                .then(oXref => this.showGraph(oXref))
                .catch(({ message }) => MessageBox.error(message));
        },

        onSpringSelect: function (oEvent) {
            this.refreshLayout();
        },

        onUnitChange: function () {
            let unit = this.viewModel.getProperty("/unit");
            this.cy.$("node:selected").unselect();
            if (unit) this.cy.$id(unit).select();
        },

        refreshGraph: function () {
            this.setLabels();
            this.refreshLayout();
        },

        refreshLayout: function () {
            let edgeLength = this.viewModel.getProperty("/edgeLength");  // Range 0..5
            let factor = 1 + edgeLength / 5;  // Range 1, 1.2, 1.4, 1.6, 1.8, 2
            let options = (this.viewModel.getProperty("/spring")) ?
                {
                    name: "cose-bilkent",
                    idealEdgeLength: 150 * factor,
                } :
                {
                    name: "cola",
                    maxSimulationTime: 1000,
                    edgeLength: (edgeLength) ? 100 * factor : undefined,
                };

            this.cy.layout(options).run();
        },

        setLabels: function () {
            let labels = this.viewModel.getProperty("/labels");
            this.cy.nodes().toggleClass("labels", labels);
        },

        showGraph: function (oXref) {
            this.viewModel.setProperty("/unit", null);

            this.cy = cytoscape({
                container: document.getElementById("cy"),
                elements: this.importGraph(oXref),
                style: fetch("css/cytoscape.css").then(response => response.text())
            });

            this.cy.ready(this.refreshGraph.bind(this));
            this.cy.on("select", "node", this.onNodeSelect.bind(this));
        }
    });
});