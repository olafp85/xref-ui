sap.ui.define([
    "xref/controller/BaseController",
    "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
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

            sap.ui.require([
                "sap/ui/VersionInfo",
                "sap/base/util/Version"
            ], function (VersionInfo, VersionUtil) {
                VersionInfo.load().then(function (oCurrentVersionInfo) {
                    var oVersionUtil = new VersionUtil(oCurrentVersionInfo.version);
                    console.log('version', oCurrentVersionInfo.version);
                });
            });
        }
    });
});