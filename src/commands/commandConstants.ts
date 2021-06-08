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
 * Commonly used commands
 */

/**
 * Auto close tags
 */
export const AUTO_CLOSE_TAGS = 'xml.completion.autoCloseTags';

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

export const OPEN_DOCS = "xml.open.docs";

export const OPEN_DOCS_HOME = "xml.open.docs.home";

/**
 * VSCode client command to executes an LSP command on the XML Language Server
 */
export const EXECUTE_WORKSPACE_COMMAND = "xml.workspace.executeCommand";

export const VALIDATE_CURRENT_FILE = "xml.validation.current.file";

export const VALIDATE_ALL_FILES = "xml.validation.all.files";

