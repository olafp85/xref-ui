sap.ui.define([
    "xref/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, MessageBox) {
    "use strict";

    return BaseController.extend("xref.controller.Details", {
        Xref: null,

        onInit: function () {
            this.getRouter().getRoute("Details").attachMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            let { id } = oEvent.getParameter("arguments");

            let viewModel = new JSONModel({
                id
            });
            this.getView().setModel(viewModel, "view");

            // Initialize the xref model
            this.Xref = this.getOwnerComponent().XrefModel;
            this.Xref.attachRequestSent(() => this.getView().setBusy(true));
            this.Xref.attachRequestCompleted(() => this.getView().setBusy(false));
            this.Xref.load(id);
        }
    });
});