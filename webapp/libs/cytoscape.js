sap.ui.loader.config({
    paths: {
        // Cytoscape for graph analysis and visualization (https://js.cytoscape.org)
        "cytoscape": "https://cdn.jsdelivr.net/npm/cytoscape@3.28.1/dist/cytoscape.min",

        // Cola extension (https://github.com/cytoscape/cytoscape.js-cola#api)
        "cytoscape-cola": "https://cdn.jsdelivr.net/npm/cytoscape-cola@2.5.1/cytoscape-cola.min",
        "webcola": "https://cdn.jsdelivr.net/npm/webcola@3.4/WebCola/cola.min",

        // Cose bilkent extension (https://github.com/cytoscape/cytoscape.js-cose-bilkent#api)
        "cytoscape-cose-bilkent": "https://cdn.jsdelivr.net/npm/cytoscape-cose-bilkent@4.1.0/cytoscape-cose-bilkent.min",
        "cose-base": "https://cdn.jsdelivr.net/npm/cose-base@2.2.0/cose-base.min",
        "layout-base": "https://cdn.jsdelivr.net/npm/layout-base@2.0.1/layout-base.min"
    },
    shim: {
        "cytoscape": {
            exports: "cytoscape"
        },
        "cytoscape-cola": {
            exports: "cytoscapeCola",
            deps: ["webcola"]
        },
        "webcola": {
            exports: "cola"
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
    }
});

sap.ui.define([
    "cytoscape",
    "cytoscape-cola",
    "cytoscape-cose-bilkent"
], function (cytoscape, cola, coseBilkent) {
    "use strict";

    cytoscape.use(cola);
    cytoscape.use(coseBilkent);

    return cytoscape;
});