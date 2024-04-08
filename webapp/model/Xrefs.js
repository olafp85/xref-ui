sap.ui.define([
    "sap/ui/model/json/JSONModel"
],
    function (JSONModel) {
        "use strict";

        return JSONModel.extend("xref.model.Xrefs", {
            ID: "xrefs",
            URI: null,
            User: null,

            constructor: function (URI, UserModel) {
                JSONModel.prototype.constructor.call(this);
                this.setSizeLimit(999_999);
                this.URI = URI;
                this.User = UserModel;
            },

            create: async function (body) {
                let response = await fetch(this.URI, this.options('POST', body));
                let result = await response.json();
                if (response.ok) {
                    await this.load();
                    return (result);
                } else {
                    throw new Error(result.message);
                }
            },

            delete: async function (id) {
                let response = await fetch(`${this.URI}/${id}`, this.options('DELETE'));
                if (response.ok) {
                    await this.load();
                } else {
                    let result = await response.json();
                    throw new Error(result.message);
                }
            },

            options: function (method, body) {
                return {
                    method,
                    headers: {
                        "content-type": "application/json",
                        accept: "application/json",
                        authorization: "Bearer " + this.User.token
                    },
                    body: (body) ? JSON.stringify(body) : null
                };
            },

            load: async function () {
                try {
                    await this.loadData(this.URI);
                    return this.getData();
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