import JSONModel from "sap/ui/model/json/JSONModel";
import type { Credentials, ErrorResponse, UserData } from "xref/model/types";

interface LoginResponse extends ErrorResponse {
    user: UserData;
    token: string;
}

/**
 * @namespace xref.model
 */
export default class User extends JSONModel {
    ID = "user";
    URI: string;
    token: string | null = null;

    constructor(URI: string) {
        super();
        this.URI = URI;
    }

    async login(credentials: Credentials): Promise<boolean> {
        const options = {
            method: "POST",
            headers: {
                "content-type": "application/json",
                accept: "application/json"
            },
            body: JSON.stringify(credentials)
        };

        const response = await fetch(this.URI + "/login", options);
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Unexpected response");
        }

        const result = await response.json() as LoginResponse;
        switch (response.status) {
            case 201:
                this.setData(result.user);
                this.token = result.token;
                return true;
            case 401:  // Unauthorized
                return false;
            default:
                throw new Error(result.message);
        }
    }

    async logout(): Promise<void> {
        const options = {
            method: "POST",
            headers: {
                accept: "application/json",
                authorization: "Bearer " + this.token
            }
        };

        const response = await fetch(this.URI + "/logout", options);
        if (response.ok) {
            this.token = null;
        } else {
            const result = await response.json() as ErrorResponse;
            throw new Error(result.message);
        }
    }
}
