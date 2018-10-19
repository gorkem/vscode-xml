import { window, commands, WorkspaceConfiguration, workspace } from 'vscode'
import { StreamInfo, Executable, ExecutableOptions } from 'vscode-languageclient';
import { createClientPipeTransport } from 'vscode-jsonrpc';
import { RequirementsData } from './requirements';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
const glob = require('glob');

declare var v8debug;

const DEBUG = (typeof v8debug === 'object') || startedInDebugMode();

export function prepareExecutable(requirements: RequirementsData): Executable {
  let executable: Executable = Object.create(null);
  let options: ExecutableOptions = Object.create(null);
  options.env = process.env;
  options.stdio = 'pipe';
  executable.options = options;
  executable.command = path.resolve(requirements.java_home + '/bin/java');
  executable.args = prepareParams(requirements);
  return executable;
}

function prepareParams(requirements: RequirementsData): string[] {
  let params: string[] = [];
  if (DEBUG) {
    params.push('-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=1054,quiet=y');
    // suspend=y is the default. Use this form if you need to debug the server startup code:
    //params.push('-agentlib:jdwp=transport=dt_socket,server=y,address=1054');
  }
  let server_home: string = path.resolve(__dirname, '../../server');
  let launchersFound: Array<string> = glob.sync('**/org.eclipse.lsp4xml-all.jar', { cwd: server_home });
  if (launchersFound.length) {
    params.push('-jar'); params.push(path.resolve(server_home, launchersFound[0]));
  } else {
    return null;
  }
  let vmargs = workspace.getConfiguration("xml").get("server.vmargs", '');
	parseVMargs(params, vmargs);
  return params;
}

function startedInDebugMode(): boolean {
  let args = (process as any).execArgv;
  if (args) {
    return args.some((arg) => /^--debug=?/.test(arg) || /^--debug-brk=?/.test(arg) || /^--inspect-brk=?/.test(arg));
  };
  return false;
}

//exported for tests
export function parseVMargs(params: any[], vmargsLine: string) {
	if (!vmargsLine) {
		return;
	}
	let vmargs = vmargsLine.match(/(?:[^\s"]+|"[^"]*")+/g);
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
