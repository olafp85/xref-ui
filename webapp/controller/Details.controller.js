sap.ui.define([
    "xref/controller/BaseController",
    "xref/libs/cytoscape",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (BaseController, cytoscape, JSONModel, MessageBox) {
    "use strict";

    return BaseController.extend("xref.controller.Details", {
        Xref: null,
        cy: null,

        onInit: function () {
            // Initialize the xref model
            this.Xref = this.getOwnerComponent().XrefModel;
            this.Xref.attachRequestSent(() => this.getView().setBusy(true));
            this.Xref.attachRequestCompleted(() => this.getView().setBusy(false));

            this.getRouter().getRoute("Details").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            let { id } = oEvent.getParameter("arguments");
            this.Xref.load(id).catch(({ message }) => MessageBox.error(message));

            this.cy = cytoscape({
                container: document.getElementById('cy'), // container to render in
                elements: [ // list of graph elements to start with
                    { // node a
                        data: { id: 'a' }
                    },
                    { // node b
                        data: { id: 'b' }
                    },
                    { // edge ab
                        data: { id: 'ab', source: 'a', target: 'b' }
                    }
                ],
                style: [ // the stylesheet for the graph
                    {
                        selector: 'node',
                        style: {
                            'background-color': '#666',
                            'label': 'data(id)'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 3,
                            'line-color': '#ccc',
                            'target-arrow-color': '#ccc',
                            'target-arrow-shape': 'triangle',
                            'curve-style': 'bezier'
                        }
                    }
                ],
                layout: {
                    name: 'grid',
                    rows: 1
                }
            });

        }
    });
});