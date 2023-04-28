/* global cytoscape */

sap.ui.loader.config({
    paths: { "cytoscape": "https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.17.1/cytoscape.min" }
});

sap.ui.define(["cytoscape"], function () {
    return cytoscape;
});
