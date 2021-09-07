
'use strict';

import * as vscode from 'vscode';
const safeEval = require('safe-eval');

function indexOfBracesMatch(text: string, start: number) {
    let match = 1;
    let pos = start;
    while (match > 0 && pos < text.length) {
        if (text[pos] === "{") {
            match++;
        } else if (text[pos] === "}") {
            match--;
        }
        pos++;
    }
    if (match === 0) {
        return pos;
    } else {
        return -1;
    }
}

function processTemplateWithIndex(template: string, index: number, vars: object) {
    let resultText = '';
    let currentIndex = 0;
    while (currentIndex >= 0) {
        const preIndex = currentIndex;
        currentIndex = template.indexOf('${', currentIndex);
        if (currentIndex < 0) {
            resultText += template.substring(preIndex);
            break;
        }
        resultText += template.substring(preIndex, currentIndex);
        if (currentIndex > 0 && template[currentIndex - 1] === '\\') {
            // use \${} to escape
            currentIndex = currentIndex + 2;
            continue;
        }
        const end = indexOfBracesMatch(template, currentIndex + 2);
        if (end === -1) {
            throw new Error("Braces not match");
        }
        const expression = template.substring(currentIndex + 2, end - 1);
        resultText += safeEval(expression, {
            idx: index,
            ...vars
        });
        currentIndex = end;
    }
    return resultText;
}

function processTemplate(template: string, count: number, vars: object) {
    let resultText = '';
    for (let i = 0; i < count; i++) {
        resultText += processTemplateWithIndex(template, i, vars) + '\n';
    }
    return resultText;
}

export async function generateTextWithTemplate(context: vscode.ExtensionContext) {
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

const LAST_JS_EXPRESSION_KEY = "lastJSExpression";

export async function generateTextWithJSExpression(context: vscode.ExtensionContext) {
    // Get the active text editor
    const editor = vscode.window.activeTextEditor;

    if (editor) {
        const selection = editor.selection;

        const globalState = context.globalState;
        const expression = await vscode.window.showInputBox({
            title: "Input JS Expression",
            value: globalState.get(LAST_JS_EXPRESSION_KEY)
        });
        if (expression === undefined) {
            return;
        }
        globalState.update(LAST_JS_EXPRESSION_KEY, expression);
        const document = editor.document;
        const selectionString = document.getText(selection);

        editor.edit(editBuilder => {
            try {
                const resultText = safeEval(expression, {
                    sel: selectionString
                });
                editBuilder.replace(selection, resultText);
            } catch (error) {
                vscode.window.showErrorMessage(error.message);
            }
        });
    }
}