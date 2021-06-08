import * as path from 'path';
import { commands, Disposable, Extension, extensions, window, workspace, WorkspaceConfiguration } from "vscode";
import { ExternalXmlSettings } from './externalXmlSettings';
import { getVariableSubstitutedAssociations } from "./variableSubstitution";

export interface ScopeInfo {
  scope: "default" | "global" | "workspace" | "folder";
  configurationTarget: boolean;
}

let vmArgsCache;
let ignoreAutoCloseTags = false;
let ignoreVMArgs = false;
let oldXMLConfig: WorkspaceConfiguration = getXMLConfiguration();
let oldJavaConfig: WorkspaceConfiguration = getJavaConfiguration();

const restartButton = 'Restart Now';
const ignoreButton = 'Ignore'
const restartId = "workbench.action.reloadWindow";
export const IS_WORKSPACE_JDK_ALLOWED = "java.ls.isJdkAllowed";
export const IS_WORKSPACE_JDK_XML_ALLOWED = "java.ls.isJdkXmlAllowed";
export const IS_WORKSPACE_VMARGS_XML_ALLOWED = "java.ls.isVmargsXmlAllowed";
export const xmlServerVmargs = 'xml.server.vmargs';

export function getXMLConfiguration(): WorkspaceConfiguration {
  return getXConfiguration("xml")
}

export function getJavaConfiguration(): WorkspaceConfiguration {
  return getXConfiguration("java");
}

export function getXConfiguration(configName: string): WorkspaceConfiguration {
  return workspace.getConfiguration(configName);
}

export function onConfigurationChange(): void {
  if(!ignoreVMArgs) {
    verifyVMArgs();
  }

  if(!ignoreAutoCloseTags) {
    verifyAutoClosing();
  }
}

export function subscribeJDKChangeConfiguration(): Disposable {
  return workspace.onDidChangeConfiguration(params => {

    //handle "xml.java.home" change
    if(params.affectsConfiguration("xml")) {
      const newXMLConfig = getXMLConfiguration();
      if(hasPreferenceChanged(oldXMLConfig, newXMLConfig, "java.home")) { // checks "xml.java.home", not "java.home"
        createReloadWindowMessage("`xml.java.home` path has changed. Please restart VS Code.");
      }
      // update to newest version of config
      oldXMLConfig = newXMLConfig;
      return;
    }

    //handle "java.home" change
    if(oldXMLConfig.get("java.home") == null) { // if "xml.java.home" exists, dont even look at "java.home"
      if(params.affectsConfiguration("java")) {
        const newJavaConfig = getJavaConfiguration();
        //don't need to handle reload message if redhat.java extension exists (it will handle it)
        const redhatJavaExtension: Extension<any> = extensions.getExtension("redhat.java");
        const isJavaExtensionActive: boolean = redhatJavaExtension != null && redhatJavaExtension.isActive;
        if(!isJavaExtensionActive && hasPreferenceChanged(oldJavaConfig, newJavaConfig, "home")) { // checks "java.home"
          createReloadWindowMessage("`java.home` path has changed. Please restart VS Code.");
        }
        oldJavaConfig = newJavaConfig;
      }
      return;
    }
  });
}

function hasPreferenceChanged(oldConfig: WorkspaceConfiguration, newConfig: WorkspaceConfiguration, preference: string) {
  return oldConfig.get(preference) != newConfig.get(preference);
}

function createReloadWindowMessage(message: string) : string{
  window.showWarningMessage(message, restartButton, ignoreButton).then((selection) => {
    if (restartButton === selection) {
      commands.executeCommand(restartId);
    }
  });

  return ignoreButton;
}

function verifyVMArgs() {
  const currentVMArgs = workspace.getConfiguration("xml.server").get("vmargs");
  if(vmArgsCache != undefined) {
    if(vmArgsCache != currentVMArgs) {
      const selection = createReloadWindowMessage("XML Language Server configuration changed, please restart VS Code.");
      if(selection == ignoreButton) {
        ignoreVMArgs = true;
      }
    }
  }
  else {
    vmArgsCache = currentVMArgs;
  }
}

function verifyAutoClosing() {
  const configXML = workspace.getConfiguration();
  const closeTags = configXML.get("xml.completion.autoCloseTags");
  const closeBrackets = configXML.get("[xml]")["editor.autoClosingBrackets"];
  if (closeTags && closeBrackets != "never") {
    window.showWarningMessage(
      "The [xml].editor.autoClosingBrackets setting conflicts with xml.completion.autoCloseTags. It's recommended to disable it.",
      "Disable",
      ignoreButton).then((selection) => {
        if (selection == "Disable") {
          const scopeInfo : ScopeInfo = getScopeLevel("", "[xml]");
          workspace.getConfiguration().update("[xml]", { "editor.autoClosingBrackets": "never" }, scopeInfo.configurationTarget).then(
            () => console.log('[xml].editor.autoClosingBrackets globally set to never'),
            (error) => console.log(error)
          );
        }
        else if(selection == "Ignore") {
          ignoreAutoCloseTags = true;
        }
      });
  }
}

function getScopeLevel(configurationKey : string, key : string) : ScopeInfo{
  const configXML = workspace.getConfiguration(configurationKey);
  const result = configXML.inspect(key);
  let scope, configurationTarget;
  if(result.workspaceFolderValue == undefined) {
    if(result.workspaceValue == undefined) {
      if(result.globalValue == undefined) {
        scope = "default"
        configurationTarget = true;
      }
      else {
        scope = "global";
        configurationTarget = true;
      }
    }
    else {
      scope = "workspace";
      configurationTarget = false;
    }
  }
  else {
    scope = "folder";
    configurationTarget = undefined;
  }
  const scopeInfo : ScopeInfo = {"scope": scope, "configurationTarget": configurationTarget};
  return scopeInfo;
}

export function getKey(prefix: string, storagePath: string, value: string): string {
  const workspacePath = path.resolve(storagePath + '/jdt_ws');
  if (workspace.name !== undefined) {
    return `${prefix}::${workspacePath}::${value}`;
  }
  else {
    return `${prefix}::${value}`;
  }
}

export function getJavaagentFlag(vmargs: string): string {
  const javaagent = '-javaagent:';
  const args = vmargs.split(" ");
  let agentFlag = null;
  for (const arg of args) {
    if (arg.startsWith(javaagent)) {
      agentFlag = arg.substring(javaagent.length);
      break;
    }
  }
  return agentFlag;
}

/**
 * Returns a json object with key 'xml' and a json object value that
 * holds all xml. settings.
 *
 * Returns: {
 *            'xml': {...}
 *          }
 */
export function getXMLSettings(javaHome: string | undefined, logfile: string, externalXmlSettings: ExternalXmlSettings): JSON {
  const configXML = workspace.getConfiguration().get('xml');
  let xml;
  if (!configXML) { //Set default preferences if not provided
    const defaultValue =
    {
      xml: {
        trace: {
          server: 'verbose'
        },
        logs: {
          client: true
        },
        format: {
          enabled: true,
          splitAttributes: false
        },
        completion: {
          autoCloseTags: false
        }
      }
    }
    xml = defaultValue;
  } else {
    const x = JSON.stringify(configXML); //configXML is not a JSON type
    xml = { "xml": JSON.parse(x) };
  }
  xml['xml']['logs']['file'] = logfile;
  xml['xml']['useCache'] = true;
  xml['xml']['java']['home'] = javaHome;
  xml['xml']['format']['trimFinalNewlines'] = workspace.getConfiguration('files').get('trimFinalNewlines', true);
  xml['xml']['format']['trimTrailingWhitespace'] = workspace.getConfiguration('files').get('trimTrailingWhitespace', false);
  xml['xml']['format']['insertFinalNewline'] = workspace.getConfiguration('files').get('insertFinalNewline', false);
  xml['xml']['telemetry'] = {
    enabled: workspace.getConfiguration('redhat.telemetry').get('enabled', false)
  };

  //applying externalXmlSettings to the xmlSettings
  externalXmlSettings.xmlCatalogs.forEach(catalog => {
    if (!xml['xml']['catalogs'].includes(catalog)) {
      xml['xml']['catalogs'].push(catalog);
    }
  })
  // Apply variable substitutions for file associations
  xml['xml']['fileAssociations'] = [...getVariableSubstitutedAssociations(xml['xml']['fileAssociations'])];

  return xml;
}