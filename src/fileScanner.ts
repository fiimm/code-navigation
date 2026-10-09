import * as vscode from 'vscode';
import { ConfigService } from './configService';

export class FileScanner {
  constructor(
    private config: ConfigService,
    private output: vscode.OutputChannel
  ) {}

  async scanEnabledFiles(): Promise<vscode.Uri[]> {
    const marker = this.config.enabledMarker;
    const linesCount = this.config.scanFirstLines;

    const includePattern = '**/*.{c,h,cpp,hpp,hh,cc,py,sh,bat,txt,lua,rs,toml}';
    
    const excludePattern = '{' + [
      '**/node_modules/**',
      '**/.git/**',
      '**/out/**',
      '**/build/**',
      '**/managed_components/**',
      '**/components/**',
      '**/sdkconfig*',
      '**/sdkconfig.old',
      '**/CMakeFiles/**',
      '**/.vscode/**',
      '**/*.bin',
      '**/*.hex',
      '**/*.elf',
      '**/*.o',
      '**/*.obj',
      '**/*.a',
      '**/*.lib',
      '**/*.so',
      '**/*.dll',
      '**/*.exe'
    ].join(',') + '}';

    const startTime = Date.now();
    const files = await vscode.workspace.findFiles(includePattern, excludePattern);
    
    this.output.appendLine(`[SCAN] Found ${files.length} source files to check`);

    // Параллельная обработка с батчами по 50 файлов
    const BATCH_SIZE = 50;
    const enabled: vscode.Uri[] = [];
    let skipped = 0;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(uri => this._checkFile(uri, marker, linesCount))
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result === true) {
          enabled.push(batch[j]);
        } else if (result === 'skipped') {
          skipped++;
        }
      }
    }

    const elapsed = Date.now() - startTime;
    this.output.appendLine(`[SCAN] Result: ${enabled.length} enabled files (${skipped} skipped) in ${elapsed}ms`);
    return enabled;
  }

  /**
   * Проверяет один файл: есть ли marker в первых N строках.
   * Использует workspace.fs.readFile для скорости — не открывает Document.
   * Читает только первые ~1KB файла.
   */
  private async _checkFile(
    uri: vscode.Uri,
    marker: string,
    linesCount: number
  ): Promise<boolean | 'skipped'> {
    try {
      // Читаем только первые 1024 байт — этого достаточно для 3-10 строк
      const buffer = await vscode.workspace.fs.readFile(uri);
      const decoder = new TextDecoder('utf-8');
      const preview = decoder.decode(buffer.slice(0, 2048));
      //const preview = buffer.slice(0, 1024).toString('utf8');
      
      // Разбиваем на строки и проверяем первые N
      const lines = preview.split(/\r?\n/);
      const checkCount = Math.min(lines.length, linesCount);
      
      for (let i = 0; i < checkCount; i++) {
        if (lines[i].includes(marker)) {
          return true;
        }
      }
      return false;
    } catch {
      return 'skipped';
    }
  }
}