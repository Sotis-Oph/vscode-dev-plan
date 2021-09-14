// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {vscode_dev_plan_PlanEditor} from './planeditor'
import { writeFile } from 'fs';
import { newGuid } from './guid';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Extension "vscode-dev-plan" is now active!');
	
	const setting = vscode.workspace.getConfiguration('vscode-dev-plan');
	const defPath:string|undefined = setting.get('PathToPlans');

	context.subscriptions.push(vscode_dev_plan_PlanEditor.register(context));
	
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('vscode-dev-plan.CreateDevPlan', async () => {
		
		if (defPath === undefined || defPath?.length == 0) {
			vscode.window.showInformationMessage('vsCode Dev-plan not set path to plan ');
			return;
		};
		let uri = vscode.Uri.parse(defPath);
		const iBoxOption = {
			ignoreFocusOut: true,
			prompt: 'Enter the Planname',
			title: 'Planname',
			value: 'NewPlan'
		};
		const PlanName = await vscode.window.showInputBox(iBoxOption);
		if (PlanName === undefined) return;
		uri = vscode.Uri.joinPath(uri, PlanName.replace(/\s+/g, '_') + '.devplan');
		const newItem = {id:newGuid(),num:1,step:'Planning',planTime:0,realTime:0,done:false,description:'Planning primarily'};
		const DefStruct = {
			caption:PlanName,
			ticket:'',
			stepTable:[newItem],
			planTime:0,
			realTime:0,
			description:'Specify the description of the development'
		};
		
		writeFile(uri.fsPath, 
			JSON.stringify(DefStruct), 
			{encoding:'utf-8'},
			()=>{
				vscode.commands.executeCommand('vscode.openWith', uri, vscode_dev_plan_PlanEditor.viewType);
			});
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
