import JSONModel from "sap/ui/model/json/JSONModel";
import type User from "xref/model/User";
import type { ErrorResponse, XrefItem } from "xref/model/types";

/**
 * @namespace xref.model
 */
export default class Xrefs extends JSONModel {
    ID = "xrefs";
    URI: string;
    User: User;

    constructor(URI: string, UserModel: User) {
        super();
        this.setSizeLimit(999_999);
        this.URI = URI;
        this.User = UserModel;
    }

    async create(body: object): Promise<unknown> {
        const response = await fetch(this.URI, this.options("POST", body));
        const result = await response.json() as ErrorResponse;
        if (response.ok) {
            await this.load();
            return (result);
        } else {
            throw new Error(result.message);
        }
    }

    async delete(id: string): Promise<void> {
        const response = await fetch(`${this.URI}/${id}`, this.options("DELETE"));
        if (response.ok) {
            await this.load();
        } else {
            const result = await response.json() as ErrorResponse;
            throw new Error(result.message);
        }
    }

    options(method: string, body?: object): RequestInit {
        return {
            method,
            headers: {
                "content-type": "application/json",
                accept: "application/json",
                authorization: "Bearer " + this.User.token
            },
            body: (body) ? JSON.stringify(body) : null
        };
    }

    async load(): Promise<XrefItem[]> {
        try {
            await this.loadData(this.URI);
            return this.getData() as XrefItem[];
        } catch (error) {
            const { statusText, responseText } = error as { statusText: string; responseText?: string };
            try {
                const responseJson = JSON.parse(responseText as string) as ErrorResponse;
                throw new Error(responseJson.message);
            } catch {
                throw new Error(responseText ?? statusText);
            }
        }
    }
}
