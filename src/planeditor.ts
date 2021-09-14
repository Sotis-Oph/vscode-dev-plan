import { join } from 'path';
import * as vscode from 'vscode';
import { newGuid } from './guid';

export class vscode_dev_plan_PlanEditor implements vscode.CustomTextEditorProvider {

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new vscode_dev_plan_PlanEditor(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(vscode_dev_plan_PlanEditor.viewType, provider);
		return providerRegistration;
	}

	static readonly viewType = 'vscode-dev-plan.PlanEditor';
	
	constructor(
		private readonly context: vscode.ExtensionContext
	) { }

	/**
	 * Called when our custom editor is opened.
	 * 
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

		function updateWebview() {
			webviewPanel.webview.postMessage({
				type: 'update',
				text: document.getText(),
			});
		}

		// Hook up event handlers so that we can synchronize the webview with the text document.
		//
		// The text document acts as our model, so we have to sync change in the document to our
		// editor and sync changes in the editor back to the document.
		// 
		// Remember that a single text document can also be shared between multiple custom
		// editors (this happens for example when you split a custom editor)
		
		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				updateWebview();
			}
		});

		// Make sure we get rid of the listener when our editor is closed.
		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});

		// Receive message from the webview.
		webviewPanel.webview.onDidReceiveMessage(e => {
			switch (e.type) {
				case 'add':
					this.addNewStep(document);
					return;

				case 'delete':
					this.deleteStep(document, e.id);
					return;

				case 'edit':
					this.editStep(document, e.field, e.value ,e.id)
					return;

				case 'insert':
					this.insertStep(document, e.id)
					return;

				case 'up':
					this.moveStep(document, e.id, e.type)
					return;

				case 'down':
					this.moveStep(document, e.id, e.type)
					return;
			}
		});

		updateWebview();
	}

	/**
	 * Get the static html used for the editor webviews.
	 */
	private getHtmlForWebview(webview: vscode.Webview): string {
		// Local path to script and css for the webview
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this.context.extensionUri, 'media', 'vscode_planeditor.js'));

		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this.context.extensionUri, 'media', 'vscode.css'));
        
		const styleEditorUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this.context.extensionUri, 'media', 'editor.css'));
        // Use a nonce to whitelist which scripts can be run
		const nonce = newGuid();
        
		return /* html */`
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
					<span id="caption"></span>
				</div>
				<table class="stepTable">
				</table>
				<div class="add-button">
					<button>Add step</button>
				</div>
				<div id="description-container" class="description-container"></div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
	
	private updateData(json:any) {
		let num = 1;
		json.planTime = 0;
		json.realTime = 0;
		json.stepTable.forEach((element: any) => {
			element.num = num;
			num += 1;
			json.planTime += Number.parseFloat(element.planTime);
			json.realTime += Number.parseFloat(element.realTime);
		});
	}

	/**
	 * Add a new scratch to the current document.
	 */
	private addNewStep(document: vscode.TextDocument) {
		const json = this.getDocumentAsJson(document);
        const step_id = newGuid();

		json.stepTable = [
			...(Array.isArray(json.stepTable) ? json.stepTable : []),
			{id:step_id,num:''.toString(),step:'New step',planTime:0,realTime:0,done:false,description:'description'}
		];
		this.updateData(json);
		return this.updateTextDocument(document, json);
	}

	private insertStep(document: vscode.TextDocument, id: string) {
		
		const json = this.getDocumentAsJson(document);
        if (!Array.isArray(json.stepTable)) {
			return;
		}

		let index = null;
		const newItem = {id:newGuid(),num:''.toString(),step:'New step',planTime:0,realTime:0,done:false,description:'description'};
		json.stepTable.forEach((el:any) => {if (el.id == id) index = json.stepTable.indexOf(el)});
		if (index != null) {
			json.stepTable.splice(index + 1, 0, newItem)
		}
		this.updateData(json);
		return this.updateTextDocument(document, json);
	}

	private moveStep(document: vscode.TextDocument, id: string, mov:string) {
		
		const json = this.getDocumentAsJson(document);
        if (!Array.isArray(json.stepTable)) {
			return;
		}

		let index = null;
		json.stepTable.forEach((el:any) => {if (el.id == id) index = json.stepTable.indexOf(el)});
		if (index != null && json.stepTable.length > 1) {
			
			if (mov == 'up' && index == 0){
				const movedItem = json.stepTable.splice(index, 1)[0];
				json.stepTable.push(movedItem);
			} else if (mov == 'up' && index > 0){
				const movedItem = json.stepTable.splice(index - 1, 2);
				movedItem.reverse();
				json.stepTable.splice(index - 1, 0, movedItem[0], movedItem[1]);
			} else if (mov == 'down' && index < json.stepTable.length - 1){
				const movedItem = json.stepTable.splice(index, 2);
				movedItem.reverse();
				json.stepTable.splice(index, 0, movedItem[0], movedItem[1]);
			} else if (mov == 'down' && index == json.stepTable.length - 1){
				const movedItem = json.stepTable.pop();
				json.stepTable.unshift(movedItem);
			};
			
		}
		this.updateData(json);
		return this.updateTextDocument(document, json);
	}

	/**
	 * Delete an existing scratch from a document.
	 */
	private deleteStep(document: vscode.TextDocument, id: string) {
		const json = this.getDocumentAsJson(document);
		if (!Array.isArray(json.stepTable)) {
			return;
		}

		json.stepTable = json.stepTable.filter((note: any) => note.id !== id);
		this.updateData(json);
		return this.updateTextDocument(document, json);

	}

	private editStep(document: vscode.TextDocument, field:string, value:any, Id:string){
		
		const json = this.getDocumentAsJson(document);
		if (Id == '' && field == 'description'){
			json.description = value;
		} else if (Id == '' && field == 'caption') {
			json.caption = value;
		} else if (Id == '' && field == 'ticket') {
			json.ticket = value;
		} else {

			if (!Array.isArray(json.stepTable)) {
				return;
			}

			json.stepTable.forEach((element:any) => {
				if (element.id == Id){
					element[field] = value
				}
			});
		};
		this.updateData(json);
		return this.updateTextDocument(document, json);
	}

	/**
	 * Try to get a current document as json text.
	 */
	private getDocumentAsJson(document: vscode.TextDocument): any {
		const text = document.getText();
		if (text.trim().length === 0) {
			return {};
		}

		try {
			return JSON.parse(text);
		} catch {
			throw new Error('Could not get document as json. Content is not valid json');
		}
	}

	/**
	 * Write out the json to a given document.
	 */
	private updateTextDocument(document: vscode.TextDocument, json: any) {
		const edit = new vscode.WorkspaceEdit();

		// Just replace the entire document every time for this example extension.
		// A more complete extension should compute minimal edits instead.
		edit.replace(
			document.uri,
			new vscode.Range(0, 0, document.lineCount, 0),
			JSON.stringify(json, null, 2));

		return vscode.workspace.applyEdit(edit);
	}
}
