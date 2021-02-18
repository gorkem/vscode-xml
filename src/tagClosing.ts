/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *
 *  Retrieved from: https://github.com/Microsoft/vscode/blob/f707828426bd87e88c17d2da34f2ceed0019d8bd/extensions/html-language-features/client/src/tagClosing.ts
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { window, workspace, Disposable, TextDocumentContentChangeEvent, TextDocument, Position, SnippetString, Range } from 'vscode';

export interface AutoCloseResult {
  snippet: string,
  range?: Range
}

export function activateTagClosing(tagProvider: (document: TextDocument, position: Position) => Thenable<AutoCloseResult>, supportedLanguages: { [id: string]: boolean }, configName: string): Disposable {
	const TRIGGER_CHARACTERS = ['>', '/'];
	let disposables: Disposable[] = [];
	workspace.onDidChangeTextDocument(event => onDidChangeTextDocument(event.document, event.contentChanges), null, disposables);

	let isEnabled = false;
	updateEnabledState();
	window.onDidChangeActiveTextEditor(updateEnabledState, null, disposables);

	let timeout: NodeJS.Timer | undefined = void 0;

	function updateEnabledState() {
		isEnabled = false;
		let editor = window.activeTextEditor;
		if (!editor) {
			return;
		}
		let document = editor.document;
		if (!supportedLanguages[document.languageId]) {
			return;
		}
		if (!workspace.getConfiguration().get<boolean>(configName)) {
			return;
		}
		isEnabled = true;
	}

	function onDidChangeTextDocument(document: TextDocument, changes: ReadonlyArray<TextDocumentContentChangeEvent>) {
		if (!isEnabled) {
			return;
		}
		let activeDocument = window.activeTextEditor && window.activeTextEditor.document;
		if (document !== activeDocument || changes.length === 0) {
			return;
		}
		if (typeof timeout !== 'undefined') {
			clearTimeout(timeout);
		}
		let lastChange = changes[changes.length - 1];
		let lastCharacter = lastChange.text[lastChange.text.length - 1];
		if (lastChange.rangeLength > 0 || lastChange.text.length > 1 || TRIGGER_CHARACTERS.indexOf(lastCharacter) < 0) {
			return;
		}
		let rangeStart = lastChange.range.start;
		let version = document.version;
		timeout = setTimeout(() => {
			let position = new Position(rangeStart.line, rangeStart.character + lastChange.text.length);
			tagProvider(document, position).then(result => {
				if (!result) {
					return;
				}
				let text = result.snippet;
				let replaceLocation : Position | Range;
				let range : Range = result.range;
				if(range != null) {
					// re-create Range
					let line = range.start.line;
					let character = range.start.character;
					let startPosition = new Position(line, character);
					line = range.end.line;
					character = range.end.character;
					let endPosition = new Position(line, character);
					replaceLocation = new Range(startPosition, endPosition);
				}
				else {
					replaceLocation = position;
				}
				if (text && isEnabled) {
					let activeEditor = window.activeTextEditor;
					if (activeEditor) {
						let activeDocument = activeEditor.document;
						if (document === activeDocument && activeDocument.version === version) {
							activeEditor.insertSnippet(new SnippetString(text), replaceLocation);
						}
					}
				}
			}, (reason: any) => {
				console.log('xml/closeTag request has been cancelled');
			});
			timeout = void 0;
		}, 100);
	}
	return Disposable.from(...disposables);
}