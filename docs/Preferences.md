## Java Home

  vscode-xml requires Java JDK (or JRE) 8 or more recent in order to run.

  Java is required, because the underlying [language server](https://microsoft.github.io/language-server-protocol/), [LemMinX](https://github.com/eclipse/lemminx), uses [Apache Xerces](https://xerces.apache.org/) in order to validate XML against a schema.

  Ensure that the Java path is set in either:
  * `"xml.java.home"` in VSCode preferences
  * `"java.home"` in VSCode preferences
  * An environment variable `JAVA_HOME` or `JDK_HOME`

  Please note:
  * The path should end at the parent folder that contains the bin folder. As an example, use `/usr/lib/jvm/java-1.8.0` if the bin folder exists at `/usr/lib/jvm/java-1.8.0/bin`.
  * If the path is not set, the extension will attempt to find the path to the JDK or JRE.

## Server VM Arguments

  Can be accessed through `xml.server.vmargs`.

  Setting up proxy:

  A proxy can be defined in the following way if there is a system proxy:

  ```
  -Djava.net.useSystemProxies=true -Dhttp.proxyUser=<user> -Dhttp.proxyPassword=<password>
  ```

   or if there is not a system proxy:

  ```
  -Dhttp.proxyHost=<proxy_host> -Dhttp.proxyPort=<proxy_port> -Dhttp.proxyUser=<user>
  -Dhttp.proxyPassword= <password> -Dhttps.proxyHost=<proxy_host> -Dhttps.proxyPort=<proxy_port>
  ```

## Server Cache Path

  vscode-xml maintains a cache of the schemas (eg: XSD, DTD) that are referenced using an internet URL.
  For instance, if you have an XML document associated with a schema that is available at `http://example.org/schemas/projectFileSchema.xsd`,
  vscode-xml will store that schema on your computer in order to improve performance and avoid re-downloading the file.
  The default path of this cache is: `~/.lemminx`.

  Use the setting `xml.server.workDir` in order to set a custom path for this cache.
  The path must be absolute, and works with the '~' shortcut for the home directory.
  (eg: `~/cache/.lemminxCache`)

## File Associations

  Can be accessed through `xml.fileAssociations`.

  Provides ability to associate a schema with a file pattern.

  Example:
  ```json
  [
    {
     "systemId": "path/to/file.xsd",
     "pattern": "file1.xml"
    },
    {
     "systemId": "http://www.w3.org/2001/XMLSchema.xsd",
     "pattern": "**/*.xsd"
    }
  ]
  ```

  Please see [XSD file associations](Validation#xml-file-association-with-xsd) and [DTD file associations](Validation#xml-file-association-with-dtd) for more information.

## Catalogs

  Can be accessed through `xml.catalogs`.

  Catalogs describe a mapping between external entity references and locally cached equivalents.

  The format should include local files and look like:

  ```json
  "catalogs": [
    "catalog.xml",
    "catalog2.xml"
  ]
  ```
## Grammar

  Can be accessed through: `xml.problems.noGrammar`

  When there are issues with grammar constraints like (Catalogs or Associations not properly configured)
  you can set message severity of the message the client will receive.

  Options:

*  ignore
*  hint **(default)**
*  info
*  warning
*  error

## Formatting

See the [Formatting page](Formatting#formatting).

## Code Lens

Use `xml.codeLens.enabled` in order to enable or disable code lens. Please see [the Code Lens page](CodeLens#code-lens) for more information.

## Documentation Type

Use `xml.preferences.showSchemaDocumentationType` in order to control which documentation is presented during completion and hover for XML documents associated with XSD schemas.
When you hover over an element in an XML document, the documentation is pulled from the `xs:documentation` and `xs:appinfo` elements. These elements are nested under the definition of the hovered element in the schema.

As an example, here is a schema with documentation:

```xml
<xs:schema
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns="http://example.org/schema/complexSchema"
    targetNamespace="http://example.org/schema/complexSchema">
  <xs:simpleType name="color">
    <xs:restriction base="xs:string">
      <xs:pattern value="[0-9A-F]{6}" />
    </xs:restriction>
  </xs:simpleType>
  <xs:element name="boot">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="size" type="xs:positiveInteger">
          <xs:annotation>
            <xs:appinfo>Used to distinguish boots of different sizes</xs:appinfo>
            <xs:documentation>The size of the boot</xs:documentation>
            <xs:documentation>This number is not based on metric or imperial units of measurement</xs:documentation>
          </xs:annotation>
        </xs:element>
        <xs:element name="color" type="color">
          <xs:annotation>
            <xs:appinfo>Used to accurately display the boots color</xs:appinfo>
            <xs:documentation>The color of the boot as an RBG hexadecimal number</xs:documentation>
          </xs:annotation>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
  <xs:element name="root">
    <xs:annotation>
      <xs:appinfo>Contains the boots</xs:appinfo>
      <xs:documentation>Holds zero or more boots</xs:documentation>
    </xs:annotation>
    <xs:complexType>
      <xs:sequence>
        <xs:element ref="boot" minOccurs="0" maxOccurs="unbounded" />
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
```

The different options are:
 * `documentation`: Show only the content of `xs:documentation` elements
 * `appinfo`: Show only the content of `xs:appinfo` elements
 * `all`: Show the content of `xs:appinfo` and `xs:documentation`, separated by subtitles
 * `none`: Neither `xs:appinfo` nor `xs:documentation` are shown.

Here is a demonstration of the effects of the setting on hovering. The above schema is used in the example:

![Changing the documentation type setting changes which text the hover shows when hovering over an element that is in a schema document](./images/Preferences/HoverDocumentationQuickDemo.gif)
