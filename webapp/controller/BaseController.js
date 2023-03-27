sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/UIComponent"
], function (Controller, History, UIComponent) {
    "use strict";

    return Controller.extend("xref.controller.BaseController", {

        getRouter: function () {
            return UIComponent.getRouterFor(this);
        },

        onNavBack: function () {
            if (History.getInstance().getPreviousHash()) {
                window.history.go(-1);
            } else {
                this.getRouter().navTo("Home", {}, true /*no history*/);
            }
        }
    });
});