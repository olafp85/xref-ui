/**
 * Data structures of the Xref API
 */

export interface Unit {
    id: string;
    sap: boolean;
    package: string;
}

export interface Call {
    source: string;
    target: string;
}

export interface XrefData {
    unit: string;
    units: Unit[];
    calls: Call[];
}

export interface XrefItem {
    id: string;
    type: string;
    name: string;
    system: string;
}

export interface UserData {
    name: string;
    email: string;
}

export interface Credentials {
    email: string | null;
    password: string | null;
}

export interface ErrorResponse {
    message: string;
}
