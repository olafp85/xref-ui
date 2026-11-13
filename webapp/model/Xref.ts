import JSONModel from "sap/ui/model/json/JSONModel";
import type { XrefData } from "xref/model/types";

/**
 * @namespace xref.model
 */
export default class Xref extends JSONModel {
    ID = "xref";
    URI: string;

    constructor(URI: string) {
        super();
        this.setSizeLimit(999_999);
        this.URI = URI;
    }

    async load(id: string): Promise<XrefData> {
        try {
            await this.loadData(this.URI + id);
            return this.getData() as XrefData;
        } catch (error) {
            throw new Error((error as { statusText: string }).statusText);
        }
    }
}
