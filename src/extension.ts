/**
 *  Copyright (c) 2018 Red Hat, Inc. and others.
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the Eclipse Public License v2.0
 *  which accompanies this distribution, and is available at
 *  https://www.eclipse.org/legal/epl-v20.html
 *
 *  Contributors:
 *  Red Hat Inc. - initial API and implementation
 *  Microsoft Corporation - Auto Closing Tags
 */

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { ExtensionContext, extensions, languages } from "vscode";
import { Executable, LanguageClient } from 'vscode-languageclient/node';
import { XMLExtensionApi } from './api/xmlExtensionApi';
import { getXmlExtensionApiImplementation } from './api/xmlExtensionApiImplementation';
import { cleanUpHeapDumps } from './client/clientErrorHandler';
import { getIndentationRules } from './client/indentation';
import { startLanguageClient } from './client/xmlClient';
import { registerClientOnlyCommands } from './commands/registerCommands';
import { collectXmlJavaExtensions } from './plugin';
import * as requirements from './server/requirements';
import { prepareExecutable } from './server/serverStarter';
import { ExternalXmlSettings } from "./settings/externalXmlSettings";
import { getXMLConfiguration } from './settings/settings';
import { Telemetry } from './telemetry';

let languageClient: LanguageClient;

export async function activate(context: ExtensionContext): Promise<XMLExtensionApi> {

  await Telemetry.startTelemetry(context);
  Telemetry.sendTelemetry(Telemetry.SETTINGS_EVT, {
    preferBinary: (getXMLConfiguration()['server']['preferBinary'] as boolean)
  });

  registerClientOnlyCommands(context);

  languages.setLanguageConfiguration('xml', getIndentationRules());
  languages.setLanguageConfiguration('xsl', getIndentationRules());

  let requirementsData: requirements.RequirementsData;
  try {
    requirementsData = await requirements.resolveRequirements(context);
  } catch (error) {
    requirementsData = {} as requirements.RequirementsData;
  }

  let storagePath: string = context.storagePath;
  if (!storagePath) {
    storagePath = os.homedir() + "/.lemminx";
  }
  const logfile = path.resolve(storagePath + '/lemminx.log');
  await fs.ensureDir(context.globalStorageUri.fsPath);
  await cleanUpHeapDumps(context);

  const externalXmlSettings: ExternalXmlSettings = new ExternalXmlSettings();

  const serverOptions: Executable = await prepareExecutable(
    requirementsData, collectXmlJavaExtensions(extensions.all, getXMLConfiguration().get("extension.jars", [])), context);

  languageClient = await startLanguageClient(context, serverOptions, logfile, externalXmlSettings, requirementsData);

  return getXmlExtensionApiImplementation(languageClient, logfile, externalXmlSettings, requirementsData);
}

export async function deactivate(): Promise<void> {
  if (languageClient) {
    await languageClient.stop();
  }
}
