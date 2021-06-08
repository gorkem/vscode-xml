import * as path from "path";
import { TextDocument, window, workspace, WorkspaceFolder } from "vscode";
import { XMLFileAssociation } from "../api/xmlExtensionApi";

/**
 * Represents a variable that refers to a value that can be resolved
 */
class VariableSubstitution {

  private varName: string;
  private varKind: VariableSubstitutionKind;
  private getValue: (currentFileUri: string, currentWorkspaceUri: string) => string;
  private replaceRegExp: RegExp | undefined;

  /**
   *
   * @param name the name of this variable
   * @param kind the kind of this variable
   * @param getValue a function that resolves the value of the variable
   */
  constructor(name: string, kind: VariableSubstitutionKind, getValue: (currentFileUri: string, currentWorkspaceUri: string) => string) {
    this.varName = name;
    this.varKind = kind;
    this.getValue = getValue;
  }

  public get name(): string {
    return this.varName;
  }

  public get kind(): VariableSubstitutionKind {
    return this.varKind;
  }

  /**
   * Returns the string with the references to this variable replaced with the value, or the original string if the value cannot be resolved
   *
   * @param original the string to substitute variable value
   * @param currentFileUri the uri of the currently focused file, as a string
   * @param currentWorkspaceUri the uri of the root of the currently open workspace, as a string
   * @returns the string with the references to this variable replaced with the value, or the original string if the value cannot be resolved
   */
  public substituteString(original: string, currentFileUri: string, currentWorkspaceUri: string): string {
    const value: string = this.getValue(currentFileUri, currentWorkspaceUri);
    return value ? original.replace(this.getReplaceRegExp(), value) : original;
  }

  /**
   * Returns a regex that matches all references to the variable
   *
   * Lazily initialized
   *
   * @returns a regex that matches all references to the variable
   */
  public getReplaceRegExp(): RegExp {
    if (!this.replaceRegExp) {
      this.replaceRegExp = new RegExp('\\$\\{' + `${this.name}` + '\\}', 'g');
    }
    return this.replaceRegExp;
  }
}

enum VariableSubstitutionKind {
  Workspace,
  File
}

// A list of all variable substitutions. To add a new variable substitution, add an entry to this list
const VARIABLE_SUBSTITUTIONS: VariableSubstitution[] = [
  new VariableSubstitution(
    "workspaceFolder",
    VariableSubstitutionKind.Workspace,
    (currentFileUri: string, currentWorkspaceUri: string): string => {
      return currentWorkspaceUri;
    }
  ),
  new VariableSubstitution(
    "fileDirname",
    VariableSubstitutionKind.File,
    (currentFileUri: string, _currentWorkspaceUri: string): string => {
      return path.dirname(currentFileUri);
    }
  ),
  new VariableSubstitution(
    "fileBasenameNoExtension",
    VariableSubstitutionKind.File,
    (currentFileUri: string, _currentWorkspaceUri: string): string => {
      return path.basename(currentFileUri, path.extname(currentFileUri));
    }
  )
];

/**
 * Returns the file associations with as many variable references resolved as possible
 *
 * @param associations the file associations to resolve the variable references in
 * @returns the file associations with as many variable references resolved as possible
 */
export function getVariableSubstitutedAssociations(associations: XMLFileAssociation[]): XMLFileAssociation[] {

  // Collect properties needed to resolve variables
  const currentFile: TextDocument = (window.activeTextEditor && window.activeTextEditor.document && window.activeTextEditor.document.languageId === 'xml') ?  window.activeTextEditor.document : undefined;
  const currentFileUri: string = (currentFile && currentFile.uri) ? currentFile.uri.fsPath : undefined;
  const currentWorkspace: WorkspaceFolder = (currentFile && currentFile.uri) ?  workspace.getWorkspaceFolder(currentFile.uri) : undefined;
  const currentWorkspaceUri: string = (currentWorkspace && currentWorkspace.uri.fsPath)
    || (workspace.workspaceFolders && workspace.workspaceFolders[0].uri.fsPath);

  // Remove variables that can't be resolved
  let variablesToSubstitute = VARIABLE_SUBSTITUTIONS;
  if (!currentWorkspaceUri) {
    variablesToSubstitute = variablesToSubstitute.filter(variable => { return variable.kind !== VariableSubstitutionKind.Workspace });
  }
  if (!currentFileUri) {
    variablesToSubstitute = variablesToSubstitute.filter(variable => { return variable.kind !== VariableSubstitutionKind.File });
  }

  /**
   * Returns the string with the values for all the variables that can be resolved substituted in the string
   *
   * @param val the value to substitute the variables into
   * @return the string with the values for all the variables that can be resolved substituted in the string
   */
  const subVars = (val: string): string => {
    let newVal = val;
    for (const settingVariable of variablesToSubstitute) {
      newVal = settingVariable.substituteString(newVal, currentFileUri, currentWorkspaceUri);
    }
    return newVal;
  }

  return associations.map((association: XMLFileAssociation) => {
    return {
      pattern: subVars(association.pattern),
      systemId: subVars(association.systemId)
    };
  });
}

/**
 * Returns true if any of the file associations contain references to variables that refer to current file, and false otherwise
 *
 * @param associations A list of file associations to check
 * @returns true if any of the file associations contain references to variables that refer to current file, and false otherwise
 */
export function containsVariableReferenceToCurrentFile(associations: XMLFileAssociation[]): boolean {
  const fileVariables: VariableSubstitution[] = VARIABLE_SUBSTITUTIONS.filter(variable => variable.kind === VariableSubstitutionKind.File);
  for (const association of associations) {
    for (const variable of fileVariables) {
      if (variable.getReplaceRegExp().test(association.pattern) || variable.getReplaceRegExp().test(association.systemId)) {
        return true;
      }
    }
  }
  return false;
}
