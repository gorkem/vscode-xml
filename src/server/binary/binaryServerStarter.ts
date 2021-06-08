import { createHash, Hash } from 'crypto';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import { Readable } from 'stream';
import { extensions, ProgressLocation, ProgressOptions, window, WorkspaceConfiguration } from "vscode";
import { Executable } from "vscode-languageclient/node";
import * as yauzl from 'yauzl';
import { getProxySettings, getProxySettingsAsEnvironmentVariables, ProxySettings } from '../../settings/proxySettings';
import { getXMLConfiguration } from "../../settings/settings";
import * as Telemetry from '../../telemetry';
import { addTrustedHash, getTrustedHashes } from './binaryHashManager';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const glob = require('glob');

const HTTPS_PATTERN = /^https:\/\//;
const JAR_ZIP_AND_HASH_REJECTOR = /(?:\.jar)|(?:\.zip)|(?:\.sha256)$/;

export const ABORTED_ERROR: Error = new Error('XML Language Server download cancelled by user');

/**
 * Returns the executable to launch LemMinX (the XML Language Server) as a binary
 *
 * @param context the extension context
 * @throws if the binary doesn't exist and can't be downloaded, or if the binary is not trusted
 * @returns Returns the executable to launch LemMinX (the XML Language Server) as a binary
 */
export async function prepareBinaryExecutable(): Promise<Executable> {
  const binaryArgs: string = getXMLConfiguration().get("server.binary.args");
  let binaryExecutable: Executable;
  return getServerBinaryPath()
    .then((binaryPath: string) => {
      binaryExecutable = {
        args: [binaryArgs],
        command: binaryPath,
        options: {
          env: getBinaryEnvironment()
        }
      } as Executable;
      return binaryPath;
    })
    .then(checkBinaryHash)
    .then((hashOk: boolean) => {
      if (hashOk) {
        return binaryExecutable;
      } else {
        throw new Error("The binary XML language server is not trusted");
      }
    });
}

/**
 * Returns the path to the LemMinX binary
 *
 * Downloads it if it is missing
 *
 * @returns The path to the LemMinX binary
 * @throws If the LemMinX binary can't be located or downloaded
 */
async function getServerBinaryPath(): Promise<string> {
  const config: WorkspaceConfiguration = getXMLConfiguration();
  const binaryPath: string = config.get("server.binary.path");
  if (binaryPath) {
    if (fs.existsSync(binaryPath)) {
      return Promise.resolve(binaryPath);
    }
    window.showErrorMessage('The specified XML language server binary could not be found. Using the default binary...');
  }
  const server_home: string = path.resolve(__dirname, '../server');
  let binaries: Array<string> = glob.sync(`**/${getServerBinaryNameWithoutExtension()}*`, { cwd: server_home });
  binaries = binaries.filter((path) => { return !JAR_ZIP_AND_HASH_REJECTOR.test(path) });
  if (binaries.length) {
    return Promise.resolve(path.resolve(server_home, binaries[0]));
  }
  // Download it, then return the downloaded binary's location
  return downloadBinary();
}

/**
 * Downloads LemMinX binary under the `server` directory and returns the path to the binary as a Promise
 *
 * @returns The path to the LemMinX binary
 * @throws If the LemMinX binary download fails
 */
async function downloadBinary(): Promise<string> {
  const downloadPromise: Promise<string> = new Promise((resolve, reject) => {
    let webClient: http.ClientRequest = null;
    const handleResponse = (response: http.IncomingMessage) => {
      const statusCode = response.statusCode;
      if (statusCode === 303) {
        webClient = httpHttpsGet(response.headers.location, handleResponse)
          .on('error', (e) => {
            reject(`Server binary download failed: ${e.message}`);
          });
      } else if (statusCode === 200) {
        showProgressForDownload(response, webClient);
        if (/^application\/zip$/.test(response.headers['content-type'])) {
          acceptZipDownloadResponse(response).then(resolve, reject);
        } else {
          // Not a ZIP, assume its a binary
          acceptBinaryDownloadResponse(response).then(resolve, reject);
        }
      } else {
        reject(`Server binary download failed: status code ${statusCode}`);
      }
    }
    webClient = httpHttpsGet(`${getServerBinaryDownloadUrl()}`, handleResponse)
      .on('error', (e) => {
        reject(`Server binary download failed: ${e.message}`);
      });
  });
  downloadPromise.then((_binaryPath) => {
    const data: any = {};
    data[Telemetry.BINARY_DOWNLOAD_STATUS_PROP] = Telemetry.BINARY_DOWNLOAD_SUCCEEDED;
    Telemetry.sendTelemetry(Telemetry.BINARY_DOWNLOAD_EVT, data);
  });
  downloadPromise.catch(e => {
    if (e !== ABORTED_ERROR) {
      const data: any = {};
      data[Telemetry.BINARY_DOWNLOAD_STATUS_PROP] = Telemetry.BINARY_DOWNLOAD_FAILED;
      data['error'] = e.toString();
      Telemetry.sendTelemetry(Telemetry.BINARY_DOWNLOAD_EVT, data);
    } else {
      const data: any = {};
      data[Telemetry.BINARY_DOWNLOAD_STATUS_PROP] = Telemetry.BINARY_DOWNLOAD_ABORTED;
      Telemetry.sendTelemetry(Telemetry.BINARY_DOWNLOAD_EVT, data);
    }
  });
  return downloadPromise;
}

/**
 * Returns true if the hash of the binary matches the expected hash and false otherwise
 *
 * @param binaryPath the path to the binary to check
 * @returns true if the hash of the binary matches the expected hash and false otherwise
 */
async function checkBinaryHash(binaryPath: string): Promise<boolean> {
  const hash: Hash = createHash('sha256');
  return new Promise((resolve, reject) => {
    fs.readFile(path.resolve(binaryPath), (err, fileContents) => {
      if (err) {
        reject(err)
      }
      resolve(fileContents);
    });
  })
    .then((fileContents: string) => {
      hash.update(fileContents);
      const hashDigest: string = hash.digest('hex').toLowerCase();
      let expectedHashPath: string = path.resolve(path.dirname(binaryPath), `${getServerBinaryNameWithoutExtension()}.sha256`);
      if (!fs.existsSync(expectedHashPath)) {
        expectedHashPath = path.resolve(__dirname, `../${getServerBinaryNameWithoutExtension()}.sha256`);
      }
      if (getTrustedHashes().includes(hashDigest)) {
        return true;
      }
      if (!fs.existsSync(expectedHashPath)) {
        return askIfTrustsUnrecognizedBinary(hashDigest, binaryPath);
      }
      const expectedHash = fs.readFileSync(expectedHashPath).toString('utf-8').toLowerCase().split(' ')[0].trim();
      if (hashDigest === expectedHash) {
        return true;
      }
      return askIfTrustsUnrecognizedBinary(hashDigest, binaryPath);
    })
    .catch((_err) => {
      return false;
    });
}

/**
 * Returns the environment variables to use to run the server as an object
 *
 * @returns the environment variables to use to run the server as an object
 */
function getBinaryEnvironment(): any {
  const proxySettings: ProxySettings = getProxySettings();
  if (proxySettings) {
    return { ...process.env, ...getProxySettingsAsEnvironmentVariables(proxySettings) };
  }
  return process.env;
}

/**
 * Returns the name of the server binary file for the current OS and architecture
 *
 * @return the name of the server binary file for the current OS and architecture
 */
function getServerBinaryNameWithoutExtension(): string {
  switch (os.platform()) {
    case 'darwin':
      // FIXME: once we support Apple ARM, incorporate the architecture into this string
      return 'lemminx-osx-x86_64';
    default:
      return `lemminx-${os.platform}`;
  }
}

/**
 * Returns the extension of the binary server for the current OS
 *
 * @return the extension of the binary server for the current OS
 */
function getServerBinaryExtension(): string {
  switch (os.platform()) {
    case 'win32':
      return '.exe';
    default:
      return '';
  }
}

/**
 * Returns the URL of the server where the binary version of LemMinX should be downloaded from
 *
 * @return the URL of the server where the binary version of LemMinX should be downloaded from
 */
function getServerBinaryDownloadUrl(): string {
  return extensions.getExtension("redhat.vscode-xml").packageJSON['binaryServerDownloadUrl'][getServerBinaryNameWithoutExtension().substring(8)] as string;
}

/**
 * Returns true if the user decides to trust the binary, and false if they ignore the message or don't trust the binary
 *
 * @returns true if the user decides to trust the binary, and false if they ignore the message or don't trust the binary
 */
async function askIfTrustsUnrecognizedBinary(hash: string, path: string): Promise<boolean> {
  const YES = 'Yes';
  const NO = 'No';
  return window.showErrorMessage(`The server binary ${path} is not trusted. `
      + 'Running the file poses a threat to your system\'s security. '
      + 'Do you want to add this binary to the list of trusted binaries and run it?', YES, NO)
    .then((val: string) => {
      if (val === YES) {
        addTrustedHash(hash);
        return true;
      }
      return false;
    });
}

/**
 * Performs https.get if the url begins with "https://", and performs http.get otherwise
 *
 * @param url The url get
 * @param callback The callback function to handle the URL request
 * @return the client request generated by https.get or http.get
 */
function httpHttpsGet(url: string, callback: (response: http.IncomingMessage) => void): http.ClientRequest {
  if (HTTPS_PATTERN.test(url)) {
    return https.get(url, callback);
  }
  return http.get(url, callback);
}

/**
 * Show a progress notification for the given get response
 *
 * Inspired by
 * https://stackoverflow.com/questions/18323152/get-download-progress-in-node-js-with-request
 *
 * @param response the http GET response
 */
function showProgressForDownload(response: http.IncomingMessage, httpClient: http.ClientRequest) {
  const progressOptions: ProgressOptions = {
    location: ProgressLocation.Notification,
    cancellable: true,
    title: "Downloading the XML Language Server..."
  };
  window.withProgress(
    progressOptions,
    (progress, cancelToken) => {
      const size: number = parseInt(response.headers['content-length']);
      let downloaded = 0;
      let previousReportedDownloadedPercent = 0;
      response.on("data", (chunk) => {
        downloaded += chunk.length;
        const incrementAmt = ((100.0 * downloaded / size) - previousReportedDownloadedPercent);
        previousReportedDownloadedPercent += incrementAmt;
        progress.report({
          increment: incrementAmt
        });
      });
      const downloadFinish: Promise<void> = new Promise((resolve, _reject) => {
        response.on("close", () => {
          resolve();
        });
      });
      cancelToken.onCancellationRequested((_e: any) => {
        httpClient.abort();
      })
      return downloadFinish;
    });
}

/**
 * Unzips the contents of the response and writes the contained file to a local file, marks the file as executable, and returns the path to the file
 *
 * @param response The response to write to file
 * @returns the path to the extracted file
 * @throws error if there are multiple files in the zip archive or if the file can't be extracted
 */
async function acceptZipDownloadResponse(response: http.IncomingMessage): Promise<string> {

  const serverBinaryPath: string = path.resolve(__dirname, '../server', getServerBinaryNameWithoutExtension() + getServerBinaryExtension());
  const serverBinaryZipPath: string = serverBinaryPath + '.zip';

  // Download zip
  await new Promise((resolve, reject) => {
    const serverBinaryZipWriteStream: fs.WriteStream = fs.createWriteStream(serverBinaryZipPath);
    let capturedError: any = null;
    serverBinaryZipWriteStream.on('finish', () => {
      serverBinaryZipWriteStream.close();
    });
    serverBinaryZipWriteStream.on('close', () => {
      if (capturedError) {
        fs.unlinkSync(serverBinaryZipPath);
        reject(capturedError);
        return;
      }
      resolve();
    });
    response.on('aborted', () => {
      capturedError = ABORTED_ERROR;
      serverBinaryZipWriteStream.end();
    })
    response.pipe(serverBinaryZipWriteStream);
  });

  // Extract zip
  return new Promise((resolve, reject)=> {
    const serverBinaryWriteStream: fs.WriteStream = fs.createWriteStream(serverBinaryPath);
    let capturedError: any = null;
    serverBinaryWriteStream.on('finish', () => {
      serverBinaryWriteStream.close();
    });
    serverBinaryWriteStream.on('close', () => {
      if (capturedError) {
        fs.unlinkSync(serverBinaryPath);
        reject(capturedError);
      }
      fs.chmodSync(serverBinaryPath, "766");
      resolve(serverBinaryPath);
    });
    // lazyEntries --> manually trigger 'entry' events
    yauzl.open(serverBinaryZipPath, { lazyEntries: true, autoClose: true }, (err: Error, zipFile: yauzl.ZipFile) => {
      if (err) {
        capturedError = err;
        serverBinaryWriteStream.close();
        return;
      }
      zipFile.on('error', (err) => {
        capturedError = err;
        serverBinaryWriteStream.close();
        zipFile.close();
      });
      zipFile.on('close', () => {
        fs.unlinkSync(serverBinaryZipPath);
      });
      zipFile.on('entry', (entry: yauzl.Entry) => {
        if (capturedError) {
          return;
        }
        zipFile.openReadStream(entry, (err: Error, stream: Readable) => {
          if (err) {
            capturedError = err;
            serverBinaryWriteStream.close();
            return;
          }
          stream.pipe(serverBinaryWriteStream);
        });
      });
      if (zipFile.entryCount !== 1) {
        capturedError = new Error('More than 1 file in the downloaded zip of the binary server');
        serverBinaryWriteStream.close();
        zipFile.close();
        return;
      }
      zipFile.readEntry();
    });
  });
}

/**
 * Writes the contents of the response to a file, marks it as executable, and returns the path to the file
 *
 * @param response The response to write to file
 * @returns the path to the file
 */
async function acceptBinaryDownloadResponse(response: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const serverBinaryPath: string = path.resolve(__dirname, '../server', getServerBinaryNameWithoutExtension() + getServerBinaryExtension());
    const serverBinaryFileStream = fs.createWriteStream(serverBinaryPath);
    let capturedError = null;
    serverBinaryFileStream.on('finish', () => {
      serverBinaryFileStream.close();
    });
    serverBinaryFileStream.on('close', () => {
      if (capturedError) {
        fs.unlinkSync(serverBinaryPath);
        reject(capturedError);
        return;
      }
      fs.chmodSync(serverBinaryPath, "766");
      resolve(serverBinaryPath);
    });
    response.on('aborted', () => {
      capturedError = ABORTED_ERROR;
      serverBinaryFileStream.close();
    });
    response.pipe(serverBinaryFileStream);
  });
}
