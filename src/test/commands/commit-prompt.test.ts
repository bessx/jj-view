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

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMock } from '../test-utils';
import { commitPromptCommand } from '../../commands/commit-prompt';
import { JjService } from '../../jj-service';
import { JjScmProvider } from '../../jj-scm-provider';
import { TestRepo } from '../test-repo';
import * as vscode from 'vscode';

vi.mock('vscode', () => ({
    window: {
        showInformationMessage: vi.fn(),
        showErrorMessage: vi.fn(),
        showWarningMessage: vi.fn(),
        showInputBox: vi.fn(),
    },
}));

describe('commitPromptCommand', () => {
    let repo: TestRepo;
    let jj: JjService;
    let scmProvider: JjScmProvider;

    beforeEach(() => {
        repo = new TestRepo();
        repo.init();
        jj = new JjService(repo.path);

        scmProvider = createMock<JjScmProvider>({
            refresh: vi.fn(),
            sourceControl: createMock<vscode.SourceControl>({
                inputBox: createMock<vscode.SourceControlInputBox>({
                    value: '',
                }),
            }),
        });
    });

    afterEach(() => {
        repo.dispose();
        vi.clearAllMocks();
    });

    test('prompts if input box is empty and commits with user input', async () => {
        const inputBoxMock = scmProvider.sourceControl.inputBox;
        inputBoxMock.value = '';
        
        // Mock existing description
        repo.new(undefined, 'initial');
        await jj.describe('existing description', '@');
        
        // Mock user input
        vi.mocked(vscode.window.showInputBox).mockResolvedValue('new description');

        await commitPromptCommand(scmProvider, jj);

        expect(vscode.window.showInputBox).toHaveBeenCalledWith({
            prompt: 'Commit message',
            placeHolder: 'Description of the change...',
            value: 'existing description',
        });

        // Check that commit happened
        const parentId = repo.getParents('@')[0];
        const parentDesc = repo.getDescription(parentId);
        expect(parentDesc.trim()).toBe('new description');
        
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Committed change');
    });

    test('does nothing if user cancels prompt', async () => {
        const inputBoxMock = scmProvider.sourceControl.inputBox;
        inputBoxMock.value = '';
        
        // Mock existing description
        await jj.describe('existing', '@');

        // Mock user cancellation
        vi.mocked(vscode.window.showInputBox).mockResolvedValue(undefined);

        await commitPromptCommand(scmProvider, jj);

        expect(vscode.window.showInputBox).toHaveBeenCalled();
        // Should NOT have committed
        // The description of @ should still be 'existing' (no new commit created)
        const desc = repo.getDescription('@');
        expect(desc.trim()).toBe('existing');
        expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    test('commits immediately if input box has text', async () => {
        repo.new(undefined, 'initial');
        const inputBoxMock = scmProvider.sourceControl.inputBox;
        inputBoxMock.value = 'feat: quick commit';
        
        await commitPromptCommand(scmProvider, jj);

        expect(vscode.window.showInputBox).not.toHaveBeenCalled();

        // Check that commit happened
        const parentId = repo.getParents('@')[0];
        const parentDesc = repo.getDescription(parentId);
        expect(parentDesc.trim()).toBe('feat: quick commit');

        expect(scmProvider.sourceControl.inputBox.value).toBe('');
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Committed change');
    });
});
