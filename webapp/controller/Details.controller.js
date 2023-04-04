sap.ui.define([
    "xref/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, MessageBox) {
    "use strict";

    return BaseController.extend("xref.controller.Details", {
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
            return;
            this.getView().setBusy(true);
            this.Xrefs.load(id)
                .finally(() => this.getView().setBusy(false))
                .catch(({ message }) => MessageBox.error(message));



        }
    });
});