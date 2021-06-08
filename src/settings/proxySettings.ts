/**
 *  Copyright (c) 2021 Red Hat, Inc. and others.
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the Eclipse Public License v2.0
 *  which accompanies this distribution, and is available at
 *  https://www.eclipse.org/legal/epl-v20.html
 *
 *  Contributors:
 *  Red Hat Inc. - initial API and implementation
 */
import { workspace } from 'vscode';

/**
 * Represents the information needed to communicate through a proxy
 */
export class ProxySettings {

  private _host: string;
  private _port: string;
  private _auth?: ProxyAuthorization;

  constructor(host: string, port: string, auth?: ProxyAuthorization) {
    this._host = host;
    this._port = port;
    this._auth = auth;
  }

  get host(): string {
    return this._host;
  }

  get port(): string {
    return this._port;
  }

  get auth(): ProxyAuthorization {
    return this._auth;
  }

}

/**
 * Represents the information needed to authenticate with the proxy
 */
export class ProxyAuthorization {

  private _username: string;
  private _password: string;

  constructor(username: string, password: string) {
    this._username = username;
    this._password = password;
  }

  get username(): string {
    return this._username
  }

  get password(): string {
    return this._password;
  }

}


/**
 * Returns the proxy settings that are declared in the VS Code settings, or null if no proxy is configured
 *
 * @throws if the proxy settings aren't in the expected format
 * @returns the proxy settings that are declared in the VS Code settings, or null if no proxy is configured
 */
export function getProxySettings(): ProxySettings {
  const proxyAddress = getProxyAddress();
  if (!proxyAddress) {
    return null;
  }
  const regexResult = HOST_AND_PORT_EXTRACTOR.exec(proxyAddress);
  if (!regexResult[1]) {
    return null;
  }
  const host: string = regexResult[1];
  const port: string = regexResult[2] ? regexResult[2] : "80";

  const proxyAuthorizationString = getProxyAuthorization();
  if (!proxyAuthorizationString) {
    return new ProxySettings(host, port);
  }
  if (proxyAuthorizationString.indexOf(' ') === -1) {
    throw new Error('A space is expected in the Authorization header between the authorization method and encoded username/password');
  }

  const encodedUserAndPass = proxyAuthorizationString.split(' ').pop();
  const decodedUserAndPass: string = Buffer.from(encodedUserAndPass, 'base64').toString('utf8');
  if (decodedUserAndPass.indexOf(':') === -1) {
    throw new Error('Authorization header is not in the expected format');
  }
  const [uriEncodedUsername, uriEncodedPassword] = decodedUserAndPass.split(':');
  const proxyAuthorization = new ProxyAuthorization(decodeURIComponent(uriEncodedUsername), decodeURIComponent(uriEncodedPassword));
  return new ProxySettings(host, port, proxyAuthorization);
}

/**
 * Returns the proxy settings as arguments for the JVM
 *
 * eg. -Dhttp.proxyHost=<proxy_host> -Dhttp.proxyPort=<proxy_port> -Dhttp.proxyUser=<user> -Dhttp.proxyPassword=<password>
 *
 * @param proxySettings the proxy settings to convert into JVM args
 */
export function getProxySettingsAsJVMArgs(proxySettings: ProxySettings): string {
  // Java doesn't recognize localhost in the proxy settings
  const adaptedHostName = 'localhost'.startsWith(proxySettings.host) ? '127.0.0.1' : proxySettings.host;
  let proxyJVMArgs = ` -Dhttp.proxyHost=${adaptedHostName} -Dhttp.proxyPort=${proxySettings.port} `;
  if (proxySettings.auth) {
    proxyJVMArgs += ` -Dhttp.proxyUser=${proxySettings.auth.username} -Dhttp.proxyPassword=${proxySettings.auth.password} `;
  }
  return proxyJVMArgs;
}

/**
 * Returns the proxy settings as environment variables for LemMinX
 *
 * @param proxySettings the proxy settings to convert into environment variables
 * @returns the proxy settings as environment variables for LemMinX
 */
export function getProxySettingsAsEnvironmentVariables(proxySettings: ProxySettings): any {
  const proxyEnv: any = {};

  proxyEnv['HTTP_PROXY_HOST'] = proxySettings.host;
  proxyEnv['HTTP_PROXY_PORT'] = proxySettings.port;

  if (proxySettings.auth) {
    proxyEnv['HTTP_PROXY_USERNAME'] = proxySettings.auth.username;
    proxyEnv['HTTP_PROXY_PASSWORD'] = proxySettings.auth.password;
  }

  return proxyEnv;
}

/**
 * Checks if the given JVM arguments contain any proxy configuration
 *
 * @param jvmArgs the arguments being passed to the JVM
 */
export function jvmArgsContainsProxySettings(jvmArgs: string): boolean {
  return (
    [JVM_PROXY_HOST, JVM_PROXY_PORT, JVM_PROXY_USER, JVM_PROXY_PASS] //
      .map(prop => jvmArgs.indexOf(`-D${prop}`) !== -1)
      .reduce((a, b, _index, _array) => a || b, false)
  );
}

const HOST_AND_PORT_EXTRACTOR = /https?:\/\/([^:/]+)(?::([0-9]+))?/;

const JVM_PROXY_HOST = 'http.proxyHost';
const JVM_PROXY_PORT = 'http.proxyPort';
const JVM_PROXY_USER = 'http.proxyUser';
const JVM_PROXY_PASS = 'http.proxyPassword';

/**
 * Returns the address of the proxy
 *
 * @returns the address of the proxy
 */
function getProxyAddress(): string {
  return workspace.getConfiguration('http').get('proxy', undefined);
}

/**
* Returns the Proxy-Authorization to use to access the proxy
*
* @returns The Proxy-Authorization to use to access the proxy
*/
function getProxyAuthorization(): string {
  return workspace.getConfiguration('http').get('proxyAuthorization', undefined);
}