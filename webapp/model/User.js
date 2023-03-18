sap.ui.define([
    "sap/ui/model/json/JSONModel"
],
    function (JSONModel) {
        "use strict";

        return JSONModel.extend("xref.model.User", {
            ID: "user",
            URI: null,
            token: null,

            constructor: function (URI) {
                JSONModel.prototype.constructor.call(this);
                this.URI = URI;
            },

            login: async function (credentials) {
                let options = {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        accept: "application/json"
                    },
                    body: JSON.stringify(credentials)
                }

                let response = await fetch(this.URI + "/login", options);
                let result = await response.json();
                if (response.ok) {
                    this.setData(result.user);
                    this.token = result.token;
                    return (result.user);
                } else {
                    throw new Error(result.message);
                }
            },

            logout: async function () {
                let options = {
                    method: "POST",
                    headers: {
                        accept: "application/json",
                        authorization: "Bearer " + this.token
                    }
                }

                let response = await fetch(this.URI + "/logout", options);
                if (response.ok) {
                    this.token = null;
                } else {
                    let result = await response.json();
                    throw new Error(result.message);
                }
            }
        });
    });