/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/Core",
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/resource/ResourceModel",
    "xref/model/Xrefs",
    "xref/model/Xref",
    "xref/model/User"
],
    function (Core, UIComponent, Device, JSONModel, ResourceModel, Xrefs, Xref, User) {
        "use strict";

        return UIComponent.extend("xref.Component", {
            metadata: {
                interfaces: [
                    "sap.ui.core.IAsyncContentCreation"
                ], manifest: "json"
            },

            UserModel: null,
            XrefsModel: null,
            XrefModel: null,

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // Call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // Enable routing
                this.getRouter().initialize();
                this.getRouter().attachTitleChanged(event => document.title = event.getParameter("title"));  // From manifest

                // Device model
                let model = new JSONModel(Device);
                model.setDefaultBindingMode("OneWay");
                this.setModel(model, "device");

                // Create reusable models for the resource bundles of the loaded libraries (sap.ui5.dependencies.libs) 
                // Idea from https://blogs.sap.com/2022/06/21/ui5-how-to-reuse-standard-i18n-texts
                for (const library of Object.keys(Core.getLoadedLibraries())) {
                    let bundle = Core.getLibraryResourceBundle(library);
                    let model = new ResourceModel({ bundle });
                    this.setModel(model, "i18n-" + library);  // i18n-sap.ui.core
                }

                // Create the User model
                let URI = this.getManifestEntry("/sap.app/dataSources/user/uri");
                this.UserModel = new User(URI);
                this.setModel(this.UserModel, this.UserModel.ID);

                // Create the Xrefs model and link it to the User model for access to the session token
                URI = this.getManifestEntry("/sap.app/dataSources/xrefs/uri");
                this.XrefsModel = new Xrefs(URI, this.UserModel);
                this.setModel(this.XrefsModel, this.XrefsModel.ID);

                // Create the Xref detail model 
                this.XrefModel = new Xref(URI + "/");
                this.setModel(this.XrefModel, this.XrefModel.ID);
            }
        });
    }
);