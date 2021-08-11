
'use strict';

import * as vscode from 'vscode';
const safeEval = require('safe-eval');

function processFormatWithIndex(format: string, index: number, vars: object) {
    const variableRegex = /\$\{(.+?)\}/g;
    const resultText = format.replace(variableRegex, (substring: string, variableString: string, offset: number) => {
        if (offset > 0 && format[offset - 1] === '$') {
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

function processFormat(format: string, count: number, vars: object) {
    let resultText = '';
    for (let i = 0; i < count; i++) {
        resultText += processFormatWithIndex(format, i, vars) + '\n';
    }
    return resultText;
}

export async function generateText() {
    // Get the active text editor
    const editor = vscode.window.activeTextEditor;

    if (editor) {
        const selection = editor.selection;

        const format = await vscode.window.showInputBox({
            title: "Input Format String",
            prompt: "Variable ${idx} means index"
        });
        let count = 1;
        if (format === undefined) {
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
                editBuilder.replace(selection, processFormat(format, count, {
                    sel: selectionString
                }));
            } catch (error) {
                vscode.window.showErrorMessage(error.message);
            }
        });
    }
}