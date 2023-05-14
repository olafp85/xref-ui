sap.ui.define([
    "xref/controller/BaseController",
    "sap/m/MessageBox",
    "sap/m/OverflowToolbarButton",
    "sap/m/Text",
    "sap/ui/model/json/JSONModel"
], function (BaseController, MessageBox, OverflowToolbarButton, Text, JSONModel) {
    "use strict";

    return BaseController.extend("xref.controller.Details", {
        Xref: null,
        graph: null,
        viewModel: null,

        initGraph: function (xref) {
            // Derive the groups from the units
            let groups = new Set();
            xref.units.forEach(({ id, sap, package: devclass }) => groups.add([this.nodeGroup(id), sap, devclass].join()));
            groups = Array.from(groups).map(group => {
                let [id, sap, devclass] = group.split(",");
                return {
                    id,
                    name: id.toLowerCase(),
                    devclass,
                    status: sap === "true" ? "CustomSap" : null
                };
            })
            this.Xref.setProperty("/groups", Array.from(groups));
        },

        nodeComponents: function (id) {
            return id
                .split("\\")
                .slice(1);
        },

        nodeGroup: function (id) {
            return this.nodeComponents(id)[0];
        },

        nodeName: function (id) {
            return this.nodeComponents(id)
                .slice(1)
                .join(" | ")
                .toLowerCase();
        },

        onCollapseAllGroups: function () {
            this.graph.getGroups().forEach(group => group.setCollapsed(true));
        },

        onExpandAllGroups: function () {
            this.graph.getGroups().forEach(group => group.setCollapsed(false));
        },

        onInit: function () {
            this.getRouter().getRoute("Details").attachMatched(this.onRouteMatch, this);

            // Reference to the xref model
            this.Xref = this.getOwnerComponent().XrefModel;
            this.Xref.attachRequestSent(() => this.getView().setBusy(true));

            // Set the header
            this.graph = this.byId("graph");
            this.graph.attachGraphReady(() => this.getView().setBusy(false));
            this.graph.getToolbar().insertContent(new Text({
                text: "{= ${xref>/type}.toLowerCase()} {xref>/name}",
                wrapping: false
            }));

            // Add functions to the toolbar
            this.graph.getToolbar().addContent(this.byId("collapseAllButton"));
            this.graph.getToolbar().addContent(this.byId("expandAllButton"));
        },

        onRouteMatch: function (oEvent) {
            let { id } = oEvent.getParameter("arguments");
            this.Xref.load(id)
                .then((xref) => this.initGraph(xref))
                .catch(({ message }) => MessageBox.error(message));
        },
    });
});