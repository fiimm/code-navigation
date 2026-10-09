import * as vscode from 'vscode';
import * as path from 'path';
import { ConfigService } from './configService';
import { FileScanner } from './fileScanner';
import { TagParser } from './tagParser';
import { TreeBuilder, NavNode } from './treeBuilder';
import { NavTreeDataProvider } from './navTreeDataProvider';

const output = vscode.window.createOutputChannel('Code Navigation');

export function activate(context: vscode.ExtensionContext) {
  output.show(true);
  output.appendLine(`[DEBUG] Workspace folders: ${JSON.stringify(vscode.workspace.workspaceFolders?.map(f => f.uri.fsPath))}`);
  output.appendLine('[ACTIVATE] Code Navigation extension activated');

  const config = new ConfigService();
  const scanner = new FileScanner(config, output);
  const parser = new TagParser(config, output);
  const treeBuilder = new TreeBuilder(config);
  const treeProvider = new NavTreeDataProvider();

  // Кэш тегов по файлам
  const tagCache = new Map<string, import('./tagParser').NavTag[]>();

  // Команда навигации
  context.subscriptions.push(
    vscode.commands.registerCommand('codeNav.navigateTo', async (node: NavNode) => {
      if (node.occurrences.length === 0) return;

      if (node.occurrences.length === 1) {
        const occ = node.occurrences[0];
        await navigateToFile(occ.filePath, occ.line);
      } else {
        const items = node.occurrences.map(occ => {
          const fileName = path.basename(occ.filePath);
          return {
            label: fileName,
            description: `:${occ.line + 1}`,
            filePath: occ.filePath,
            line: occ.line
          };
        });

        const picked = await vscode.window.showQuickPick(items, {
          placeHolder: `Navigate to ${node.label} (${node.occurrences.length} occurrences)`
        });

        if (picked) {
          await navigateToFile(picked.filePath, picked.line);
        }
      }
    })
  );

  // Функция перехода к файлу и строке
  async function navigateToFile(filePath: string, line: number) {
    try {
      const uri = vscode.Uri.file(filePath);
      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc);
      const position = new vscode.Position(line, 0);
      const range = new vscode.Range(position, position);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
      output.appendLine(`[NAV] Navigated to ${filePath}:${line + 1}`);
    } catch (e) {
      vscode.window.showErrorMessage(`Cannot open file: ${(e as Error).message}`);
    }
  }

  // Пересобираем дерево из кэша
  function rebuildTreeFromCache() {
    const allTags: import('./tagParser').NavTag[] = [];
    for (const tags of tagCache.values()) {
      allTags.push(...tags);
    }
    const tree = treeBuilder.buildTree(allTags);
    treeProvider.updateTree(tree);
    output.appendLine(`[CACHE] Tree rebuilt: ${tagCache.size} files, ${allTags.length} tags`);
  }

  // Полное сканирование
  async function fullRefresh() {
    tagCache.clear();
    const files = await scanner.scanEnabledFiles();
    const tags = await parser.parseFiles(files);
    
    for (const tag of tags) {
      if (!tagCache.has(tag.filePath)) {
        tagCache.set(tag.filePath, []);
      }
      tagCache.get(tag.filePath)!.push(tag);
    }

    rebuildTreeFromCache();
    return { fileCount: files.length, tagCount: tags.length };
  }

  // Обработка сохранения файла
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (doc) => {
      const filePath = doc.uri.fsPath;
      const marker = config.enabledMarker;
      const linesCount = config.scanFirstLines;
      const lineCount = Math.min(doc.lineCount, linesCount);
      
      let hasMarker = false;
      for (let i = 0; i < lineCount; i++) {
        if (doc.lineAt(i).text.includes(marker)) {
          hasMarker = true;
          break;
        }
      }

      if (hasMarker) {
        const tags = await parser.parseFile(doc.uri);
        tagCache.set(filePath, tags);
        output.appendLine(`[SAVE] Re-parsed ${filePath}: ${tags.length} tags`);
      } else {
        if (tagCache.has(filePath)) {
          tagCache.delete(filePath);
          output.appendLine(`[SAVE] Removed ${filePath} from cache (no ENABLED marker)`);
        } else {
          return;
        }
      }

      rebuildTreeFromCache();
    })
  );

  // === НОВОЕ: FileWatcher для удаления файлов ===
  const watcher = vscode.workspace.createFileSystemWatcher('**/*');
  
  context.subscriptions.push(
    watcher.onDidDelete((uri) => {
      const filePath = uri.fsPath;
      if (tagCache.has(filePath)) {
        tagCache.delete(filePath);
        output.appendLine(`[DELETE] File removed: ${filePath}`);
        rebuildTreeFromCache();
      }
    })
  );

  context.subscriptions.push(watcher);
  // === КОНЕЦ НОВОГО ===

  // Обновление при изменении настроек
  context.subscriptions.push(
    config.onDidChange(async () => {
      output.appendLine('[CONFIG] Settings changed, full rescan...');
      await fullRefresh();
      vscode.window.showInformationMessage('Code Nav: settings updated');
    })
  );

  // Первое обновление при активации
  fullRefresh().then(result => {
    setTimeout(() => {
      vscode.window.showInformationMessage(
        `Code Nav: ${result.fileCount} file(s), ${result.tagCount} tag(s)`
      );
    }, 500);
  });

  const treeView = vscode.window.createTreeView('codeNavView', {
    treeDataProvider: treeProvider,
    showCollapseAll: true
  });

  context.subscriptions.push(treeView, config, output);
}

export function deactivate() {}