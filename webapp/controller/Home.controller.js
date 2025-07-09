sap.ui.define([
    "xref/controller/BaseController",
    "sap/ui/core/format/DateFormat",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/ui/model/json/JSONModel",
    "sap/ui/VersionInfo",
    "sap/m/library",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (BaseController, DateFormat, Filter, FilterOperator, Sorter, JSONModel, VersionInfo, sapMLibrary, MessageBox, MessageToast) {
        "use strict";

        // Get sap.m enumerations 
        const { InputType, ListMode, ListType } = sapMLibrary;

        return BaseController.extend("xref.controller.Home", {
            // Models
            Xrefs: null,
            User: null,
            viewModel: null,

            // References to the dialogs
            loginDialog: null,
            userDialog: null,
            aboutDialog: null,
            sortDialog: null,

            onAbout: async function () {
                if (this.aboutDialog) {
                    return this.aboutDialog.open();
                }

                const versionInfo = await VersionInfo.load();
                const buildTimestamp = DateFormat.getDateTimeInstance({ pattern: "yyyyMMddHHmm" }).parse(versionInfo.buildTimestamp);

                const viewModel = new JSONModel({
                    appVersion: this.getOwnerComponent().getManifestEntry("/sap.app/applicationVersion/version"),
                    sapVersion: `${versionInfo.version} (${DateFormat.getDateInstance({ style: "medium" }).format(buildTimestamp)})`
                });

                const aboutDialog = this.byId("aboutDialog");
                aboutDialog.setModel(viewModel).open();
                this.aboutDialog = aboutDialog;
            },

            onAboutClose: function () {
                this.aboutDialog.close();
            },

            onInit: function () {
                // Initialize the view model
                this.viewModel = new JSONModel({
                    uploadUrl: this.getOwnerComponent().XrefsModel.URI,
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
                        mode: ListMode.None,
                        system: {
                            value: "",
                            items: [{ key: "", text: "" }]
                        },
                        search: ""
                    },
                    columnListItem: {
                        type: ListType.Navigation
                    }
                });
                this.getView().setModel(this.viewModel, "view");

                // Initialize the xrefs model
                this.Xrefs = this.getOwnerComponent().XrefsModel;
                this.Xrefs.attachRequestSent(() => this.byId("table").setBusy(true));
                this.Xrefs.attachRequestCompleted(() => this.byId("table").setBusy(false));
                this.Xrefs.load()
                    .then((xrefs) => this._initSystems(xrefs))
                    .catch(({ message }) => MessageBox.error(message));

                // User model
                this.User = this.getOwnerComponent().UserModel;
            },

            onDisplay: function () {
                this._setEditMode(false);
            },

            onEdit: function () {
                this._setEditMode();
            },

            onItemDelete: function (event) {
                const { id, type, name } = event.getParameter("listItem").getBindingContext(this.Xrefs.ID).getObject();
                const text = `Delete item "${type.toLowerCase()} ${name}"?`;

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
                });
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
                        MessageToast.show("Successfully signed out");
                    })
                    .catch(({ message }) => MessageBox.error(message));
            },

            onSearch: function () {
                this._filterItems();
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
                    sorters.push(new Sorter("name", sortDescending));
                }

                this.byId("table").getBinding("items").sort(sorters);
            },

            onSystemChange: function () {
                this._filterItems();

                // Save the last selected system 
                localStorage.setItem("system", this.viewModel.getProperty("/table/system/value"));
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

            _filterItems: function () {
                let filters = [];

                const system = this.viewModel.getProperty("/table/system/value");
                if (system) {
                    filters.push(new Filter("system", FilterOperator.EQ, system));
                }

                const search = this.viewModel.getProperty("/table/search");
                if (search) {
                    filters.push(new Filter({
                        filters: [
                            new Filter("type", FilterOperator.Contains, search),
                            new Filter("name", FilterOperator.Contains, search),
                            new Filter("system", FilterOperator.Contains, search)
                        ],
                        and: false
                    }));
                }

                this.byId("table").getBinding("items").filter(filters);
            },

            _initSystems: function (xrefs) {
                // Unique list of systems 
                const systems = [...new Set(xrefs.map(xref => xref.system))];
                const items = ["", ...systems].map(system => ({ key: system, text: system }));
                this.viewModel.setProperty("/table/system/items", items);

                // Restore the last selected system
                const system = localStorage.getItem("system");
                if (system) {
                    this.viewModel.setProperty("/table/system/value", system);
                    this._filterItems();
                }
            },

            _setEditMode: function (on = true) {
                this.viewModel.setProperty("/action/display", on);
                this.viewModel.setProperty("/action/edit", !on);
                this.viewModel.setProperty("/table/mode", (on) ? ListMode.Delete : ListMode.None);
                this.viewModel.setProperty("/columnListItem/type", (on) ? ListType.Inactive : ListType.Navigation);
            }
        });
    });
