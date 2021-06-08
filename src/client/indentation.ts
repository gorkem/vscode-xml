import { IndentAction, LanguageConfiguration } from "vscode";

export function getIndentationRules(): LanguageConfiguration {
  return {

    // indentationRules referenced from:
    // https://github.com/microsoft/vscode/blob/d00558037359acceea329e718036c19625f91a1a/extensions/html-language-features/client/src/htmlMain.ts#L114-L115
    indentationRules: {
      increaseIndentPattern: /<(?!\?|[^>]*\/>)([-_.A-Za-z0-9]+)(?=\s|>)\b[^>]*>(?!.*<\/\1>)|<!--(?!.*-->)|\{[^}"']*$/,
      decreaseIndentPattern: /^\s*(<\/[-_.A-Za-z0-9]+\b[^>]*>|-->|\})/
    },
    onEnterRules: [
      {
        beforeText: new RegExp(`<([_:\\w][_:\\w-.\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
        afterText: /^<\/([_:\w][_:\w-.\d]*)\s*>/i,
        action: { indentAction: IndentAction.IndentOutdent }
      },
      {
        beforeText: new RegExp(`<(\\w[\\w\\d]*)([^/>]*(?!/)>)[^<]*$`, 'i'),
        action: { indentAction: IndentAction.Indent }
      }
    ]
  };
}