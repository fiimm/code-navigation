import * as vscode from 'vscode';
import { ConfigService } from './configService';
import { expandSlashTag } from './tagUtils';

export interface NavTag {
  tag: string;      // Полное имя тега после префикса, например "INIT_BLE1_MAIN"
  line: number;     // Номер строки (0-based)
  filePath: string; // Путь к файлу
}

export class TagParser {
  constructor(
    private config: ConfigService,
    private output: vscode.OutputChannel
  ) {}

  /**
   * Парсит один файл и возвращает все найденные NAV-теги.
   */
  async parseFile(uri: vscode.Uri): Promise<NavTag[]> {
    const tags: NavTag[] = [];
    
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      const regex = this.config.tagRegex;
      
      // Сбрасываем lastIndex для глобального regex
      regex.lastIndex = 0;

      for (let i = 0; i < doc.lineCount; i++) {
        const lineText = doc.lineAt(i).text;
        let match;
        
        // Ищем все совпадения в строке
        while ((match = regex.exec(lineText)) !== null) {
          const rawTag = match[1];
          const expanded = expandSlashTag(rawTag, msg => this.output.appendLine(msg));
          for (const t of expanded) {
            tags.push({
              tag: t,
              line: i,
              filePath: uri.fsPath
            });
          }
        }
      }

      this.output.appendLine(`[PARSE] ${uri.fsPath}: found ${tags.length} tags`);
    } catch (e) {
      this.output.appendLine(`[PARSE] Error in ${uri.fsPath}: ${(e as Error).message}`);
    }

    return tags;
  }

  /**
   * Парсит массив файлов и возвращает плоский список всех тегов.
   */
  async parseFiles(uris: vscode.Uri[]): Promise<NavTag[]> {
    const allTags: NavTag[] = [];
    
    for (const uri of uris) {
      const tags = await this.parseFile(uri);
      allTags.push(...tags);
    }

    this.output.appendLine(`[PARSE] Total: ${allTags.length} tags from ${uris.length} files`);
    return allTags;
  }
}