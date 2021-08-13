
'use strict';

import * as vscode from 'vscode';
const safeEval = require('safe-eval');

function processTemplateWithIndex(template: string, index: number, vars: object) {
    const variableRegex = /\$\{(.+?)\}/g;
    const resultText = template.replace(variableRegex, (substring: string, variableString: string, offset: number) => {
        if (offset > 0 && template[offset - 1] === '$') {
            // use $${} to escape
            return '{' + variableString + '}';
        }
        return safeEval(variableString, {
            idx: index,
            ...vars
        });
    });
    return resultText;
}

function processTemplate(template: string, count: number, vars: object) {
    let resultText = '';
    for (let i = 0; i < count; i++) {
        resultText += processTemplateWithIndex(template, i, vars) + '\n';
    }
    return resultText;
}

export async function generateText() {
    // Get the active text editor
    const editor = vscode.window.activeTextEditor;

    if (editor) {
        const selection = editor.selection;

        const template = await vscode.window.showInputBox({
            title: "Input Template String",
            prompt: "Variable ${idx} means 0-based index"
        });
        let count = 1;
        if (template === undefined) {
            return;
        }
        const countStr = await vscode.window.showInputBox({
            title: "Count"
        });
        if (countStr) {
            count = parseInt(countStr);
        }
        const document = editor.document;
        const selectionString = document.getText(selection);

        editor.edit(editBuilder => {
            try {
                editBuilder.replace(selection, processTemplate(template, count, {
                    sel: selectionString
                }));
            } catch (error) {
                vscode.window.showErrorMessage(error.message);
            }
        });
    }
}