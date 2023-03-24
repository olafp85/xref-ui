/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    "xref/model/Xrefs",
    "xref/model/User"
],
    function (UIComponent, Xrefs, User) {
        "use strict";

        return UIComponent.extend("xref.Component", {
            metadata: {
                interfaces: [
                    "sap.ui.core.IAsyncContentCreation"
                ], manifest: "json"
            },

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

                // Create the User model
                let URI = this.getManifestEntry("/sap.app/dataSources/user/uri");
                this.UserModel = new User(URI);
                this.setModel(this.UserModel, this.UserModel.ID);

                // Create the Xrefs model and link it to the User model for access to the session token
                URI = this.getManifestEntry("/sap.app/dataSources/xrefs/uri");
                this.XrefsModel = new Xrefs(URI, this.UserModel);
                this.setModel(this.XrefsModel, this.XrefsModel.ID);
            }
        });
    }
);