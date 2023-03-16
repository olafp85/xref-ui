sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/model/json/JSONModel",
    "sap/m/ListMode",
    "sap/m/ListType",
    "sap/m/MessageBox",
    "sap/m/MessageToast"],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Fragment, Filter, FilterOperator, Sorter, JSONModel, ListMode, ListType, MessageBox, MessageToast) {
        "use strict";

        return Controller.extend("xref.controller.Home", {
            loadData: function () {
                this.byId("table").setBusyIndicatorDelay(0).setBusy(true);
                this.getOwnerComponent().getModel("xrefs")
                    .loadData("/apps/xref-api/xrefs")
                    .finally(() => this.byId("table").setBusy(false))
                    .catch(({ responseText }) => {
                        MessageBox.error("Data loading failed", {
                            details: responseText,
                            initialFocus: MessageBox.Action.CLOSE  // Otherwise the "View Details" will be highlighted
                        })
                    });
            },

            onInit: function () {
                // Initialize the view model
                this._oViewModel = new JSONModel({
                    editMode: false,
                    table: {
                        count: 0,
                        mode: ListMode.None
                    },
                    columnListItem: {
                        type: ListType.Navigation
                    }
                })
                this.getView().setModel(this._oViewModel, "view");

                // Initialize the xrefs model
                this.loadData();

                // Keep a reference to the sort dialog 
                this._oSortDialog = null;
            },

            onDisplay: function () {
                this._oViewModel.setProperty("/editMode", false);
                this._oViewModel.setProperty("/table/mode", ListMode.None);
                this._oViewModel.setProperty("/columnListItem/type", ListType.Navigation);
            },

            onEdit: function () {
                this._oViewModel.setProperty("/editMode", true);
                this._oViewModel.setProperty("/table/mode", ListMode.Delete);
                this._oViewModel.setProperty("/columnListItem/type", ListType.Inactive);
            },

            onItemDelete: function (oEvent) {
                const token = "6|Tq2Dgo3JhMQnxSUwOC5190UYCYV5BHX2FEfQs4Rh";
                const id = oEvent.getParameter("listItem").getBindingContext("xrefs").getProperty("id");

                let options = {
                    method: "DELETE",
                    headers: {
                        accept: "application/json",
                        authorization: "Bearer " + token
                    }
                }

                fetch(`/apps/xref-api/xrefs/${id}`, options)
                    .then(response => {
                        if (response.ok) {
                            MessageToast.show("Item was deleted successfully");
                            this.loadData();
                        } else {
                            return response.json();
                        }
                    })
                    .then(json => {
                        // No json, than response was okay
                        if (json) throw new Error(json.message);
                    })
                    .catch((error) => MessageBox.error(error.message));
            },

            onItemPress: function (oEvent) {
                const oItemBinding = oEvent.getSource().getBindingContext("xrefs");
                console.log("onItemPress", oItemBinding.getProperty("id"));
                let dev = this.getOwnerComponent().getModel("device").getData();
                console.log("device", dev);

                this.getOwnerComponent().getModel("xrefs").loadData("/apps/xref-api/xrefs/search/abap")
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

                // Secundairy sort by name
                if (sortItem.getKey() !== "name") {
                    aSorters.push(new Sorter("name", sortDescending))
                }

                this.byId("table").getBinding("items").sort(aSorters);
            },

            onUpdateFinished: function (oEvent) {
                // Fires after items binding is updated 
                this._oViewModel.setProperty("/table/count", oEvent.getParameter("total"));
            },

            onUpload: function () {
                const token = "6|Tq2Dgo3JhMQnxSUwOC5190UYCYV5BHX2FEfQs4Rh";
                let body = {
                    "type": "TEST",
                    "name": "Fetch"
                };

                let options = {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        accept: "application/json",
                        authorization: "Bearer " + token
                    },
                    body: JSON.stringify(body)
                }

                fetch("/apps/xref-api/xrefs", options)
                    .then(response => {
                        if (response.ok) {
                            MessageToast.show("File was uploaded successfully");
                            this.loadData();
                        } else {
                            return response.json();
                        }
                    })
                    .then(json => {
                        // No json, than response was okay
                        if (json) throw new Error(json.message);
                    })
                    .catch((error) => MessageBox.error(error.message));
            }
        });
    });
