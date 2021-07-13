# Troubleshooting

## Issues

Please create [vscode-xml issues](https://github.com/redhat-developer/vscode-xml/issues) for any problem.

### No support on xml file.

Sometimes an old instance of the XML Language Server is still running.

You can check if the server is not working in VSCode by going to:
 1) Turning on `xml.trace.server` in the VSCode preferences
 2) `View -> Output -> XML Support` (drop down menu top right)
    If it is not working it will indicate the server has Shutdown.

You can kill the process by:

 1) Run `jps` command in terminal
 2) Check if multiple instances of `org.eclipse.lemminx-uber.jar` or `XMLServerLauncher`
 3) According to your OS:

  * on Windows OS: run `taskkill /F /PID ...` all instances
  * on other OS: run `kill -9 ...` all instances

### The Language Server Crashes Due to an Out Of Memory Error

If you are working with large XML files or referencing large schema files,
this may lead to the language server running out of memory.
The Java language server is more likely to run out memory than the binary language server.
Switching to the binary language server
or increasing the memory available to the Java language server could resolve this issue.

If you get an Out of Memory Error, but aren't working with large XML files,
then there may be a memory leak in the language server.
Please [file a issue](https://github.com/redhat-developer/vscode-xml/issues) with a description of what you were doing if this is the case.

#### How to increase the amount of memory available to the Java Language Server

1. Go to settings
2. Navigate to the setting `xml.server.vmargs`
3. Add `-Xmx512m` to the setting string. This allows the the language server to use at most 512 megabytes of memory.
4. If the problem persists, you can increase the `512m` to `1G` or higher
