import { WorkspaceConfiguration, workspace, window, commands, extensions, Extension } from "vscode";
import { ScopeInfo } from "./extension";
import * as path from 'path';

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

export function getXConfiguration(configName: string) {
  return workspace.getConfiguration(configName);
}

export function onConfigurationChange() {
  if(!ignoreVMArgs) {
    verifyVMArgs();
  }

  if(!ignoreAutoCloseTags) {
    verifyAutoClosing();
  }
}

export function subscribeJDKChangeConfiguration() {
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
  let currentVMArgs = workspace.getConfiguration("xml.server").get("vmargs");
  if(vmArgsCache != undefined) {
    if(vmArgsCache != currentVMArgs) {
      let selection = createReloadWindowMessage("XML Language Server configuration changed, please restart VS Code.");
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
  let closeTags = getXMLConfiguration().get("completion.autoCloseTags");
  /*
   * HACK: the second parameter has changed in newer API:
   * https://github.com/microsoft/vscode/blob/40827f365c376dd6753116326fd10a9f826655b7/src/vs/vscode.d.ts#L9965
   * In order to avoid warnings about accessing a resource-specific config,
   * since [xml] only applies if the document is an xml document,
   * a null document value is passed.
   */
  let closeBrackets = workspace.getConfiguration("[xml]", null)["editor.autoClosingBrackets"];
  if (closeTags && closeBrackets != "never") {
    window.showWarningMessage(
      "The [xml].editor.autoClosingBrackets setting conflicts with xml.completion.autoCloseTags. It's recommended to disable it.",
      "Disable",
      ignoreButton).then((selection) => {
        if (selection == "Disable") {
          let scopeInfo : ScopeInfo = getScopeLevel("", "[xml]");
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
  let configXML = workspace.getConfiguration(configurationKey);
  let result = configXML.inspect(key);
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
  let scopeInfo : ScopeInfo = {"scope": scope, "configurationTarget": configurationTarget};
  return scopeInfo;
}

export function getKey(prefix, storagePath, value) {
  const workspacePath = path.resolve(storagePath + '/jdt_ws');
  if (workspace.name !== undefined) {
    return `${prefix}::${workspacePath}::${value}`;
  }
  else {
    return `${prefix}::${value}`;
  }
}

export function getJavaagentFlag(vmargs) {
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