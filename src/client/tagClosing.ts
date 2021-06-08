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

  const disposables: Disposable[] = [];
  workspace.onDidChangeTextDocument(event => onDidChangeTextDocument(event.document, event.contentChanges), null, disposables);

  let isEnabled = false;
  updateEnabledState();
  window.onDidChangeActiveTextEditor(updateEnabledState, null, disposables);

  let timeout: NodeJS.Timer | undefined = undefined;

  function updateEnabledState() {
    isEnabled = false;
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }
    const document = editor.document;
    if (!supportedLanguages[document.languageId]) {
      return;
    }
    if (!workspace.getConfiguration(undefined, document.uri).get<boolean>(configName)) {
      return;
    }
    isEnabled = true;
  }

  function onDidChangeTextDocument(document: TextDocument, changes: ReadonlyArray<TextDocumentContentChangeEvent>) {
    if (!isEnabled) {
      return;
    }
    const activeDocument = window.activeTextEditor && window.activeTextEditor.document;
    if (document !== activeDocument || changes.length === 0) {
      return;
    }
    if (typeof timeout !== 'undefined') {
      clearTimeout(timeout);
    }
    const lastChange = changes[changes.length - 1];
    const lastCharacter = lastChange.text[lastChange.text.length - 1];
    if (lastChange.rangeLength > 0 || lastCharacter !== '>' && lastCharacter !== '/') {
      return;
    }
    const rangeStart = lastChange.range.start;
    const version = document.version;
    timeout = setTimeout(() => {
      const position = new Position(rangeStart.line, rangeStart.character + lastChange.text.length);
      tagProvider(document, position).then(result => {
        const text = result?.snippet;
        if (text && isEnabled) {
          const activeEditor = window.activeTextEditor;
          if (activeEditor) {
            const activeDocument = activeEditor.document;
            if (document === activeDocument && activeDocument.version === version) {
              const selections = activeEditor.selections;
              if (selections.length > 1 && selections.some(s => s.active.isEqual(position))) {
                // multiple cusror case
                activeEditor.insertSnippet(new SnippetString(text), selections.map(s => s.active));
              } else {
                // no multiple cursor we use the range coming from le LSP closeTag request to support 'xml.completion.autoCloseRemovesContent' setting
                activeEditor.insertSnippet(new SnippetString(text), getReplaceLocation(result.range, position));
              }
            }
          }
        }
      }, (_reason) => {
        console.log('xml/closeTag request has been cancelled');
      });
      timeout = void 0;
    }, 100);
  }
  return Disposable.from(...disposables);
}

function getReplaceLocation(range: Range, position: Position): Range | Position {
  if (range != null) {
    // re-create Range
    let line = range.start.line;
    let character = range.start.character;
    const startPosition = new Position(line, character);
    line = range.end.line;
    character = range.end.character;
    const endPosition = new Position(line, character);
    return new Range(startPosition, endPosition);
  }
  return position;
}