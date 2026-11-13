import BaseController from "xref/controller/BaseController";
import cytoscape from "xref/libs/cytoscape";
import Graph from "xref/model/Graph";
import MessageBox from "sap/m/MessageBox";
import JSONModel from "sap/ui/model/json/JSONModel";
import type { Button$PressEvent } from "sap/m/Button";
import type Button from "sap/m/Button";
import type ComboBox from "sap/m/ComboBox";
import type ResponsivePopover from "sap/m/ResponsivePopover";
import type Title from "sap/m/Title";
import type Event from "sap/ui/base/Event";
import type Item from "sap/ui/core/Item";
import type { Route$MatchedEvent } from "sap/ui/core/routing/Route";
import type ResourceModel from "sap/ui/model/resource/ResourceModel";
import type { Core, EventObject, NodeCollection, NodeSingular, Stylesheet } from "cytoscape";
import type Xref from "xref/model/Xref";
import type { XrefData } from "xref/model/types";

/**
 * @namespace xref.controller
 */
export default class Details extends BaseController {
    cy: Core | null = null;
    style: Promise<string>;
    Xref: Xref;
    viewModel: JSONModel;

    onCondenseChange(): void {
        const condense = this.viewModel.getProperty("/condense/value") as number;
        let xref = this.Xref.getData() as XrefData;

        for (let i = 0; i < condense; i++) {
            xref = this._condenseXref(xref);
        }

        void this._showGraph(new Graph(xref));
    }

    onEdgeLengthChange(): void {
        this._refreshLayout();
    }

    onHighlightChange(event?: Event): void {
        const highlight = Boolean(this.viewModel.getProperty("/highlight"));
        this.cy!.elements().removeClass("highlight subgraph");
        this.cy!.elements().addClass((highlight) ? "highlight" : "subgraph");
        if (event) this._refreshLayout();
    }

    onInfo(event: Button$PressEvent): void {
        const button = event.getSource<Button>();
        (this.byId("infoDialog") as ResponsivePopover).openBy(button);
    }

    onInit(): void {
        this.getRouter().getRoute("Details")!.attachMatched((event) => this.onRouteMatch(event));

        // Cytoscape stylesheet
        this.style = fetch("css/cytoscape.css").then(response => response.text());

        // Reference to the xref model
        const view = this.getView()!;
        this.Xref = this.getOwnerComponent().XrefModel;
        this.Xref.attachRequestSent(() => view.setBusy(true));
        this.Xref.attachRequestCompleted(() => view.setBusy(false));

        // Initialize the view model
        this.viewModel = new JSONModel({
            selection: {
                value: "",
                items: [{ key: "", text: "" }]
            },
            condense: {
                value: 0,
                max: 0
            },
            scope: "all",
            sapCalls: true,
            inLength: {
                value: 0,
                max: 0,
                enabled: false
            },
            outLength: {
                value: 0,
                max: 0,
                enabled: false
            },
            edgeLength: 0,
            highlight: "true",  // the view uses string-values
            labels: false,
            springLayout: false
        });
        view.setModel(this.viewModel, "view");

        // Set a case-insensitive 'string contains' filter on the selection combobox
        (view.byId("selection-combo-box") as ComboBox)
            .setFilterFunction((value?: string, item?: Item) => !!item!.getText().match(new RegExp(value!, "i")));

        // Make the title clickable
        (view.byId("title") as Title)
            .attachBrowserEvent("click", () => {
                this.viewModel.setProperty("/selection/value", this.Xref.getProperty("/unit"));
                this.onSelectionChange();
            });
    }

    onInOutLengthChange(): void {
        this._showSelection();
    }

    onLabelsSelect(event?: Event): void {
        this.cy!.nodes().toggleClass("labels", this.viewModel.getProperty("/labels") as boolean);
        if (event) this._refreshLayout();
    }

    onLayoutStop(): void {
        // Refresh the selection list based on the visible nodes
        const items = this.cy!.nodes(":visible").map(node => {
            return {
                key: node.id(),
                text: node.data("name") as string
            };
        });
        this.viewModel.setProperty("/selection/items", items);
    }

    onNodeSelect(event: EventObject): void {
        const node = event.target as NodeSingular;
        const inMaxLength = this._nodeInMaxLength(node);
        const outMaxLength = this._nodeOutMaxLength(node);
        let inLength = this.viewModel.getProperty("/inLength/value") as number;
        let outLength = this.viewModel.getProperty("/outLength/value") as number;

        if (!inLength && !outLength) {
            inLength = 1;
            outLength = 1;
        }

        this.viewModel.setData({
            selection: {
                value: node.id()
            },
            inLength: {
                value: Math.min(inLength, inMaxLength),
                max: inMaxLength || 1,
                enabled: Boolean(inMaxLength)
            },
            outLength: {
                value: Math.min(outLength, outMaxLength),
                max: outMaxLength || 1,
                enabled: Boolean(outMaxLength)
            }
        }, true /* merge */);

        this._showSelection();
    }

    onNodeUnselect(): void {
        this.cy!.elements().removeClass("path not-path");
        this._refreshViewModel();

        // Refresh the layout only when the subgraph is shown
        const highlight = Boolean(this.viewModel.getProperty("/highlight"));
        if (!highlight) this._refreshLayout();
    }

    onRouteMatch(event: Route$MatchedEvent): void {
        const { id } = event.getParameter("arguments") as { id: string };
        const view = this.getView()!;
        view.setBusy(true);
        if (this.cy) this.cy.destroy();

        this.Xref.load(id)
            .finally(() => view.setBusy(false))
            .then((xref) => {
                const graph = new Graph(xref);
                this.viewModel.setProperty("/condense/value", 0);
                this.viewModel.setProperty("/condense/max", graph.nodeDepth);
                this._refreshViewModel();
                return this._showGraph(graph);
            })
            .catch(({ message }: Error) => MessageBox.error(message));
    }

    onSapCallsSelect(): void {
        this._refreshGraph();
    }

    onScopeChange(): void {
        this._refreshGraph();
    }

    onSelectionChange(): void {
        const id = this.viewModel.getProperty("/selection/value") as string;
        this.cy!.$("node:selected").unselect();
        this.cy!.$id(id).select();  // this in turn triggers the select-node event
    }

    onSpringLayoutSelect(): void {
        this._refreshLayout();
    }

    _condenseXref(xref: XrefData): XrefData {
        // "\FG:FUGR\FU:FUNCTION" » "\FG:FUGR"
        function condense(id: string): string {
            return "\\" + id.slice(1).replace(/\\[^\\]*$/, "");
        }

        // Units
        const condensedUnits = new Map<string, XrefData["units"][number]>();
        xref.units.forEach(unit => {
            const condensedUnit = {
                ...unit,
                id: condense(unit.id)
            };
            condensedUnits.set(unit.id, condensedUnit);
        });

        // Calls
        const condensedCalls = new Map<string, XrefData["calls"][number]>();
        xref.calls.forEach((call) => {
            const condensedCall = {
                ...call,
                source: condense(call.source),
                target: condense(call.target)
            };
            if (condensedCall.source !== condensedCall.target) {
                condensedCalls.set(JSON.stringify(condensedCall), condensedCall);
            }
        });

        return {
            ...xref,
            units: Array.from(condensedUnits.values()),
            calls: Array.from(condensedCalls.values())
        };
    }

    _nodeInElements(elements: NodeCollection, depth: number): NodeCollection {
        const inElements = elements.incomers();
        return (depth === 0) ? this.cy!.collection() : inElements.union(this._nodeInElements(inElements, depth - 1));
    }

    _nodeInMaxLength(node: NodeSingular): number {
        // Perform an A* search to find the shortest path from the node to each predecessors
        const predecessors = node.predecessors("node");
        return predecessors.reduce((value, predecessor) => {
            const aStar = this.cy!.elements().aStar({
                root: node,
                goal: predecessor
            });
            return Math.max(value, aStar.distance);
        }, 0);
    }

    _nodeOutElements(elements: NodeCollection, depth: number): NodeCollection {
        const outElements = elements.outgoers();
        return (depth === 0) ? this.cy!.collection() : outElements.union(this._nodeOutElements(outElements, depth - 1));
    }

    _nodeOutMaxLength(node: NodeSingular): number {
        const successors = node.successors("node");
        return successors.reduce((value, successor) => {
            const aStar = this.cy!.elements().aStar({
                root: node,
                goal: successor
            });
            return Math.max(value, aStar.distance);
        }, 0);
    }

    _refreshGraph(): void {
        const cy = this.cy!;
        const scope = this.viewModel.getProperty("/scope") as string;
        const sapCalls = this.viewModel.getProperty("/sapCalls") as boolean;

        // Mark irrelevant nodes and edges
        const edgeFilter = (scope === "all") ? undefined : `[scope = "${scope}"]`;
        let relevantEdges = cy.edges(edgeFilter);
        if (!sapCalls) {
            relevantEdges = relevantEdges.filter(edge => !edge.target().data("sap"));
        }

        let relevantNodes = relevantEdges.connectedNodes();
        if (scope === "all") {
            const isolatedNodes = cy.nodes("[[degree = 0]]");
            relevantNodes = relevantNodes.union(isolatedNodes);
        }

        cy.elements().addClass("not-relevant");
        relevantEdges.removeClass("not-relevant");
        relevantNodes.removeClass("not-relevant");

        this.onHighlightChange();
        this.onLabelsSelect();
        this._refreshLayout();
    }

    _refreshLayout(): void {
        const springLayout = this.viewModel.getProperty("/springLayout") as boolean;
        const edgeLength = this.viewModel.getProperty("/edgeLength") as number;  // Range 0..5
        const factor = 1 + edgeLength / 5;  // Range 1, 1.2, 1.4, 1.6, 1.8, 2
        const options = (springLayout) ?
            {
                name: "cose-bilkent",
                idealEdgeLength: 150 * factor
            } :
            {
                name: "cola",
                maxSimulationTime: 1000,
                edgeLength: (edgeLength) ? 100 * factor : undefined
            };

        const layout = this.cy!.layout(options);
        layout.on("layoutstop", this.onLayoutStop.bind(this));
        layout.run();
    }

    _refreshViewModel(): void {
        this.viewModel.setData({
            selection: {
                value: ""
            },
            inLength: {
                enabled: false
            },
            outLength: {
                enabled: false
            }
        }, true /* merge */);
    }

    async _showGraph(graph: Graph): Promise<void> {
        try {
            this.cy = cytoscape({
                container: document.getElementById("cy"),
                elements: graph.elements,
                style: await this.style as unknown as Stylesheet[],  // CSS text is accepted as well
                wheelSensitivity: 0.1  // Reduced sensitivity
            });
        } catch (error) {
            MessageBox.error((error as Error).message);
            return;
        }

        this._refreshGraph();

        // Cytoscape event handlers
        this.cy.on("select", "node", this.onNodeSelect.bind(this));
        this.cy.on("unselect", "node", this.onNodeUnselect.bind(this));

        // Context menu
        const i18n = await (this.getView()!.getModel("i18n") as ResourceModel).getResourceBundle();
        this.cy.contextMenus({
            menuItems: [
                {
                    content: i18n.getText("hide") as string,
                    selector: "node",
                    onClickFunction: (event) => {
                        (event.target as NodeSingular).remove();
                        this._refreshLayout();
                    }
                }]
        });
    }

    _showSelection(): void {
        const cy = this.cy!;
        const node = cy.$("node:selected");
        const inLength = this.viewModel.getProperty("/inLength/value") as number;
        const outLength = this.viewModel.getProperty("/outLength/value") as number;

        const inElements = this._nodeInElements(node, inLength);
        const outElements = this._nodeOutElements(node, outLength);
        const path = cy.collection().merge(inElements).merge(outElements);

        cy.elements().removeClass("path not-path");
        path.addClass("path");
        cy.elements().not(path).not(node).addClass("not-path");

        // Refresh the layout only when the subgraph is shown
        const highlight = Boolean(this.viewModel.getProperty("/highlight"));
        if (!highlight) this._refreshLayout();
    }
}
