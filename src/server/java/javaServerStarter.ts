import * as os from 'os';
import * as path from 'path';
import { ExtensionContext, workspace } from 'vscode';
import { Executable } from 'vscode-languageclient/node';
import { getProxySettings, getProxySettingsAsJVMArgs, jvmArgsContainsProxySettings, ProxySettings } from '../../settings/proxySettings';
import { getJavaagentFlag, getKey, getXMLConfiguration, IS_WORKSPACE_VMARGS_XML_ALLOWED, xmlServerVmargs } from '../../settings/settings';
import { RequirementsData } from '../requirements';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const glob = require('glob');

// eslint-disable-next-line no-var
declare var v8debug;

const DEBUG = (typeof v8debug === 'object') || startedInDebugMode();

export async function prepareJavaExecutable(
  context: ExtensionContext,
  requirements: RequirementsData,
  xmlJavaExtensions: string[]
): Promise<Executable> {

  return {
    command: path.resolve(requirements.java_home + '/bin/java'),
    args: prepareParams(requirements, xmlJavaExtensions, context)
  } as Executable;
}

function prepareParams(requirements: RequirementsData, xmlJavaExtensions: string[], context: ExtensionContext): string[] {
  const params: string[] = [];
  if (DEBUG) {
    if (process.env['SUSPEND_SERVER'] === 'true') {
      params.push('-agentlib:jdwp=transport=dt_socket,server=y,address=1054');
    } else {
      params.push('-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=1054,quiet=y');
    }
  }
  let vmargsCheck = workspace.getConfiguration().inspect(xmlServerVmargs).workspaceValue;
  if (vmargsCheck !== undefined && typeof vmargsCheck === 'string') {
    const agentFlag = getJavaagentFlag(vmargsCheck);
    if (agentFlag !== null) {
      const keyVmargs = getKey(IS_WORKSPACE_VMARGS_XML_ALLOWED, context.storagePath, vmargsCheck);
      const key = context.globalState.get(keyVmargs);
      if (key !== true) {
        vmargsCheck = workspace.getConfiguration().inspect(xmlServerVmargs).globalValue;
      }
    }
  } else {
    vmargsCheck = getXMLConfiguration().get('server.vmargs');
  }
  let vmargs: string;
  if (vmargsCheck !== undefined) {
    vmargs = vmargsCheck + '';
  } else {
    vmargs = '';
  }

  const proxySettings: ProxySettings = getProxySettings();
  if (proxySettings && !jvmArgsContainsProxySettings(vmargs)) {
    vmargs += getProxySettingsAsJVMArgs(proxySettings);
  }

  if (os.platform() == 'win32') {
    const watchParentProcess = '-DwatchParentProcess=';
    if (vmargs.indexOf(watchParentProcess) < 0) {
      params.push(watchParentProcess + 'false');
    }
  }
  // "OpenJDK 64-Bit Server VM warning: Options -Xverify:none and -noverify
  // were deprecated in JDK 13 and will likely be removed in a future release."
  // so only add -noverify for older versions
  if (params.indexOf('-noverify') < 0 && params.indexOf('-Xverify:none') < 0 && requirements.java_version < 13) {
    params.push('-noverify');
  }
  parseVMargs(params, vmargs);
  const server_home: string = path.resolve(__dirname, '../server');
  const launchersFound: Array<string> = glob.sync('**/org.eclipse.lemminx*-uber.jar', { cwd: server_home });
  if (launchersFound.length) {
    let xmlJavaExtensionsClasspath = '';
    if (xmlJavaExtensions.length > 0) {
      const pathSeparator = os.platform() == 'win32' ? ';' : ':';
      xmlJavaExtensionsClasspath = pathSeparator + xmlJavaExtensions.join(pathSeparator);
    }
    params.push('-cp'); params.push(path.resolve(server_home, launchersFound[0]) + xmlJavaExtensionsClasspath);
    params.push('org.eclipse.lemminx.XMLServerLauncher');
  } else {
    return null;
  }
  return params;
}

function startedInDebugMode(): boolean {
  const args = (process as any).execArgv as string[];
  return hasDebugFlag(args);
}

function hasDebugFlag(args: string[]): boolean {
  if (args) {
    // See https://nodejs.org/en/docs/guides/debugging-getting-started/
    return args.some(arg => /^--inspect/.test(arg) || /^--debug/.test(arg));
  }
  return false;
}

//exported for tests
export function parseVMargs(params: any[], vmargsLine: string): void {
  if (!vmargsLine) {
    return;
  }
  const vmargs = vmargsLine.match(/(?:[^\s"]+|"[^"]*")+/g);
  if (vmargs === null) {
    return;
  }
  vmargs.forEach(arg => {
    //remove all standalone double quotes
    arg = arg.replace(/(\\)?"/g, function ($0, $1) { return ($1 ? $0 : ''); });
    //unescape all escaped double quotes
    arg = arg.replace(/(\\)"/g, '"');
    if (params.indexOf(arg) < 0) {
      params.push(arg);
    }
  });
}
