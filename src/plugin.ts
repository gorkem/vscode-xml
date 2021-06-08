'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import * as CommandConstants from './commands/commandConstants';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const glob = require('glob');

let existingExtensions: Array<string>;

export function collectXmlJavaExtensions(extensions: readonly vscode.Extension<any>[], jars: string[]): string[] {
	const result = [];
	if (extensions && extensions.length) {
		for (const extension of extensions) {
			const contributesSection = extension.packageJSON['contributes'];
			if (contributesSection) {
				const xmlJavaExtensions = contributesSection['xml.javaExtensions'];
				if (Array.isArray(xmlJavaExtensions) && xmlJavaExtensions.length) {
					for (const xmLJavaExtensionPath of xmlJavaExtensions) {
						result.push(...glob.sync(path.resolve(extension.extensionPath, xmLJavaExtensionPath)));
					}
				}
			}
		}
	}
	for (const extension of jars) {
		result.push(...glob.sync(extension));
	}
	// Make a copy of extensions:
	existingExtensions = result.slice();
	return result;
}

export function onExtensionChange(extensions: readonly vscode.Extension<any>[], jars: string[]): void {
	if (!existingExtensions) {
		return;
	}
	const oldExtensions = new Set(existingExtensions.slice());
	const newExtensions = collectXmlJavaExtensions(extensions, jars);
	let hasChanged = ( oldExtensions.size !== newExtensions.length);
	if (!hasChanged) {
		for (const newExtension of newExtensions) {
			if (!oldExtensions.has(newExtension)) {
				hasChanged = true;
				break;
			}
		}
	}

	if (hasChanged) {
		const msg = `Extensions to the XML Language Server changed, reloading ${vscode.env.appName} is required for the changes to take effect.`;
		const action = 'Reload';
		const restartId = CommandConstants.RELOAD_WINDOW;
		vscode.window.showWarningMessage(msg, action).then((selection) => {
			if (action === selection) {
				vscode.commands.executeCommand(restartId);
			}
		});
	}
}
