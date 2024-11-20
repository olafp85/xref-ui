sap.ui.define([
    "xref/controller/BaseController",
    "xref/libs/cytoscape",
    "xref/model/Graph",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (BaseController, cytoscape, Graph, MessageBox, JSONModel) {
    "use strict";

    return BaseController.extend("xref.controller.Details", {
        cy: null,
        style: null,
        Xref: null,
        viewModel: null,

        onCondenseChange: function () {
            let condense = this.viewModel.getProperty("/condense/value");
            let xref = this.Xref.getData();

            for (let i = 0; i < condense; i++) {
                xref = this._condenseXref(xref);
            }

            this._showGraph(new Graph(xref));
        },

        onEdgeLengthChange: function () {
            this._refreshLayout();
        },

        onHighlightChange: function (event) {
            let highlight = Boolean(this.viewModel.getProperty("/highlight"));
            this.cy.elements().removeClass("highlight subgraph");
            this.cy.elements().addClass((highlight) ? "highlight" : "subgraph");
            if (event) this._refreshLayout();
        },

        onInfo: function (event) {
            let button = event.getSource();
            this.byId("infoDialog").openBy(button);
        },

        onInit: function () {
            this.getRouter().getRoute("Details").attachMatched(this.onRouteMatch, this);

            // Cytoscape stylesheet
            this.style = fetch("css/cytoscape.css").then(response => response.text());

            // Reference to the xref model
            this.Xref = this.getOwnerComponent().XrefModel;
            this.Xref.attachRequestSent(() => this.getView().setBusy(true));
            this.Xref.attachRequestCompleted(() => this.getView().setBusy(false));

            // Initialize the view model
            this.viewModel = new JSONModel({
                selection: {
                    value: "",
                    items: [{ key: "", text: "" }]
                },
                condense: {
                    value: 0,
                    max: 0
                },
                scope: "all",
                sapCalls: true,
                inLength: {
                    value: 0,
                    max: 0,
                    enabled: false
                },
                outLength: {
                    value: 0,
                    max: 0,
                    enabled: false
                },
                edgeLength: 0,
                highlight: "true",  // the view uses string-values
                labels: false,
                springLayout: false
            });
            this.getView().setModel(this.viewModel, "view");

            // Set a case-insensitive 'string contains' filter on the selection combobox
            this.getView()
                .byId("selection-combo-box")
                .setFilterFunction((value, item) => item.getText().match(new RegExp(value, "i")));

            // Make the title clickable
            this.getView()
                .byId("title")
                .attachBrowserEvent("click", () => {
                    this.viewModel.setProperty("/selection/value", this.Xref.getProperty("/unit"));
                    this.onSelectionChange();
                })
        },

        onInOutLengthChange: function (event) {
            this._showSelection();
        },

        onLabelsSelect: function (event) {
            this.cy.nodes().toggleClass("labels", this.viewModel.getProperty("/labels"));
            if (event) this._refreshLayout();
        },

        onLayoutStop: function (event) {
            // Refresh the selection list based on the visible nodes
            let items = this.cy.nodes(":visible").map(node => {
                return {
                    key: node.id(),
                    text: node.data("name")
                }
            });
            this.viewModel.setProperty("/selection/items", items);
        },

        onNodeSelect: function (event) {
            let node = event.target;
            let inMaxLength = this._nodeInMaxLength(node);
            let outMaxLength = this._nodeOutMaxLength(node);
            this.viewModel.setData({
                selection: {
                    value: node.id(),
                },
                inLength: {
                    value: (inMaxLength) ? 1 : 0,
                    max: inMaxLength || 1,
                    enabled: Boolean(inMaxLength)
                },
                outLength: {
                    value: (outMaxLength) ? 1 : 0,
                    max: outMaxLength || 1,
                    enabled: Boolean(outMaxLength)
                },
            }, true /* merge */);

            this._showSelection();
        },

        onNodeUnselect: function (event) {
            this.cy.elements().removeClass("path not-path");
            this._refreshViewModel();

            // Refresh the layout only when the subgraph is shown
            let highlight = Boolean(this.viewModel.getProperty("/highlight"));
            if (!highlight) this._refreshLayout();
        },

        onRouteMatch: function (event) {
            let { id } = event.getParameter("arguments");
            this.getView().setBusy(true);
            if (this.cy) this.cy.destroy();

            this.Xref.load(id)
                .finally(() => this.getView().setBusy(false))
                .then((xref) => {
                    let graph = new Graph(xref);
                    this.viewModel.setProperty("/condense/value", 0);
                    this.viewModel.setProperty("/condense/max", graph.nodeDepth);
                    this._refreshViewModel();
                    this._showGraph(graph);
                })
                .catch(({ message }) => MessageBox.error(message));
        },

        onSapCallsSelect: function () {
            this._refreshGraph();
        },

        onScopeChange: function () {
            this._refreshGraph();
        },

        onSelectionChange: function () {
            let id = this.viewModel.getProperty("/selection/value");
            this.cy.$("node:selected").unselect();
            this.cy.$id(id).select();  // this in turn triggers the select-node event 
        },

        onSpringLayoutSelect: function () {
            this._refreshLayout();
        },

        _condenseXref: function (xref) {
            // "\FG:FUGR\FU:FUNCTION" » "\FG:FUGR"
            function condense(id) {
                return "\\" + id.slice(1).replace(/\\[^\\]*$/, "");
            }

            // Units
            let condensedUnits = new Map();
            xref.units.forEach(unit => {
                let condensedUnit = {
                    ...unit,
                    id: condense(unit.id)
                }
                condensedUnits.set(unit.id, condensedUnit);
            });

            // Calls
            let condensedCalls = new Map();
            xref.calls.forEach((call) => {
                let condensedCall = {
                    ...call,
                    source: condense(call.source),
                    target: condense(call.target)
                }
                if (condensedCall.source !== condensedCall.target) {
                    condensedCalls.set(JSON.stringify(condensedCall), condensedCall);
                }
            });

            return {
                ...xref,
                units: Array.from(condensedUnits.values()),
                calls: Array.from(condensedCalls.values())
            };
        },

        _nodeInElements: function (elements, depth) {
            let inElements = elements.incomers();
            return (depth == 0) ? this.cy.collection() : inElements.union(this._nodeInElements(inElements, depth - 1));
        },

        _nodeInMaxLength: function (node) {
            // Perform an A* search to find the shortest path from the node to each predecessors
            let predecessors = node.predecessors("node");
            let maxLength = predecessors.reduce((value = 0, predecessor) => {
                let aStar = this.cy.elements().aStar({
                    root: node,
                    goal: predecessor
                });
                return Math.max(value, aStar.distance);
            });
            return maxLength ?? 0;
        },

        _nodeOutElements: function (elements, depth) {
            let outElements = elements.outgoers();
            return (depth == 0) ? this.cy.collection() : outElements.union(this._nodeOutElements(outElements, depth - 1));
        },

        _nodeOutMaxLength: function (node) {
            let successors = node.successors("node");
            let maxLength = successors.reduce((value = 0, successor) => {
                let aStar = this.cy.elements().aStar({
                    root: node,
                    goal: successor
                });
                return Math.max(value, aStar.distance);
            });
            return maxLength ?? 0;
        },

        _refreshGraph: function () {
            let scope = this.viewModel.getProperty("/scope");
            let sapCalls = this.viewModel.getProperty("/sapCalls");

            // Mark irrelevant nodes and edges
            let edgeFilter = (scope === "all") ? undefined : `[scope = "${scope}"]`;
            let relevantEdges = this.cy.edges(edgeFilter);
            if (!sapCalls) {
                relevantEdges = relevantEdges.filter(edge => !edge.target().data("sap"));
            }

            let relevantNodes = relevantEdges.connectedNodes();
            if (scope === "all") {
                const isolatedNodes = this.cy.nodes("[[degree = 0]]");
                relevantNodes = relevantNodes.union(isolatedNodes);
            }

            this.cy.elements().addClass("not-relevant");
            relevantEdges.removeClass("not-relevant");
            relevantNodes.removeClass("not-relevant");

            this.onHighlightChange();
            this.onLabelsSelect();
            this._refreshLayout();
        },

        _refreshLayout: function () {
            let springLayout = this.viewModel.getProperty("/springLayout");
            let edgeLength = this.viewModel.getProperty("/edgeLength");  // Range 0..5
            let factor = 1 + edgeLength / 5;  // Range 1, 1.2, 1.4, 1.6, 1.8, 2
            let options = (springLayout) ?
                {
                    name: "cose-bilkent",
                    idealEdgeLength: 150 * factor,
                } :
                {
                    name: "cola",
                    maxSimulationTime: 1000,
                    edgeLength: (edgeLength) ? 100 * factor : undefined,
                };

            let layout = this.cy.layout(options);
            layout.on("layoutstop", this.onLayoutStop.bind(this));
            layout.run();
        },

        _refreshViewModel: function () {
            this.viewModel.setData({
                selection: {
                    value: ""
                },
                inLength: {
                    value: 0,
                    max: 1,  // Setting it to 0 doesn't work correctly in the UI
                    enabled: false
                },
                outLength: {
                    value: 0,
                    max: 1,
                    enabled: false
                },
            }, true /* merge */);
        },

        _showGraph: async function (graph) {
            this.cy = cytoscape({
                container: document.getElementById("cy"),
                elements: graph.elements,
                style: await this.style,
                wheelSensitivity: 0.1  // Reduced sensitivity
            });

            this._refreshGraph();

            // Cytoscape event handlers 
            this.cy.on("select", "node", this.onNodeSelect.bind(this));
            this.cy.on("unselect", "node", this.onNodeUnselect.bind(this));
        },

        _showSelection: function () {
            let node = this.cy.$("node:selected");
            let inLength = this.viewModel.getProperty("/inLength/value");
            let outLength = this.viewModel.getProperty("/outLength/value");

            let inElements = this._nodeInElements(node, inLength);
            let outElements = this._nodeOutElements(node, outLength);
            let path = this.cy.collection().merge(inElements).merge(outElements);

            this.cy.elements().removeClass("path not-path");
            path.addClass("path");
            this.cy.elements().not(path).not(node).addClass("not-path");

            // Refresh the layout only when the subgraph is shown
            let highlight = Boolean(this.viewModel.getProperty("/highlight"));
            if (!highlight) this._refreshLayout();
        }
    });
});