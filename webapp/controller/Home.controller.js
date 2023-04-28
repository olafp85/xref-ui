sap.ui.define([
    "xref/controller/BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/model/json/JSONModel",
    "sap/m/InputType",
    "sap/m/ListMode",
    "sap/m/ListType",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController, Filter, FilterOperator, Sorter, JSONModel, InputType, ListMode, ListType, MessageBox, MessageToast) {
        "use strict";

        return BaseController.extend("xref.controller.Home", {
            // Models
            Xrefs: null,
            User: null,
            viewModel: null,

            // References to the dialogs
            loginDialog: null,
            userDialog: null,
            sortDialog: null,

            onInit: function () {
                // App title (doesn't work when navigating directly to detail page)
                this.getOwnerComponent().getModel("i18n").getResourceBundle()
                    .then(bundle => document.title = bundle.getText("appTitle"));

                // Initialize the xrefs model
                this.Xrefs = this.getOwnerComponent().XrefsModel;
                this.Xrefs.attachRequestSent(() => this.byId("table").setBusy(true));
                this.Xrefs.attachRequestCompleted(() => this.byId("table").setBusy(false));
                this.Xrefs.load().catch(({ message }) => MessageBox.error(message));

                // User model
                this.User = this.getOwnerComponent().UserModel;

                // Initialize the view model
                this.viewModel = new JSONModel({
                    version: this.getOwnerComponent().getManifestEntry("/sap.app/applicationVersion/version"),
                    uploadUrl: this.Xrefs.URI,
                    authorization: null,
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
                });
                this.getView().setModel(this.viewModel, "view");
            },

            onDisplay: function () {
                this._setEditMode(false);
            },

            onEdit: function () {
                this._setEditMode();
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
                        this.Xrefs.delete(id)
                            .then(() => MessageToast.show("Item was deleted successfully"))
                            .catch(({ message }) => MessageBox.error(message));
                    }
                })
            },

            onItemPress: function (event) {
                const itemBinding = event.getSource().getBindingContext(this.Xrefs.ID);
                const id = itemBinding.getProperty("id");
                this.getRouter().navTo("Details", { id });
            },

            onLogin: function () {
                if (this.loginDialog) {
                    return this.loginDialog.open();
                }

                let viewModel = new JSONModel({
                    credentials: {
                        email: null,
                        password: null
                    },
                    proceed: false
                });

                this.loadFragment({ name: "xref.view.fragment.Login" })
                    .then(fragment => {
                        fragment.setModel(viewModel).open();
                        this.loginDialog = fragment;
                    });
            },

            onLoginCancel: function () {
                this.loginDialog.close();
                this.loginDialog.getModel().setProperty("/credentials/password", null);
                this.loginDialog.getModel().setProperty("/proceed", false);
            },

            onLoginCheckInput: function (event) {
                let { credentials: { email, password } } = this.loginDialog.getModel().getData();

                // Current screen value (model isn't updated yet)
                if (event.getSource().getProperty("type") === InputType.Password) {
                    password = event.getParameter("value");
                } else {
                    email = event.getParameter("value");
                }
                this.loginDialog.getModel().setProperty("/proceed", !!email && !!password);
            },

            onLoginConfirm: function () {
                let { credentials } = this.loginDialog.getModel().getData();

                this.loginDialog.setBusy(true);
                this.User.login(credentials)
                    .finally(() => {
                        this.loginDialog.setBusy(false);
                        this.loginDialog.getModel().setProperty("/credentials/password", null);
                    })
                    .then(ok => {
                        if (ok) {
                            MessageToast.show(`Welcome ${this.User.getProperty("/name")}`);
                            this.loginDialog.close();
                            this.viewModel.setProperty("/action/login", false);
                            this.viewModel.setProperty("/action/logout", true);
                            this.viewModel.setProperty("/action/upload", true);
                            this.viewModel.setProperty("/action/edit", true);
                        } else {
                            MessageBox.error("Incorrect credentials");
                        }
                    })
                    .catch(({ message }) => MessageBox.error(message));
            },

            onLogout: function () {
                this.getView().setBusy(true);
                this.User.logout()
                    .finally(() => this.getView().setBusy(false))
                    .then(() => {
                        this._setEditMode(false);
                        this.viewModel.setProperty("/action/login", true);
                        this.viewModel.setProperty("/action/logout", false);
                        this.viewModel.setProperty("/action/upload", false);
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

            onSort: function () {
                if (this.sortDialog) {
                    return this.sortDialog.open();
                }

                this.loadFragment({ name: "xref.view.fragment.Sort" })
                    .then(fragment => {
                        fragment.open();
                        this.sortDialog = fragment;
                    });
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

            onUpload: function (event) {
                this.viewModel.setProperty("/authorization", "Bearer " + this.User.token);
                let button = event.getSource();
                this.byId("uploadDialog").openBy(button);
            },

            onUploadCompleted: function (event) {
                let { status, response } = event.getParameters();
                if (status === 201) {
                    MessageToast.show("Upload Completed");
                    this.Xrefs.load();
                } else {
                    MessageBox.error("Upload failed", { details: response });
                }
            },

            onUser: function (event) {
                let button = event.getSource();
                this.byId("userDialog").openBy(button);
            },

            _setEditMode: function (on = true) {
                this.viewModel.setProperty("/action/display", on);
                this.viewModel.setProperty("/action/edit", !on);
                this.viewModel.setProperty("/table/mode", (on) ? ListMode.Delete : ListMode.None);
                this.viewModel.setProperty("/columnListItem/type", (on) ? ListType.Inactive : ListType.Navigation);
            }
        });
    });
