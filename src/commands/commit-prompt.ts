// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as vscode from 'vscode';
import { JjService } from '../jj-service';
import { JjScmProvider } from '../jj-scm-provider';
import { getErrorMessage } from './command-utils';

export async function commitPromptCommand(scmProvider: JjScmProvider, jj: JjService) {
    // Determine the default value for the prompt
    const inputBoxValue = scmProvider.sourceControl.inputBox.value;
    const defaultValue = inputBoxValue || (await jj.getDescription('@'));

    // Always show the prompt, pre-filled with either the input box value or current description
    const input = await vscode.window.showInputBox({
        prompt: 'Commit message',
        placeHolder: 'Description of the change...',
        value: defaultValue,
    });

    if (input === undefined) {
        // User cancelled
        return;
    }

    const message = input;

    try {
        if (message) {
            // Non-empty message: commit with the message
            await jj.commit(message);
        } else {
            // Empty message: create a new change, leaving the current commit with empty description
            await jj.new();
        }
        scmProvider.sourceControl.inputBox.value = '';
        vscode.window.showInformationMessage('Committed change');
        await scmProvider.refresh({ reason: 'after commit' });
    } catch (err: unknown) {
        vscode.window.showErrorMessage(`Error committing change: ${getErrorMessage(err)}`);
    }
}
