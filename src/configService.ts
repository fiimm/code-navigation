import * as vscode from 'vscode';

export class ConfigService {
  private static readonly SECTION = 'codeNav';

  /** Префикс тегов БЕЗ символов комментария, например "NAV_" */
  get prefix(): string {
    return this.cfg.get<string>('prefix', 'NAV_');
  }

  /** Максимальная глубина дерева */
  get maxDepth(): number {
    return this.cfg.get<number>('maxDepth', 3);
  }

  /** Количество первых строк для поиска ENABLED-маркера */
  get scanFirstLines(): number {
    return this.cfg.get<number>('scanFirstLines', 3);
  }

  /**
   * Маркер включения файла.
   * Шаблон "{PREFIX}ENABLED" → подставляется текущий prefix.
   * Например: "NAV_ENABLED"
   */
  get enabledMarker(): string {
    const template = this.cfg.get<string>('enabledMarker', '{PREFIX}ENABLED');
    return template.replace('{PREFIX}', this.prefix);
  }

  /** Регулярка для поиска тегов в комментариях любого языка */
    get tagRegex(): RegExp {
        // Ищет: символ комментария + опциональные пробелы + PREFIX + имя тега (только буквы, цифры, _)
        // Группа 1: полное имя тега после префикса
        const escaped = this.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`[/#*'"]\\s*${escaped}([A-Za-z0-9_]+(?:\\/[A-Za-z0-9_]+)*)`, 'g');
    }
    
  /** Слушатель изменений настроек */
  onDidChange: vscode.Event<void>;

  private cfg: vscode.WorkspaceConfiguration;
  private emitter = new vscode.EventEmitter<void>();

  constructor() {
    this.cfg = vscode.workspace.getConfiguration(ConfigService.SECTION);
    this.onDidChange = this.emitter.event;

    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration(ConfigService.SECTION)) {
        this.cfg = vscode.workspace.getConfiguration(ConfigService.SECTION);
        this.emitter.fire();
      }
    });
  }

  dispose() {
    this.emitter.dispose();
  }
}