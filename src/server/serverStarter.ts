import { commands, ConfigurationTarget, ExtensionContext, window } from "vscode";
import { Executable } from "vscode-languageclient/node";
import { getXMLConfiguration } from "../settings/settings";
import * as Telemetry from "../telemetry";
import { ABORTED_ERROR, prepareBinaryExecutable } from "./binary/binaryServerStarter";
import { prepareJavaExecutable } from "./java/javaServerStarter";
import { getOpenJDKDownloadLink, RequirementsData } from "./requirements";

/**
 * Returns the executable to use to launch LemMinX (the XML Language Server)
 *
 * @param requirements the java information, or an empty object if there is no java
 * @param xmlJavaExtensions a list of all the java extension jars
 * @param context the extensions context
 * @throws if neither the binary nor the java version of the extension can be launched
 * @returns the executable to launch LemMinX with (the XML language server)
 */
export async function prepareExecutable(
  requirements: RequirementsData,
  xmlJavaExtensions: string[],
  context: ExtensionContext): Promise<Executable> {

  const hasJava: boolean = requirements.java_home !== undefined;
  const hasExtensions: boolean = xmlJavaExtensions.length !== 0;
  const preferBinary: boolean = getXMLConfiguration().get("server.preferBinary", false);
  const silenceExtensionWarning: boolean = getXMLConfiguration().get("server.silenceExtensionWarning", false);

  const useBinary: boolean = (!hasJava) || (preferBinary && !hasExtensions);

  if (hasExtensions && !hasJava && !silenceExtensionWarning) {
    const DOWNLOAD_JAVA = 'Get Java';
    const CONFIGURE_JAVA = 'More Info';
    const DISABLE_WARNING = 'Disable Warning';
    window.showInformationMessage('Extensions to the XML language server were detected, but no Java was found. '
      + 'In order to use these extensions, please install and configure a Java runtime (Java 8 or more recent).',
      DOWNLOAD_JAVA, CONFIGURE_JAVA, DISABLE_WARNING)
      .then((selection: string) => {
        if (selection === DOWNLOAD_JAVA) {
          Telemetry.sendTelemetry(Telemetry.OPEN_JAVA_DOWNLOAD_LINK_EVT).then(() => {
            commands.executeCommand('vscode.open', getOpenJDKDownloadLink());
          });
        } else if (selection === CONFIGURE_JAVA) {
          commands.executeCommand('xml.open.docs', { page: 'Preferences.md', section: 'java-home' });
        } else if (selection === DISABLE_WARNING) {
          getXMLConfiguration().update('server.silenceExtensionWarning', true, ConfigurationTarget.Global);
        }
      });
  }

  if (useBinary) {
    return prepareBinaryExecutable()
      .catch((e) => {
        const javaServerMessage = hasJava ? 'Falling back to the Java server.' : 'Cannot start XML language server, since Java is missing.';
        if (e === ABORTED_ERROR) {
          window.showWarningMessage(`${e.message}. ${javaServerMessage}`);
        } else {
          window.showErrorMessage(`${e}. ${javaServerMessage}`);
        }
        if (!hasJava) {
          throw new Error("Failed to launch binary XML language server and no Java is installed");
        }
        return prepareJavaExecutable(context, requirements, xmlJavaExtensions);
      });
  }
  return prepareJavaExecutable(context, requirements, xmlJavaExtensions);
}
