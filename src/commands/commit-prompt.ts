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
import { commitCommand } from './commit';

export async function commitPromptCommand(scmProvider: JjScmProvider, jj: JjService) {
    let message = scmProvider.sourceControl.inputBox.value;

    if (!message) {
        // Input box is empty, prompt the user
        const currentDescription = await jj.getDescription('@');
        const input = await vscode.window.showInputBox({
            prompt: 'Commit message',
            placeHolder: 'Description of the change...',
            value: currentDescription,
        });

        if (input === undefined) {
            // User cancelled
            return;
        }
        message = input;
        
        // Temporarily set the input box value so commitCommand can use it
        // This reuses the existing logic in commitCommand (which handles empty checks, refreshing, etc)
        // AND keeps the UI consistent (showing the message in the box before it "sent")
        scmProvider.sourceControl.inputBox.value = message;
    }

    // Now delegate to the standard commit command which expects the input box to be populated
    await commitCommand(scmProvider, jj);
}
