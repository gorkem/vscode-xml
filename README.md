# XML Language Support by Red Hat

[![Join the chat at https://gitter.im/redhat-developer/vscode-xml](https://badges.gitter.im/redhat-developer/vscode-xml.svg)](https://gitter.im/redhat-developer/vscode-xml?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Marketplace Version](https://vsmarketplacebadge.apphb.com/version/redhat.vscode-xml.svg "Current Release")](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-xml)

## Description

This VS Code extension provides support for creating and editing XML documents, based on the [LemMinX XML Language Server](https://github.com/eclipse/lemminx), running with Java.

![Basic features](https://user-images.githubusercontent.com/148698/45977901-df208a80-c018-11e8-85ec-71c70ba8a5ca.gif)

## Features

  * Syntax error reporting
  * General code completion
  * Auto-close tags
  * Automatic node indentation
  * Symbol highlighting
  * Document folding
  * Document links
  * [Document symbols and outline](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Symbols.md)
  * Renaming support
  * [Document Formatting](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Formatting.md)
  * [DTD validation](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Validation.md#validation-with-dtd-grammar)
  * DTD completion
  * DTD formatting
  * [XSD validation](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Validation.md#validation-with-xsd-grammar)
  * XSD based hover
  * XSD based code completion
  * XSL support
  * [XML catalogs](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Validation.md#xml-catalog-with-xsd)
  * File associations
  * Code actions
  * Schema Caching

See the [changelog](CHANGELOG.md) for the latest release. 

You might also find useful information in the [Online XML Documentation](https://github.com/redhat-developer/vscode-xml/blob/master/docs/README.md) 
or you can read this documentation inside vscode with the command `Open XML Document` available with `Ctrl+Shift+P`:

![XML Open Documentation](https://raw.githubusercontent.com/redhat-developer/vscode-xml/master/docs/images/Commands/XMLCommands.png)

## Requirements

  * Java JDK (or JRE) 8 or more recent
  * Ensure Java path is set in either:
    * `xml.java.home` in VSCode preferences
    * `java.home` in VSCode preferences
    * Environment variable `JAVA_HOME` or `JDK_HOME`
    * **Note**: The path should end at the parent folder that contains the `bin` folder.  
      **Example Path**: `/usr/lib/jvm/java-1.8.0` if `bin` exists at `/usr/lib/jvm/java-1.8.0/bin`.
    * **Note**: If the path is not set, the extension will attempt to find the path to the JDK or JRE.

See [how to set java home](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Preferences.md#java-home) for more information how this extension searches for Java.

## Supported VS Code settings

The following settings are supported:

* [`xml.java.home`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Preferences.md#java-home): Set the Java path required to run the XML Language Server. If not set, falls back  to either the `java.home` preference or the `JAVA_HOME` or `JDK_HOME` environment variables.
* [`xml.server.vmargs`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Preferences.md#server-vm-arguments): Specifies extra VM arguments used to launch the XML Language Server.  
   Eg. use `-Xmx1G  -XX:+UseG1GC -XX:+UseStringDeduplication` to bypass class verification, increase the heap size to 1GB and enable String deduplication with the G1 Garbage collector.
* [`xml.server.workDir`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Preferences.md#server-cache-path): Set a custom folder path for cached XML Schemas. An absolute path is expected, although the `~` prefix (for the user home directory) is supported. Default is `~/.lemminx`.
* `xml.trace.server`: Trace the communication between VS Code and the XML language server in the Output view. Default is `off`.
* `xml.logs.client`: Enable/disable logging to the Output view. Default is `true`.
* [`xml.catalogs`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Preferences.md#catalogs): Register XML catalog files.
* [`xml.fileAssociations`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Preferences.md#file-associations): Allows XML schemas/ DTD to be associated to file name patterns.
* [`xml.format.enabled`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Formatting.md#xmlformatenabled): Enable/disable ability to format document. Default is `true`.
* [`xml.format.emptyElements`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Formatting.md#xmlformatemptyelements): Expand/collapse empty elements. Default is `ignore`.
* [`xml.format.enforceQuoteStyle`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Formatting.md#xmlformatenforcequotestyle): Enforce `preferred` quote style (set by `xml.preferences.quoteStyle`) or `ignore` quote style when formatting. Default is `ignore`.
* [`xml.format.joinCDATALines`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Formatting.md#xmlformatjoincdatalines): Set to `true` to join lines in CDATA content during formatting. Default is `false`.
* [`xml.format.joinCommentLines`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Formatting.md#xmlformatjoincommentlines): Set to `true` to join lines in comments during formatting. Default is `false`.
* [`xml.format.joinContentLines`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Formatting.md#xmlformatjoincontentlines): Normalize the whitespace of content inside an element. Newlines and excess whitespace are removed. Default is `false`.
* [`xml.format.preserveAttributeLineBreaks`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Formatting.md#xmlformatpreserveattributelinebreaks): Preserve line breaks that appear before and after attributes. Default is `false`.  
  **IMPORTANT**: This setting is overridden if `xml.format.splitAttributes` is set to `true`.
* [`xml.format.preserveEmptyContent`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Formatting.md#xmlformatpreserveemptycontent): Preserve empty content/whitespace in a tag. Default is `false`.
* [`xml.format.preservedNewLines`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Formatting.md#xmlformatpreservednewlines): Preserve new lines that separate tags. The value represents the maximum number of new lines per section. A value of 0 removes all new lines. Default is `2`.
* [`xml.format.spaceBeforeEmptyCloseTag`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Formatting.md#xmlformatspacebeforeemptyclosetag): Insert space before end of self closing tag.  
  Example: ```<tag/> -> <tag />```. Default is `true`.
* [`xml.format.splitAttributes`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Formatting.md#xmlformatsplitattributes): Split multiple attributes each onto a new line. Default is `false`.
* `xml.preferences.quoteStyle`: Preferred quote style to use for completion: `single` quotes, `double` quotes. Default is `double`.
* `xml.autoCloseTags.enabled` : Enable/disable autoclosing of XML tags. Default is `true`.  
  **IMPORTANT**: The following settings must be turned of for this to work: `editor.autoClosingTags`, `editor.autoClosingBrackets`.
* [`xml.codeLens.enabled`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/CodeLens.md): Enable/disable XML CodeLens. Default is `false`.
* [`xml.preferences.showSchemaDocumentationType`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Preferences.md#documentation-type): Specifies the source of the XML schema documentation displayed on hover and completion. Default is `all`.
* [`xml.validation.enabled`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Validation.md): Enable/disable all validation. Default is `true`.
* `xml.validation.schema`: Enable/disable schema based validation. Default is `true`. Ignored if `xml.validation.enabled` is set to `false`
* [`xml.validation.disallowDocTypeDecl`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Validation.md#disallow-doc-type-declarations): Enable/disable if a fatal error is thrown if the incoming document contains a DOCTYPE declaration. Default is `false`.
* [`xml.validation.resolveExternalEntities`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Validation.md#resolve-external-entities): Enable/disable resolve of external entities. Default is `false`.
* [`xml.validation.noGrammar`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Preferences.md#grammar): The message severity when a document has no associated grammar. Defaults to `hint`.
* [`xml.symbols.enabled`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Symbols.md#xmlsymbolsenabled): Enable/disable document symbols (Outline). Default is `true`.
* `xml.symbols.excluded`: Disable document symbols (Outline) for the given file name patterns. Updating file name patterns does not automatically reload the Outline view for the relevant file(s). Each file must either be reopened or changed, in order to trigger an Outline view reload.
* [`xml.symbols.maxItemsComputed`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Symbols.md#xmlsymbolsmaxitemscomputed): The maximum number of outline symbols and folding regions computed (limited for performance reasons). Default is `5000`.
* [`xml.symbols.showReferencedGrammars`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Symbols.md#xmlsymbolsshowreferencedgrammars): Show referenced grammars in the Outline. Default is `true`.
* [`xml.symbols.filters`](https://github.com/redhat-developer/vscode-xml/blob/master/docs/Symbols.md#xmlsymbolsfilters): Allows XML symbols filter to be associated to file name patterns.
* `files.trimTrailingWhitespace`: Now affects XML formatting. Enable/disable trailing whitespace trimming when formatting an XML document. Default is `false`.

## Articles

 * [Improved XML grammar binding and more in Red Hat VS Code XML extension 0.13.0](https://developers.redhat.com/blog/2020/07/08/improved-xml-grammar-binding-and-more-in-red-hat-vs-code-xml-extension-0-13-0/)
 * [Improved schema binding and more in Red Hat XML extension for VS Code 0.12.0 and LemMinX](https://developers.redhat.com/blog/2020/07/02/improved-schema-binding-and-more-in-red-hat-xml-extension-for-vs-code-0-12-0-and-lemminx/)
 * [Eclipse LemMinX version 0.11.1](https://developers.redhat.com/blog/2020/03/27/red-hat-xml-language-server-becomes-lemminx-bringing-new-release-and-updated-vs-code-xml-extension/)
 * [What's new in the Visual Studio Code XML Extension 0.8.0](https://developers.redhat.com/blog/2019/07/24/whats-new-in-the-visual-studio-code-xml-extension/)

## Custom XML Extensions

The [LemMinX - XML Language Server](https://github.com/eclipse/lemminx) can be extended to support custom completion, hover, validation, rename, etc.
Please see the [extensions documentation](./docs/Extensions#custom-xml-extensions) for more information.

## Contributing

This is an open source project open to anyone. Contributions are extremely welcome!

For information on getting started, refer to the [CONTRIBUTING instructions](CONTRIBUTING.md).

CI builds can be installed manually by following these instructions:

  1) Download the latest development VSIX archive [from here](http://download.jboss.org/jbosstools/vscode-xml/staging/?C=M;O=D). `(vscode-xml-XXX.vsix)`

  2) Go to the Extensions section in VSCode.

  3) At the top right click the `...` icon.

  4) Select 'Install from VSIX...' and choose the visx file.

Feedback
===============
* File a bug in [GitHub Issues](https://github.com/redhat-developer/vscode-xml/issues),
* Chat with us on [Gitter](https://gitter.im/redhat-developer/vscode-xml),


## License

  EPL 1.0, See [LICENSE](https://github.com/redhat-developer/vscode-xml/blob/master/LICENSE) file.
