import UIComponent from "sap/ui/core/UIComponent";
import Device from "sap/ui/Device";
import JSONModel from "sap/ui/model/json/JSONModel";
import BindingMode from "sap/ui/model/BindingMode";
import type { Router$TitleChangedEvent } from "sap/ui/core/routing/Router";
import Xrefs from "xref/model/Xrefs";
import Xref from "xref/model/Xref";
import User from "xref/model/User";

/**
 * @namespace xref
 */
export default class Component extends UIComponent {
    public static metadata = {
        interfaces: [
            "sap.ui.core.IAsyncContentCreation"
        ],
        manifest: "json"
    };

    UserModel: User;
    XrefsModel: Xrefs;
    XrefModel: Xref;

    /**
     * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
     * @public
     * @override
     */
    init(): void {
        // Call the base component's init function
        super.init();

        // Enable routing
        this.getRouter().initialize();
        this.getRouter().attachTitleChanged((event: Router$TitleChangedEvent) => document.title = event.getParameter("title") as string);  // From manifest

        // Device model
        const model = new JSONModel(Device);
        model.setDefaultBindingMode(BindingMode.OneWay);
        this.setModel(model, "device");

        // Create the User model
        let URI = this.getManifestEntry("/sap.app/dataSources/user/uri") as string;
        this.UserModel = new User(URI);
        this.setModel(this.UserModel, this.UserModel.ID);

        // Create the Xrefs model and link it to the User model for access to the session token
        URI = this.getManifestEntry("/sap.app/dataSources/xrefs/uri") as string;
        this.XrefsModel = new Xrefs(URI, this.UserModel);
        this.setModel(this.XrefsModel, this.XrefsModel.ID);

        // Create the Xref detail model
        this.XrefModel = new Xref(URI + "/");
        this.setModel(this.XrefModel, this.XrefModel.ID);
    }
}
