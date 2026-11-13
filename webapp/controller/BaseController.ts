import Controller from "sap/ui/core/mvc/Controller";
import History from "sap/ui/core/routing/History";
import UIComponent from "sap/ui/core/UIComponent";
import type Router from "sap/ui/core/routing/Router";
import type Component from "xref/Component";

/**
 * @namespace xref.controller
 */
export default class BaseController extends Controller {

    getOwnerComponent(): Component {
        return super.getOwnerComponent() as Component;
    }

    getRouter(): Router {
        return UIComponent.getRouterFor(this);
    }

    onNavBack(): void {
        if (History.getInstance().getPreviousHash()) {
            window.history.go(-1);
        } else {
            this.getRouter().navTo("Home", {}, true /*no history*/);
        }
    }
}
