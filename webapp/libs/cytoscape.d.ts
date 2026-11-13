/**
 * Types for the cytoscape loader shim (cytoscape.js), which registers the extensions below
 */
import cytoscape from "cytoscape";

declare module "cytoscape" {
    // cytoscape-context-menus (https://github.com/iVis-at-Bilkent/cytoscape.js-context-menus)
    interface ContextMenuItem {
        content: string;
        selector: string;
        onClickFunction: (event: EventObject) => void;
    }

    interface Core {
        contextMenus(options: { menuItems: ContextMenuItem[] }): unknown;
    }
}

export default cytoscape;
