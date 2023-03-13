sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/model/json/JSONModel"],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Fragment, Filter, FilterOperator, Sorter, JSONModel) {
        "use strict";

        return Controller.extend("xref.controller.Home", {
            onInit: function () {
                this._oViewModel = new JSONModel({
                    count: 0
                })
                this.getView().setModel(this._oViewModel, "view");

                this._oSortDialog = null;
            },

            onSearch: function (oEvent) {
                const sValue = oEvent.getSource().getValue();
                const oBinding = this.byId("table").getBinding("items");

                if (!sValue) {
                    oBinding.filter(null);
                    return;
                }

                // Composite filter
                oBinding.filter(new Filter({
                    filters: [
                        new Filter("type", FilterOperator.Contains, sValue),
                        new Filter("name", FilterOperator.Contains, sValue),
                        new Filter("system", FilterOperator.Contains, sValue)
                    ],
                    and: false
                }));
            },

            onSort: async function () {
                if (!this._oSortDialog) {
                    this._oSortDialog = await Fragment.load({
                        id: this.getView().getId(),
                        name: "xref.view.Sort",
                        controller: this
                    })

                    // Pass on the model references
                    this.getView().addDependent(this._oSortDialog);
                }

                this._oSortDialog.open();
            },

            onSortConfirm: function (oEvent) {
                const { sortItem, sortDescending } = oEvent.getParameters();
                let aSorters = [new Sorter(sortItem.getKey(), sortDescending)];

                // 2nd sort is always on name
                if (sortItem.getKey() !== "name") {
                    aSorters.push(new Sorter("name", sortDescending))
                }

                this.byId("table")
                    .getBinding("items")
                    .sort(aSorters);
            },

            onUpdateFinished: function (oEvent) {
                this._oViewModel.setProperty("/count", oEvent.getParameter("total"));
            }
        });
    });
