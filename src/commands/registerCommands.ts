import * as path from 'path';
import { commands, ExtensionContext, Position, Uri, window, workspace } from "vscode";
import { CancellationToken, ExecuteCommandParams, ExecuteCommandRequest, ReferencesRequest, TextDocumentIdentifier } from "vscode-languageclient";
import { LanguageClient } from 'vscode-languageclient/node';
import { markdownPreviewProvider } from "../markdownPreviewProvider";
import * as CommandConstants from "./commandConstants";

/**
 * Register the commands for vscode-xml
 *
 * @param context the extension context
 */
export async function registerCommands(context: ExtensionContext, languageClient: LanguageClient): Promise<void> {

  registerDocsCommands(context);
  registerCodeLensCommands(context, languageClient);
  registerValidationCommands(context);

  // Register client command to execute custom XML Language Server command
  context.subscriptions.push(commands.registerCommand(CommandConstants.EXECUTE_WORKSPACE_COMMAND, (command, ...rest) => {
    let token: CancellationToken;
    let commandArgs: any[] = rest;
    if (rest && rest.length && CancellationToken.is(rest[rest.length - 1])) {
      token = rest[rest.length - 1];
      commandArgs = rest.slice(0, rest.length - 1);
    }
    const params: ExecuteCommandParams = {
      command,
      arguments: commandArgs
    };
    if (token) {
      return languageClient.sendRequest(ExecuteCommandRequest.type, params, token);
    } else {
      return languageClient.sendRequest(ExecuteCommandRequest.type, params);
    }
  }));

  // Register command that open settings to a given setting
  context.subscriptions.push(commands.registerCommand(CommandConstants.OPEN_SETTINGS, async (settingId?: string) => {
    commands.executeCommand('workbench.action.openSettings', settingId);
  }));
}

/**
 * Register commands used for the built-in documentation
 *
 * @param context the extension context
 */
async function registerDocsCommands(context: ExtensionContext): Promise<void> {
  context.subscriptions.push(markdownPreviewProvider);
  context.subscriptions.push(commands.registerCommand(CommandConstants.OPEN_DOCS_HOME, async () => {
    const uri = 'README.md';
    const title = 'XML Documentation';
    const sectionId = '';
    markdownPreviewProvider.show(context.asAbsolutePath(path.join('docs', uri)), title, sectionId, context);
  }));
  context.subscriptions.push(commands.registerCommand(CommandConstants.OPEN_DOCS, async (params: { page: string, section: string }) => {
    const page = params.page.endsWith('.md') ? params.page.substr(0, params.page.length - 3) : params.page;
    const uri = page + '.md';
    const sectionId = params.section || '';
    const title = 'XML ' + page;
    markdownPreviewProvider.show(context.asAbsolutePath(path.join('docs', uri)), title, sectionId, context);
  }));
}

/**
 * Register commands used for code lens
 *
 * @param context the extension context
 * @param languageClient the language server client
 */
async function registerCodeLensCommands(context: ExtensionContext, languageClient: LanguageClient): Promise<void> {
  context.subscriptions.push(commands.registerCommand(CommandConstants.SHOW_REFERENCES, (uriString: string, position: Position) => {
    const uri = Uri.parse(uriString);
    workspace.openTextDocument(uri).then(document => {
      // Consume references service from the XML Language Server
      const param = languageClient.code2ProtocolConverter.asTextDocumentPositionParams(document, position);
      languageClient.sendRequest(ReferencesRequest.type, param).then(locations => {
        commands.executeCommand(CommandConstants.EDITOR_SHOW_REFERENCES, uri, languageClient.protocol2CodeConverter.asPosition(position), locations.map(languageClient.protocol2CodeConverter.asLocation));
      })
    })
  }));
}

/**
 * Register commands used for revalidating XML files
 *
 * @param context the extension context
 */
async function registerValidationCommands(context: ExtensionContext): Promise<void> {
  // Revalidate current file
  context.subscriptions.push(commands.registerCommand(CommandConstants.VALIDATE_CURRENT_FILE, async () => {
    const uri = window.activeTextEditor.document.uri;
    const identifier = TextDocumentIdentifier.create(uri.toString());
    commands.executeCommand(CommandConstants.EXECUTE_WORKSPACE_COMMAND, CommandConstants.VALIDATE_CURRENT_FILE, identifier).
      then(() => {
        window.showInformationMessage('The current XML file was successfully validated.');
      }, error => {
        window.showErrorMessage('Error during XML validation ' + error.message);
      });
  }));
  // Revalidate all open files
  context.subscriptions.push(commands.registerCommand(CommandConstants.VALIDATE_ALL_FILES, async () => {
    commands.executeCommand(CommandConstants.EXECUTE_WORKSPACE_COMMAND, CommandConstants.VALIDATE_ALL_FILES).
      then(() => {
        window.showInformationMessage('All open XML files were successfully validated.');
      }, error => {
        window.showErrorMessage('Error during XML validation: ' + error.message);
      });
  }));
}