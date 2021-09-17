import * as vscode from "vscode";
import { newGuid } from "./guid";

export class vscode_dev_plan_PlanEditor
	implements vscode.CustomTextEditorProvider {
	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new vscode_dev_plan_PlanEditor(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(
			vscode_dev_plan_PlanEditor.viewType,
			provider
		);
		return providerRegistration;
	}

	static readonly viewType = "vscode-dev-plan.PlanEditor";

	private guidNewLine: string = '';
	private setting = vscode.workspace.getConfiguration('vscode-dev-plan');

	constructor(private readonly context: vscode.ExtensionContext) { }

	/**
	 * Called when our custom editor is opened.
	 *
	 */
	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {
		
		// Setup initial content for the webview
		webviewPanel.webview.options = {
			enableScripts: true,
		};
		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
		
		function updateWebview(timeFormat:string, nawId = ''): void {
			webviewPanel.webview.postMessage({
				type: "update",
				text: document.getText(),
				nawId: nawId,
				timeFormat: timeFormat
			});
		}

		// Hook up event handlers so that we can synchronize the webview with the text document.
		//
		// The text document acts as our model, so we have to sync change in the document to our
		// editor and sync changes in the editor back to the document.
		//
		// Remember that a single text document can also be shared between multiple custom
		// editors (this happens for example when you split a custom editor)

		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
			(e) => {
				if (e.document.uri.toString() === document.uri.toString()) {
					updateWebview(this.setting.get('TimeFormat') ?? 'time', this.guidNewLine);
					this.guidNewLine = '';
				}
			}
		);

		// Make sure we get rid of the listener when our editor is closed.
		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});

		// Receive message from the webview.
		webviewPanel.webview.onDidReceiveMessage((e) => {
			switch (e.type) {
				case "add":
					this.addNewStep(document);
					return;

				case "delete":
					this.deleteStep(document, e.id);
					return;

				case "edit":
					this.editStep(document, e.field, e.value, e.id);
					return;

				case 'desc':
					this.editStep(document, 'description', 'new description', e.id);
					return;

				case "insert":
					this.insertStep(document, e.id);
					return;

				case "up":
					this.moveStep(document, e.id, e.type);
					return;

				case "down":
					this.moveStep(document, e.id, e.type);
					return;
			}
		});

		updateWebview(this.setting.get('TimeFormat') ?? 'time', this.guidNewLine);
		this.guidNewLine = '';
	}

	/**
	 * Get the static html used for the editor webviews.
	 */
	private getHtmlForWebview(webview: vscode.Webview): string {
		// Local path to script and css for the webview
		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(
				this.context.extensionUri,
				"media",
				"vscode_planeditor.js"
			)
		);

		const styleVSCodeUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, "media", "vscode.css")
		);

		const styleEditorUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, "media", "editor.css")
		);
		// Use a nonce to whitelist which scripts can be run
		const nonce = newGuid();

		return /* html */ `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				
                <meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleVSCodeUri}" rel="stylesheet" />
				<link href="${styleEditorUri}" rel="stylesheet" />

				<title>Dev plan</title>
			</head>
			<body>
				<div class="caption">
					<span>&#9839;</span>
					<span id="ticket" class="ticket"></span>
					<span> // </span>
					<span id="caption" class="caption"></span>
				</div>
				<table class="stepTable"></table>
				<div id="add-button" class="add-button">
					<button class="button">Add step</button>
				</div>
				<div id="description-container" class="description"></div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}

	private newItem = () => {
		this.guidNewLine = newGuid();
		return {
			id: this.guidNewLine,
			num: '',
			step: 'New step',
			planTime: 0,
			realTime: 0,
			done: false,
			description: '',
			subStep: [],
		}
	};

	private updateData(json: any) {
		const loop = (arr: Array<any>, num: string) => {
			if ((arr ?? []).length == 0) return;
			arr.forEach((el: any, pos: number) => {
				el.num = num + (pos + 1);
				loop(el.subStep, el.num + ".");
				if (el.subStep?.length) {
					el.done = el.subStep.every((elem: { done: any; }) => elem.done);
					el.planTime = 0;
					el.realTime = 0;
					el.subStep.forEach((elem:any) => {
						el.planTime += elem.planTime;
						el.realTime += elem.realTime;
					});
				}
			});
		};
		loop(json.stepTable, "");

		json.planTime = 0;
		json.realTime = 0;
		json.stepTable.forEach((elem:any) => {
			json.planTime += elem.planTime;
			json.realTime += elem.realTime;
		});
	}

	private addNewStep(document: vscode.TextDocument) {
		const json = this.getDocumentAsJson(document);
		json.stepTable = [
			...(Array.isArray(json.stepTable) ? json.stepTable : []),
			this.newItem(),
		];
		this.updateData(json);
		return this.updateTextDocument(document, json);
	}

	private insertStep(document: vscode.TextDocument, id: string) {
		const json = this.getDocumentAsJson(document);
		if (!Array.isArray(json.stepTable)) return;

		const insertEl = (el: any) => {
			if (el.id == id) {
				el.subStep = [
					...(Array.isArray(el.subStep) ? el.subStep : []),
					this.newItem(),
				];
				return;
			}
			el.subStep?.forEach(insertEl);
		};
		json.stepTable.forEach(insertEl);
		this.updateData(json);
		return this.updateTextDocument(document, json);
	}

	private moveStep(document: vscode.TextDocument, id: string, mov: string) {
		const json = this.getDocumentAsJson(document);
		if (!Array.isArray(json.stepTable)) return;

		const moveEl = (el: any, pos: number, arr: Array<any>) => {
			if (el.id == id) {
				if (arr.length > 1)
					if (mov == "up" && pos == 0) {
						arr.push(arr.splice(pos, 1)[0]);
					} else if (mov == "up" && pos > 0) {
						const movedItem = arr.splice(pos - 1, 2);
						movedItem.reverse();
						arr.splice(pos - 1, 0, movedItem[0], movedItem[1]);
					} else if (mov == "down" && pos < arr.length - 1) {
						const movedItem = arr.splice(pos, 2);
						movedItem.reverse();
						arr.splice(pos, 0, movedItem[0], movedItem[1]);
					} else if (mov == "down" && pos == arr.length - 1) {
						arr.unshift(arr.pop());
					}
				id = 'null';
				return;
			}
			el.subStep?.forEach(moveEl);
		};
		json.stepTable.forEach(moveEl);
		this.updateData(json);
		return this.updateTextDocument(document, json);
	}

	private deleteStep(document: vscode.TextDocument, id: string) {
		const json = this.getDocumentAsJson(document);
		if (!Array.isArray(json.stepTable)) return;

		const filterEl = (el: any) => {
			if (el.id == id) return false;
			el.subStep = el.subStep?.filter(filterEl) ?? [];
			return true;
		};
		json.stepTable = json.stepTable.filter(filterEl);
		this.updateData(json);
		return this.updateTextDocument(document, json);
	}

	private editStep(
		document: vscode.TextDocument,
		field: string,
		value: any,
		id: string
	) {
		const json = this.getDocumentAsJson(document);
		if (!Array.isArray(json.stepTable)) {
			return;
		}

		if (id == "")
			switch (field) {
				case "description":
					json.description = value;
					break;
				case "caption":
					json.caption = value;
					break;
				case "ticket":
					json.ticket = value;
				default:
					break;
			}
		else {
			const editEl = (el: any) => {
				if (el.id == id) {
					if ((field == 'planTime' || field == 'realTime') && typeof value === 'string') {
						if (/\d+\:\d\d/.test(value)) {
							let arr = value.split(/:/);
							value = parseInt(arr[0]) + parseInt(arr[1]) / 60;
						} else {
							value = parseFloat(value.replace(/,/g, '.'));
						};
					}
					el[field] = value;
					return;
				}
				el.subStep?.forEach(editEl);
			};
			json.stepTable.forEach(editEl);
		}
		this.updateData(json);
		return this.updateTextDocument(document, json);
	}

	private getDocumentAsJson(document: vscode.TextDocument): any {
		const text = document.getText();
		if (text.trim().length === 0) {
			return {};
		}

		try {
			return JSON.parse(text);
		} catch {
			throw new Error(
				"Could not get document as json. Content is not valid json"
			);
		}
	}

	private updateTextDocument(document: vscode.TextDocument, json: any) {
		const edit = new vscode.WorkspaceEdit();

		// Just replace the entire document every time for this example extension.
		// A more complete extension should compute minimal edits instead.
		edit.replace(
			document.uri,
			new vscode.Range(0, 0, document.lineCount, 0),
			JSON.stringify(json, null, 2)
		);

		return vscode.workspace.applyEdit(edit);
	}
}
