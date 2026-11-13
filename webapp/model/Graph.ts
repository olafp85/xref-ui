/**
 * Dit graph model converteert het Xref-formaat (met units en calls) naar het Cytoscape graph-formaat (nodes en edges)
 */
import BaseObject from "sap/ui/base/Object";
import type { EdgeDefinition, ElementsDefinition, NodeDefinition } from "cytoscape";
import type { XrefData } from "xref/model/types";

interface NodeImage {
    width: number;
    height: number;
    data: string;
}

/**
 * @namespace xref.model
 */
export default class Graph extends BaseObject {
    COMPONENT_SEPARATOR = " | ";

    nodeDepth = 0;
    elements: ElementsDefinition;

    constructor(xref: XrefData) {
        super();
        this.nodeDepth = xref.units.reduce((max, { id }) => {
            const depth = this.nodeComponents(id).length - 1;
            return Math.max(max, depth);
        }, 0);

        const nodes: NodeDefinition[] = xref.units.map(({ id, sap, package: pkg }) => {
            return {
                data: {
                    id,
                    name: this.nodeName(id),
                    image: this.nodeImage(id),
                    sap,
                    package: pkg
                }
            };
        });

        const edges: EdgeDefinition[] = xref.calls.map(({ source, target }) => {
            const sourceRoot = this.nodeComponents(source)[0].toString();
            const targetRoot = this.nodeComponents(target)[0].toString();
            return {
                data: {
                    id: `${source} -> ${target}`,
                    source,
                    target,
                    scope: sourceRoot === targetRoot ? "internal" : "external",
                }
            };
        });

        this.elements = {
            nodes,
            edges
        };
    }

    nodeComponents(id: string): string[][] {
        // "\FG:SBAL\FU:BAL_LOG_CREATE" » [ ["fg", "sbal"], ["fu", "bal_log_create"] ]
        return this.nodeName(id)
            .split(this.COMPONENT_SEPARATOR)
            .map(component => component.split(":"));
    }

    nodeImage(id: string): NodeImage {
        const svgTemplate = document.getElementById("svg-template") as HTMLTemplateElement;
        const svgFragment = svgTemplate.content.cloneNode(true);

        document.body.append(svgFragment);
        const svg = document.body.querySelector("svg") as SVGSVGElement;

        const table = svg.querySelector("table") as HTMLTableElement;
        for (const component of this.nodeComponents(id)) {
            const row = table.insertRow();
            for (const segment of component) {
                const cell = row.insertCell();
                cell.innerHTML = segment;
            }
        }

        svg.setAttribute("width", String(table.offsetWidth));
        svg.setAttribute("height", String(table.offsetHeight));

        const svgXml = '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE svg>' + new XMLSerializer().serializeToString(svg);
        const image = {
            width: table.offsetWidth,
            height: table.offsetHeight,
            data: "data:image/svg+xml;utf8," + encodeURIComponent(svgXml),
        };

        svg.remove();
        return image;
    }

    nodeName(id: string): string {
        // FG:FUGR => fg:fugr
        // TY:zCdsView => ty:zCdsView
        const componentName = (component: string) => {
            const [prefix, name] = component.split(":");
            return [
                prefix.toLowerCase(),
                (name === name.toUpperCase()) ? name.toLowerCase() : name
            ].join(":");
        };

        // \FG:FUGR\FU:FUNC => fg:fugr | fu:func
        return id
            .slice(1)
            .split("\\")
            .map(componentName)
            .join(this.COMPONENT_SEPARATOR);
    }
}
