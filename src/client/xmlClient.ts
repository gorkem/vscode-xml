import { TelemetryEvent } from '@redhat-developer/vscode-redhat-telemetry/lib';
import { commands, ExtensionContext, extensions, Position, TextDocument, TextEditor, Uri, window, workspace } from 'vscode';
import { Command, ConfigurationParams, ConfigurationRequest, DidChangeConfigurationNotification, ExecuteCommandParams, LanguageClientOptions, MessageType, NotificationType, RequestType, RevealOutputChannelOn, TextDocumentPositionParams } from "vscode-languageclient";
import { Executable, LanguageClient } from 'vscode-languageclient/node';
import { XMLFileAssociation } from '../api/xmlExtensionApi';
import * as CommandConstants from '../commands/commandConstants';
import { registerCommands } from '../commands/registerCommands';
import { onExtensionChange } from '../plugin';
import { RequirementsData } from "../server/requirements";
import { ExternalXmlSettings } from "../settings/externalXmlSettings";
import { getXMLConfiguration, getXMLSettings, onConfigurationChange, subscribeJDKChangeConfiguration } from "../settings/settings";
import { containsVariableReferenceToCurrentFile } from '../settings/variableSubstitution';
import * as Telemetry from '../telemetry';
import { ClientErrorHandler } from './clientErrorHandler';
import { activateTagClosing, AutoCloseResult } from './tagClosing';

const ExecuteClientCommandRequest: RequestType<ExecuteCommandParams, any, void> = new RequestType('xml/executeClientCommand');

const TagCloseRequest: RequestType<TextDocumentPositionParams, AutoCloseResult, any> = new RequestType('xml/closeTag');

interface ActionableMessage {
  severity: MessageType;
  message: string;
  data?: any;
  commands?: Command[];
}

const ActionableNotification = new NotificationType<ActionableMessage>('xml/actionableNotification');

let languageClient: LanguageClient;

export async function startLanguageClient(context: ExtensionContext, executable: Executable, logfile: string, externalXmlSettings: ExternalXmlSettings, requirementsData: RequirementsData): Promise<LanguageClient> {

  const languageClientOptions: LanguageClientOptions = getLanguageClientOptions(logfile, externalXmlSettings, requirementsData);
  languageClient = new LanguageClient('xml', 'XML Support', executable, languageClientOptions);

  languageClient.onTelemetry(async (e: TelemetryEvent) => {
    return Telemetry.sendTelemetry(e.name, e.properties);
  });

  context.subscriptions.push(languageClient.start());
  await languageClient.onReady();

  // ---

  //Detect JDK configuration changes
  context.subscriptions.push(subscribeJDKChangeConfiguration());

  setupActionableNotificationListener(languageClient);

  // Handler for 'xml/executeClientCommand` request message that executes a command on the client
  languageClient.onRequest(ExecuteClientCommandRequest, async (params: ExecuteCommandParams) => {
    return await commands.executeCommand(params.command, ...params.arguments);
  });

  registerCommands(context, languageClient);

  // Setup autoCloseTags
  const tagProvider = (document: TextDocument, position: Position) => {
    const param = languageClient.code2ProtocolConverter.asTextDocumentPositionParams(document, position);
    const text = languageClient.sendRequest(TagCloseRequest, param);
    return text;
  };
  context.subscriptions.push(activateTagClosing(tagProvider, { xml: true, xsl: true }, CommandConstants.AUTO_CLOSE_TAGS));

  if (extensions.onDidChange) {// Theia doesn't support this API yet
    context.subscriptions.push(extensions.onDidChange(() => {
      onExtensionChange(extensions.all, getXMLConfiguration().get("extension.jars", []));
    }));
  }

  // Copied from:
  // https://github.com/redhat-developer/vscode-java/pull/1081/files
  languageClient.onRequest(ConfigurationRequest.type, (params: ConfigurationParams) => {
    const result: any[] = [];
    const activeEditor: TextEditor | undefined = window.activeTextEditor;
    for (const item of params.items) {
      if (activeEditor && activeEditor.document.uri.toString() === Uri.parse(item.scopeUri).toString()) {
        if (item.section === "xml.format.insertSpaces") {
          result.push(activeEditor.options.insertSpaces);
        } else if (item.section === "xml.format.tabSize") {
          result.push(activeEditor.options.tabSize);
        }
      } else {
        result.push(workspace.getConfiguration(null, Uri.parse(item.scopeUri)).get(item.section));
      }
    }
    return result;
  });

  // When the current document changes, update variable values that refer to the current file if these variables are referenced,
  // and send the updated settings to the server
  context.subscriptions.push(window.onDidChangeActiveTextEditor(() => {
    if (containsVariableReferenceToCurrentFile(getXMLConfiguration().get('fileAssociations') as XMLFileAssociation[])) {
      languageClient.sendNotification(DidChangeConfigurationNotification.type, { settings: getXMLSettings(requirementsData.java_home, logfile, externalXmlSettings) });
      onConfigurationChange();
    }
  }));

  return languageClient;
}

function getLanguageClientOptions(logfile: string, externalXmlSettings: ExternalXmlSettings, requirementsData: RequirementsData): LanguageClientOptions {
  return {
    // Register the server for xml and xsl
    documentSelector: [
      { scheme: 'file', language: 'xml' },
      { scheme: 'file', language: 'xsl' },
      { scheme: 'untitled', language: 'xml' },
      { scheme: 'untitled', language: 'xsl' }
    ],
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    //wrap with key 'settings' so it can be handled same a DidChangeConfiguration
    initializationOptions: {
      settings: getXMLSettings(requirementsData.java_home, logfile, externalXmlSettings),
      extendedClientCapabilities: {
        codeLens: {
          codeLensKind: {
            valueSet: [
              'references'
            ]
          }
        },
        actionableNotificationSupport: true,
        openSettingsCommandSupport: true
      }
    },
    errorHandler: new ClientErrorHandler('XML'),
    synchronize: {
      //preferences starting with these will trigger didChangeConfiguration
      configurationSection: ['xml', '[xml]', 'files.trimFinalNewlines', 'files.trimTrailingWhitespace', 'files.insertFinalNewline']
    },
    middleware: {
      workspace: {
        didChangeConfiguration: () => {
          languageClient.sendNotification(DidChangeConfigurationNotification.type, { settings: getXMLSettings(requirementsData.java_home, logfile, externalXmlSettings) });
          onConfigurationChange();
        }
      }
    }
  } as LanguageClientOptions;
}

function setupActionableNotificationListener(languageClient: LanguageClient): void {
  languageClient.onNotification(ActionableNotification, (notification: ActionableMessage) => {
    let show = null;
    switch (notification.severity) {
      case MessageType.Info:
        show = window.showInformationMessage;
        break;
      case MessageType.Warning:
        show = window.showWarningMessage;
        break;
      case MessageType.Error:
        show = window.showErrorMessage;
        break;
    }
    if (!show) {
      return;
    }
    const titles: string[] = notification.commands.map(a => a.title);
    show(notification.message, ...titles).then((selection) => {
      for (const action of notification.commands) {
        if (action.title === selection) {
          const args: any[] = (action.arguments) ? action.arguments : [];
          commands.executeCommand(action.command, ...args);
          break;
        }
      }
    });
  });
}