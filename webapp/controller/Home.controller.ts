import BaseController from "xref/controller/BaseController";
import DateFormat from "sap/ui/core/format/DateFormat";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Sorter from "sap/ui/model/Sorter";
import JSONModel from "sap/ui/model/json/JSONModel";
import VersionInfo from "sap/ui/VersionInfo";
import { InputType, ListMode, ListType } from "sap/m/library";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import type Button from "sap/m/Button";
import type { Button$PressEvent } from "sap/m/Button";
import type Dialog from "sap/m/Dialog";
import type Input from "sap/m/Input";
import type { Input$LiveChangeEvent } from "sap/m/Input";
import type { ListBase$DeleteEvent, ListBase$UpdateFinishedEvent } from "sap/m/ListBase";
import type { ListItemBase$PressEvent } from "sap/m/ListItemBase";
import type ResponsivePopover from "sap/m/ResponsivePopover";
import type Table from "sap/m/Table";
import type ViewSettingsDialog from "sap/m/ViewSettingsDialog";
import type { ViewSettingsDialog$ConfirmEvent } from "sap/m/ViewSettingsDialog";
import type { UploadSet$UploadCompletedEvent } from "sap/m/upload/UploadSet";
import type ListBinding from "sap/ui/model/ListBinding";
import type Context from "sap/ui/model/Context";
import type User from "xref/model/User";
import type Xrefs from "xref/model/Xrefs";
import type { Credentials, XrefItem } from "xref/model/types";

interface LoginData {
    credentials: Credentials;
    proceed: boolean;
}

/**
 * @namespace xref.controller
 */
export default class Home extends BaseController {
    // Models
    Xrefs: Xrefs;
    User: User;
    viewModel: JSONModel;

    // References to the dialogs
    loginDialog: Dialog;
    userDialog: ResponsivePopover;
    aboutDialog: Dialog;
    sortDialog: ViewSettingsDialog;

    async onAbout(): Promise<void> {
        if (this.aboutDialog) {
            this.aboutDialog.open();
            return;
        }

        const versionInfo = await VersionInfo.load() as { version: string; buildTimestamp: string };
        const buildTimestamp = DateFormat.getDateTimeInstance({ pattern: "yyyyMMddHHmm" }).parse(versionInfo.buildTimestamp) as Date;

        const viewModel = new JSONModel({
            appVersion: this.getOwnerComponent().getManifestEntry("/sap.app/applicationVersion/version") as string,
            sapVersion: `${versionInfo.version} (${DateFormat.getDateInstance({ style: "medium" }).format(buildTimestamp)})`
        });

        const aboutDialog = this.byId("aboutDialog") as Dialog;
        aboutDialog.setModel(viewModel).open();
        this.aboutDialog = aboutDialog;
    }

    onAboutClose(): void {
        this.aboutDialog.close();
    }

    onInit(): void {
        // Initialize the view model
        this.viewModel = new JSONModel({
            uploadUrl: this.getOwnerComponent().XrefsModel.URI,
            authorization: null,
            action: {
                login: true,
                logout: false,
                upload: false,
                display: false,
                edit: false
            },
            table: {
                count: 0,
                mode: ListMode.None,
                system: {
                    value: "",
                    items: [{ key: "", text: "" }]
                },
                search: ""
            },
            columnListItem: {
                type: ListType.Navigation
            }
        });
        this.getView()!.setModel(this.viewModel, "view");

        // Initialize the xrefs model
        this.Xrefs = this.getOwnerComponent().XrefsModel;
        this.Xrefs.attachRequestSent(() => this.getTable().setBusy(true));
        this.Xrefs.attachRequestCompleted(() => this.getTable().setBusy(false));
        this.Xrefs.load()
            .then((xrefs) => this._initSystems(xrefs))
            .catch(({ message }: Error) => MessageBox.error(message));

        // User model
        this.User = this.getOwnerComponent().UserModel;
    }

    onDisplay(): void {
        this._setEditMode(false);
    }

    onEdit(): void {
        this._setEditMode();
    }

    onItemDelete(event: ListBase$DeleteEvent): void {
        const context = event.getParameter("listItem")!.getBindingContext(this.Xrefs.ID) as Context;
        const { id, type, name } = context.getObject() as XrefItem;
        const text = `Delete item "${type.toLowerCase()} ${name}"?`;

        MessageBox.warning(text, {
            title: "Delete",
            actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.DELETE,
            onClose: (action: string | null) => {
                if (action !== MessageBox.Action.DELETE) return;
                this.Xrefs.delete(id)
                    .then(() => MessageToast.show("Item was deleted successfully"))
                    .catch(({ message }: Error) => MessageBox.error(message));
            }
        });
    }

    onItemPress(event: ListItemBase$PressEvent): void {
        const itemBinding = event.getSource().getBindingContext(this.Xrefs.ID) as Context;
        const id = itemBinding.getProperty("id") as string;
        this.getRouter().navTo("Details", { id });
    }

    onLogin(): void {
        if (this.loginDialog) {
            this.loginDialog.open();
            return;
        }

        const viewModel = new JSONModel({
            credentials: {
                email: null,
                password: null
            },
            proceed: false
        } satisfies LoginData);

        void this.loadFragment({ name: "xref.view.fragment.Login" })
            .then(fragment => {
                const dialog = fragment as Dialog;
                dialog.setModel(viewModel).open();
                this.loginDialog = dialog;
            });
    }

    onLoginCancel(): void {
        this.loginDialog.close();
        this.getLoginModel().setProperty("/credentials/password", null);
        this.getLoginModel().setProperty("/proceed", false);
    }

    onLoginCheckInput(event: Input$LiveChangeEvent): void {
        let { credentials: { email, password } } = this.getLoginModel().getData() as LoginData;

        // Current screen value (model isn't updated yet)
        if (event.getSource<Input>().getType() === InputType.Password) {
            password = event.getParameter("value") ?? null;
        } else {
            email = event.getParameter("value") ?? null;
        }
        this.getLoginModel().setProperty("/proceed", !!email && !!password);
    }

    onLoginConfirm(): void {
        const { credentials } = this.getLoginModel().getData() as LoginData;

        this.loginDialog.setBusy(true);
        this.User.login(credentials)
            .finally(() => {
                this.loginDialog.setBusy(false);
                this.getLoginModel().setProperty("/credentials/password", null);
            })
            .then(ok => {
                if (ok) {
                    MessageToast.show(`Welcome ${this.User.getProperty("/name")}`);
                    this.loginDialog.close();
                    this.viewModel.setProperty("/action/login", false);
                    this.viewModel.setProperty("/action/logout", true);
                    this.viewModel.setProperty("/action/upload", true);
                    this.viewModel.setProperty("/action/edit", true);
                } else {
                    MessageBox.error("Incorrect credentials");
                }
            })
            .catch(({ message }: Error) => MessageBox.error(message));
    }

    onLogout(): void {
        const view = this.getView()!;
        view.setBusy(true);
        this.User.logout()
            .finally(() => view.setBusy(false))
            .then(() => {
                this._setEditMode(false);
                this.viewModel.setProperty("/action/login", true);
                this.viewModel.setProperty("/action/logout", false);
                this.viewModel.setProperty("/action/upload", false);
                this.viewModel.setProperty("/action/edit", false);
                MessageToast.show("Successfully signed out");
            })
            .catch(({ message }: Error) => MessageBox.error(message));
    }

    onSearch(): void {
        this._filterItems();
    }

    onSort(): void {
        if (this.sortDialog) {
            this.sortDialog.open();
            return;
        }

        void this.loadFragment({ name: "xref.view.fragment.Sort" })
            .then(fragment => {
                const dialog = fragment as ViewSettingsDialog;
                dialog.open();
                this.sortDialog = dialog;
            });
    }

    onSortConfirm(event: ViewSettingsDialog$ConfirmEvent): void {
        const { sortItem, sortDescending } = event.getParameters();
        const sorters = [new Sorter(sortItem!.getKey(), sortDescending)];

        // Secundairy sort by name
        if (sortItem!.getKey() !== "name") {
            sorters.push(new Sorter("name", sortDescending));
        }

        this.getTableBinding().sort(sorters);
    }

    onSystemChange(): void {
        this._filterItems();

        // Save the last selected system
        localStorage.setItem("system", this.viewModel.getProperty("/table/system/value") as string);
    }

    onUpdateFinished(event: ListBase$UpdateFinishedEvent): void {
        // Fires after items binding is updated
        this.viewModel.setProperty("/table/count", event.getParameter("total"));
    }

    onUpload(event: Button$PressEvent): void {
        this.viewModel.setProperty("/authorization", "Bearer " + this.User.token);
        const button = event.getSource<Button>();
        (this.byId("uploadDialog") as ResponsivePopover).openBy(button);
    }

    onUploadCompleted(event: UploadSet$UploadCompletedEvent): void {
        const { status, response } = event.getParameters();
        if (status === 201) {
            MessageToast.show("Upload Completed");
            void this.Xrefs.load();
        } else {
            MessageBox.error("Upload failed", { details: response });
        }
    }

    onUser(event: Button$PressEvent): void {
        const button = event.getSource<Button>();
        (this.byId("userDialog") as ResponsivePopover).openBy(button);
    }

    private getLoginModel(): JSONModel {
        return this.loginDialog.getModel() as JSONModel;
    }

    private getTable(): Table {
        return this.byId("table") as Table;
    }

    private getTableBinding(): ListBinding {
        return this.getTable().getBinding("items") as ListBinding;
    }

    _filterItems(): void {
        const filters: Filter[] = [];

        const system = this.viewModel.getProperty("/table/system/value") as string;
        if (system) {
            filters.push(new Filter("system", FilterOperator.EQ, system));
        }

        const search = this.viewModel.getProperty("/table/search") as string;
        if (search) {
            filters.push(new Filter({
                filters: [
                    new Filter("type", FilterOperator.Contains, search),
                    new Filter("name", FilterOperator.Contains, search),
                    new Filter("system", FilterOperator.Contains, search)
                ],
                and: false
            }));
        }

        this.getTableBinding().filter(filters);
    }

    _initSystems(xrefs: XrefItem[]): void {
        // Unique list of systems
        const systems = [...new Set(xrefs.map(xref => xref.system))];
        const items = ["", ...systems].map(system => ({ key: system, text: system }));
        this.viewModel.setProperty("/table/system/items", items);

        // Restore the last selected system
        const system = localStorage.getItem("system");
        if (system) {
            this.viewModel.setProperty("/table/system/value", system);
            this._filterItems();
        }
    }

    _setEditMode(on = true): void {
        this.viewModel.setProperty("/action/display", on);
        this.viewModel.setProperty("/action/edit", !on);
        this.viewModel.setProperty("/table/mode", (on) ? ListMode.Delete : ListMode.None);
        this.viewModel.setProperty("/columnListItem/type", (on) ? ListType.Inactive : ListType.Navigation);
    }
}
