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
                const contentType = response.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Unexpected response");
                }

                let result = await response.json();
                switch (response.status) {
                    case 201:
                        this.setData(result.user);
                        this.token = result.token;
                        return true;
                    case 401:  // Unauthorized
                        return false;
                    default:
                        throw new Error(result.message)
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