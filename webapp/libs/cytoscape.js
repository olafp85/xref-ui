sap.ui.loader.config({
    paths: {
        // Cytoscape for graph analysis and visualization (https://js.cytoscape.org/)
        "cytoscape": "https://cdn.jsdelivr.net/npm/cytoscape@3.23/dist/cytoscape.min",

        // Cose bilkent extension (https://github.com/cytoscape/cytoscape.js-cose-bilkent#api)
        "cytoscape-cose-bilkent": "https://cdn.jsdelivr.net/npm/cytoscape-cose-bilkent@4.1/cytoscape-cose-bilkent.min",
        "cose-base": "https://cdn.jsdelivr.net/npm/cose-base@2.2/cose-base.min",
        "layout-base": "https://cdn.jsdelivr.net/npm/layout-base@2.0/layout-base.min",

        // Cola extension (https://github.com/cytoscape/cytoscape.js-cola#api)
        "cytoscape-cola": "https://cdn.jsdelivr.net/npm/cytoscape-cola@2.5/cytoscape-cola.min",
        "webcola": "https://cdn.jsdelivr.net/npm/webcola@3.4/WebCola/cola.min"
    },
    shim: {
        "cytoscape": {
            exports: "cytoscape"
        },
        "cytoscape-cose-bilkent": {
            exports: "cytoscapeCoseBilkent",
            deps: ["cose-base"]
        },
        "cose-base": {
            exports: "coseBase",
            deps: ["layout-base"]
        },
        "layout-base": {
            exports: "layoutBase"
        },
        "cytoscape-cola": {
            exports: "cytoscapeCola",
            deps: ["webcola"]
        },
        "webcola": {
            exports: "cola"
        },

    }
});

sap.ui.define([
    "cytoscape-cose-bilkent",
    "cytoscape-cola",
    "cytoscape"
], function (coseBilkent, cola, cytoscape) {
    "use strict";

    cytoscape.use(coseBilkent);
    cytoscape.use(cola);
    return cytoscape;
});
