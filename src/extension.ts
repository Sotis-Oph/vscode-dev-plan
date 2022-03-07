// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { register_CreateDevPlan, register_CreateDevPlanTemplate } from './comands';
import { vscode_dev_plan_PlanEditor } from './planeditor'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Extension "vscode-dev-plan" is now active!');

	//	Register editors
	context.subscriptions.push(vscode_dev_plan_PlanEditor.register(context));

	//	Register commands
	context.subscriptions.push(register_CreateDevPlan());
	context.subscriptions.push(register_CreateDevPlanTemplate());
}

// this method is called when your extension is deactivated
export function deactivate() { }
