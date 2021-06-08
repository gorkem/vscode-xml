import { XMLFileAssociation } from "../api/xmlExtensionApi";

/**
 * Represents vscode-xml settings that other vscode extensions can contribute to
 */
export class ExternalXmlSettings {

  private _xmlCatalogs: string[]
  private _xmlFileAssociations: XMLFileAssociation[]

  constructor() {
    this._xmlCatalogs = [];
    this._xmlFileAssociations = [];
  }

  get xmlCatalogs(): string[] {
    return this._xmlCatalogs;
  }

  get xmlFileAssociations(): XMLFileAssociation[] {
    return this._xmlFileAssociations;
  }

}