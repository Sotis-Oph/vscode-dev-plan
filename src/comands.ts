import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { TextDecoder } from 'util';
import * as vscode from 'vscode';
import { uuid_v4 } from './guid';
import { vscode_dev_plan_PlanEditor } from './planeditor';

export function register_CreateDevPlan() {
    return vscode.commands.registerCommand('vscode-dev-plan.CreateDevPlan', async () => {

        const setting = vscode.workspace.getConfiguration('vscode-dev-plan');
        const defPath: string | undefined = setting.get('PathToPlans');

        if (defPath === undefined || defPath?.length == 0) {
            vscode.window.showInformationMessage('vsCode Dev-plan not set path to plan ');
            return;
        };
        const PlanName = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            prompt: 'Enter the Planname',
            title: 'Planname',
            value: 'NewPlan'
        });
        if (PlanName === undefined) return;

        const fileName = PlanName.replace(/\s+/g, '_') + '.devplan';

        let uri = vscode.Uri.parse(defPath);
        uri = vscode.Uri.joinPath(uri, fileName);

        if (existsSync(uri.fsPath)) {
            vscode.commands.executeCommand('vscode.openWith', uri, vscode_dev_plan_PlanEditor.viewType);
            vscode.window.showInformationMessage('Open exists file: ' + fileName);
            return;
        }

        const template: string[] | undefined = setting.get('PlanTemplate');

        let snippet: string | undefined = 'default';
        if (template && template?.length) {
            if (template.indexOf('default') == -1) template.push('default');
            snippet = await vscode.window.showQuickPick(template,
                {
                    ignoreFocusOut: true,
                    title: 'Choice template',
                    placeHolder: 'Leave empty for standard template',

                });
        };

        uri = vscode.Uri.joinPath(vscode.Uri.from({
            scheme: 'untitled',
            path: defPath,
        }), fileName);

        vscode.workspace.openTextDocument(uri).then(
            document => {
                const wsEdit = new vscode.WorkspaceEdit();
                const edits = wsEdit.get(document.uri);
                edits.push(vscode.TextEdit.insert(document.positionAt(0), getDefaultStructure(snippet, PlanName)));
                wsEdit.set(document.uri, edits);
                vscode.workspace.applyEdit(wsEdit);
            }
        );

    });

}

export function register_CreateDevPlanTemplate() {
    return vscode.commands.registerCommand('vscode-dev-plan.CreateDevPlanTemplate', async () => {

        const setting = vscode.workspace.getConfiguration('vscode-dev-plan');
        const defPath: string | undefined = setting.get('PathToPlans');

        if (defPath === undefined || defPath?.length == 0) {
            vscode.window.showInformationMessage('vsCode Dev-plan not set path to plan ');
            return;
        };
        const PlanName = await vscode.window.showInputBox({
            ignoreFocusOut: true,
            prompt: 'Enter the Template Planname',
            title: 'Template Planname',
            value: 'NewTemplate'
        });
        if (PlanName === undefined) return;

        const fileName = PlanName.replace(/\s+/g, '_') + '.template_devplan';

        let uri = vscode.Uri.parse(defPath);
        uri = vscode.Uri.joinPath(uri, 'template');
        if (!existsSync(uri.fsPath)){
            vscode.workspace.fs.createDirectory(uri);
        };
        uri = vscode.Uri.joinPath(uri, fileName);

        if (existsSync(uri.fsPath)) {
            vscode.commands.executeCommand('vscode.openWith', uri, vscode_dev_plan_PlanEditor.viewType);
            vscode.window.showInformationMessage('Open exists file: ' + fileName);
            return;
        }

        uri = vscode.Uri.joinPath(vscode.Uri.from({
            scheme: 'untitled',
            path: defPath,
        }), 'template', fileName);

        vscode.workspace.openTextDocument(uri).then(
            document => {
                const wsEdit = new vscode.WorkspaceEdit();
                const edits = wsEdit.get(document.uri);
                edits.push(vscode.TextEdit.insert(document.positionAt(0), getDefaultStructure('default', PlanName)));
                wsEdit.set(document.uri, edits);
                vscode.workspace.applyEdit(wsEdit);
            }
        );

    });

}

type t_stetTable = { id: string; num: string; step: string; planTime: number; realTime: number; done: boolean; description: string; subStep: t_stetTable; }[];

function getDefaultStructure(snippet: string | undefined, PlanName: string): string {
    let ticket = '';
    let name = PlanName;
    const regExpTicket = /^\s*#\d+\s+/;
    if (regExpTicket.test(PlanName)) {
        let arr = regExpTicket.exec(PlanName);
        if (arr != null) ticket = arr[0].replace(/#/g, '').trim();
        name = PlanName.replace(regExpTicket, '');
    }
    let step: t_stetTable = [];
    if (snippet == 'default' || snippet == undefined || snippet == '') {
        step.push({
            id: '',
            num: '1',
            step: 'Planning',
            planTime: 0,
            realTime: 0,
            done: false,
            description: 'Planning primarily',
            subStep: []
        });
    } else {
        GetSnippet(snippet).forEach(val => step.push(val))
    }

    const loop = (value: any) => {
        if (Object.keys(value).indexOf('id') != -1)
            value.id = uuid_v4();
        if (value.subStep?.length)
            value.subStep.forEach(loop);
    };

    step.forEach(loop);
    return JSON.stringify({
        caption: name,
        ticket: ticket,
        stepTable: step,
        planTime: 0,
        realTime: 0,
        description: 'Specify the description of the development'
    });
}

function GetSnippet(name: string): t_stetTable {

    const setting = vscode.workspace.getConfiguration('vscode-dev-plan');
    const defPath: string | undefined = setting.get('PathToPlans');

    if (defPath === undefined || defPath?.length == 0) {
        vscode.window.showInformationMessage('vsCode Dev-plan not set path to plan ');
        return [];
    };

    let uri = vscode.Uri.parse(defPath);
    uri = vscode.Uri.joinPath(uri, 'template', name + '.template_devplan');

    try {
        const buf = readFileSync(uri.fsPath);
        const value = JSON.parse(new TextDecoder().decode(buf));
        return (value ?? { stepTable: [] }).stepTable;
    } catch (error) {
        vscode.window.showInformationMessage(`Not found template file ${name}.template_devplan`)
        return []
    }

}