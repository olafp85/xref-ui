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
    "sap/m/MessageToast"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Fragment, Filter, FilterOperator, Sorter, JSONModel, ListMode, ListType, MessageBox, MessageToast) {
        "use strict";

        return Controller.extend("xref.controller.Home", {
            onInit: function () {
                // Initialize the view model
                this.viewModel = new JSONModel({
                    version: this.getOwnerComponent().getManifestEntry("/sap.app/applicationVersion/version"),
                    action: {
                        login: true,
                        logout: false,
                        upload: false,
                        display: false,
                        edit: false
                    },
                    table: {
                        count: 0,
                        mode: ListMode.None
                    },
                    columnListItem: {
                        type: ListType.Navigation
                    }
                })
                this.getView().setModel(this.viewModel, "view");

                // Initialize the xrefs model
                this.Xrefs = this.getOwnerComponent().XrefsModel;
                this.byId("table").setBusy(true);
                this.Xrefs.load()
                    .finally(() => this.byId("table").setBusy(false))
                    .catch(({ message }) => MessageBox.error(message));

                // User model
                this.User = this.getOwnerComponent().UserModel;

                // Keep references to the dialogs 
                this.loginDialog = null;
                this.sortDialog = null;
            },

            onDisplay: function () {
                this.editMode(false);
            },

            onEdit: function () {
                this.editMode();
            },

            onItemDelete: function (event) {
                const { id, type, name } = event.getParameter("listItem").getBindingContext(this.Xrefs.ID).getObject();
                const text = `Delete item "${type.toLowerCase()} ${name}"?`

                MessageBox.confirm(text, {
                    icon: MessageBox.Icon.WARNING,
                    title: "Delete",
                    actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.DELETE,
                    onClose: (action) => {
                        if (action !== MessageBox.Action.DELETE) return;
                        this.byId("table").setBusy(true);
                        this.Xrefs.delete(id)
                            .finally(() => this.byId("table").setBusy(false))
                            .then(() => MessageToast.show("Item was deleted successfully"))
                            .catch(({ message }) => MessageBox.error(message));
                    }
                })
            },

            onItemPress: function (event) {
                const itemBinding = event.getSource().getBindingContext(this.Xrefs.ID);
                console.log("onItemPress", itemBinding.getProperty("id"));
                console.log(sap.m.MessageBox.Action);
            },

            onLogin: async function () {
                this.loginDialog = await Fragment.load({
                    name: "xref.view.Login",
                    controller: this
                })
                this.getView().addDependent(this.loginDialog);  // Pass on the model references

                let credentials = new JSONModel({
                    email: "olaf.pohlmann@gmail.com",  // TODO
                    password: null,
                    proceed: false
                })
                this.loginDialog.setModel(credentials);
                this.loginDialog.open();
            },

            onLoginCancel: function () {
                this.loginDialog.close();
            },

            onLoginCheckInput: function (event) {
                let { email, password } = this.loginDialog.getModel().getData();

                // Current screen value (model isn't updated yet)
                if (event.getSource().getProperty("type") === sap.m.InputType.Password) {
                    password = event.getParameter("value");
                } else {
                    email = event.getParameter("value");
                }
                this.loginDialog.getModel().setProperty("/proceed", !!email && !!password);
            },

            onLoginConfirm: async function () {
                let credentials = this.loginDialog.getModel().getData();

                try {
                    let response = await this.User.login(credentials);
                    if (response.ok) {
                        MessageToast.show(`Welcome ${user.name}`)
                        this.loginDialog.close();
                        this.viewModel.setProperty("/action/login", false);
                        this.viewModel.setProperty("/action/logout", true);
                        this.viewModel.setProperty("/action/edit", true);
                    } else {
                        MessageToast.show("Bad credentials");
                    }

                } catch ({ message }) {
                    MessageBox.error(message);
                }
                this.loginDialog.setBusy(false);
            },

            onLogout: function () {
                this.getView().setBusy(true);
                this.User.logout()
                    .finally(() => this.getView().setBusy(false))
                    .then(() => {
                        this.editMode(false);
                        this.viewModel.setProperty("/action/login", true);
                        this.viewModel.setProperty("/action/logout", false);
                        this.viewModel.setProperty("/action/edit", false);
                        MessageToast.show("Successfully signed out")
                    })
                    .catch(({ message }) => MessageBox.error(message));
            },

            onSearch: function (event) {
                const value = event.getSource().getValue();
                const binding = this.byId("table").getBinding("items");
                if (!value) return binding.filter(null);

                binding.filter(new Filter({
                    filters: [
                        new Filter("type", FilterOperator.Contains, value),
                        new Filter("name", FilterOperator.Contains, value),
                        new Filter("system", FilterOperator.Contains, value)
                    ],
                    and: false
                }));
            },

            onSort: async function () {
                if (!this.sortDialog) {
                    this.sortDialog = await Fragment.load({
                        name: "xref.view.Sort",
                        controller: this
                    })
                    this.getView().addDependent(this.sortDialog);
                }
                this.sortDialog.open();
            },

            onSortConfirm: function (event) {
                const { sortItem, sortDescending } = event.getParameters();
                let sorters = [new Sorter(sortItem.getKey(), sortDescending)];

                // Secundairy sort by name
                if (sortItem.getKey() !== "name") {
                    sorters.push(new Sorter("name", sortDescending))
                }

                this.byId("table").getBinding("items").sort(sorters);
            },

            onUpdateFinished: function (event) {
                // Fires after items binding is updated 
                this.viewModel.setProperty("/table/count", event.getParameter("total"));
            },

            onUpload: function () {
                let body = {
                    "type": "TEST",
                    "name": "Promise"
                };

                this.byId("table").setBusy(true);
                this.Xrefs.create(body)
                    .finally(() => this.byId("table").setBusy(false))
                    .then(() => MessageToast.show("File was uploaded successfully"))
                    .catch(({ message }) => MessageBox.error(message));
            },

            editMode: function (on = true) {
                this.viewModel.setProperty("/action/upload", on);
                this.viewModel.setProperty("/action/display", on);
                this.viewModel.setProperty("/action/edit", !on);
                this.viewModel.setProperty("/table/mode", (on) ? ListMode.Delete : ListMode.None);
                this.viewModel.setProperty("/columnListItem/type", (on) ? ListType.Inactive : ListType.Navigation);
            }
        });
    });
