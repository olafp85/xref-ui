sap.ui.define([
    "sap/ui/model/json/JSONModel"
],
    function (JSONModel) {
        "use strict";

        return JSONModel.extend("xref.model.Xref", {
            ID: "xref",
            URI: null,

            constructor: function (URI) {
                JSONModel.prototype.constructor.call(this);
                this.URI = URI;
            },

            load: async function (id) {
                try {
                    await this.loadData(this.URI + id);
                } catch ({ statusText, responseText }) {
                    try {
                        let responseJson = JSON.parse(responseText);
                        throw new Error(responseJson.message);
                    } catch (e) { }
                    throw new Error(responseText ?? statusText);
                }
            }
        });
    });