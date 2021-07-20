/**
 *  Copyright (c) 2019 Red Hat, Inc. and others.
 *  All rights reserved. This program and the accompanying materials
 *  are made available under the terms of the Eclipse Public License v2.0
 *  which accompanies this distribution, and is available at
 *  https://www.eclipse.org/legal/epl-v20.html
 *
 *  Contributors:
 *  Red Hat Inc. - initial API and implementation
 */
'use strict';

/**
 * VScode client commands.
 */
export namespace ClientCommandConstants {

  /**
   * Show XML references
   */
  export const SHOW_REFERENCES = 'xml.show.references';

  /**
   * Show editor references
   */
  export const EDITOR_SHOW_REFERENCES = 'editor.action.showReferences';

  /**
   * Reload VS Code window
   */
  export const RELOAD_WINDOW = 'workbench.action.reloadWindow';

  /**
   * Open settings command
   *
   * A `settingId: string` parameter can be optionally provided
   */
  export const OPEN_SETTINGS = 'xml.open.settings';

  /**
   * Render markdown string to html string
   */
  export const MARKDOWN_API_RENDER = 'markdown.api.render';

  export const OPEN_DOCS = 'xml.open.docs';

  /**
   * Commands to revalidate files with an LSP command on the XML Language Server
   */
  export const VALIDATE_CURRENT_FILE = 'xml.validation.current.file';

  export const VALIDATE_ALL_FILES = 'xml.validation.all.files';

  export const OPEN_DOCS_HOME = 'xml.open.docs.home';

  /**
   * VSCode client commands to open the binding wizard to bind a XML to a grammar/schema.
   */
  export const OPEN_BINDING_WIZARD = 'xml.open.binding.wizard';

  /**
   * VSCode client command to open the grammar/schema binding wizard from command menu.
   */
  export const COMMAND_PALETTE_BINDING_WIZARD = 'xml.command.bind.grammar';

  /**
   * Client command to execute an XML command on XML Language Server side.
   */
  export const EXECUTE_WORKSPACE_COMMAND = 'xml.workspace.executeCommand';
}

/**
 * XML Language Server commands.
 */
export namespace ServerCommandConstants {

  /**
   * Auto close tags
   */
  export const AUTO_CLOSE_TAGS = 'xml.completion.autoCloseTags';

  /**
   * Commands to revalidate files with an LSP command on the XML Language Server
   */
  export const VALIDATE_CURRENT_FILE = ClientCommandConstants.VALIDATE_CURRENT_FILE;

  export const VALIDATE_ALL_FILES = ClientCommandConstants.VALIDATE_ALL_FILES;

  /**
   * Command to associate a grammar in a XML document
   */
  export const ASSOCIATE_GRAMMAR_INSERT = "xml.associate.grammar.insert";

  /**
   * Command to check if the current XML document is bound to a grammar
   */
  export const CHECK_BOUND_GRAMMAR = "xml.check.bound.grammar"
}