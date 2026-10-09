import { NavTag } from './tagParser';
import { parseTagToLevels } from './tagUtils';
import { ConfigService } from './configService';

export interface TagOccurrence {
  filePath: string;
  line: number;
}

export interface NavNode {
  key: string;              // Полный ключ, например "INIT_BLE1"
  label: string;            // Отображаемое имя, например "BLE1"
  level: number;            // Глубина (0 = корень)
  isVirtual: boolean;       // true если нет реального тега с этим ключом
  isLeaf: boolean;          // true если нет детей
  isTooDeep: boolean;       // true если превышает maxDepth
  children: Map<string, NavNode>;
  occurrences: TagOccurrence[];
}

export class TreeBuilder {
  constructor(private config: ConfigService) {}

  /**
   * Строит дерево из плоского списка тегов.
   * Возвращает корневые узлы (уровень 0).
   */
    buildTree(tags: NavTag[]): Map<string, NavNode> {
        const roots = new Map<string, NavNode>();
        const markerTag = this.config.enabledMarker;
        const maxDepth = this.config.maxDepth;

        for (const navTag of tags) {
        if (this.config.prefix + navTag.tag === markerTag) continue;

        const levels = parseTagToLevels(navTag.tag);
        if (levels.length === 0) continue;

        let currentChildren = roots;
        let currentKey = '';

        for (let i = 0; i < levels.length; i++) {
            const part = levels[i];
            currentKey = currentKey ? `${currentKey}_${part}` : part;

            let node = currentChildren.get(part);

            if (!node) {
            node = {
                key: currentKey,
                label: part,
                level: i,
                isVirtual: true,
                isLeaf: true,
                isTooDeep: i >= maxDepth,
                children: new Map<string, NavNode>(),
                occurrences: []
            };
            currentChildren.set(part, node);
            }

            // ВАЖНО: обновляем isTooDeep для КАЖДОГО узла, не только новых
            node.isTooDeep = i >= maxDepth;

            if (i === levels.length - 1) {
              node.isVirtual = false;
              const occ = { filePath: navTag.filePath, line: navTag.line };
              const exists = node.occurrences.some(
                o => o.filePath === occ.filePath && o.line === occ.line
              );
              if (!exists) {
                node.occurrences.push(occ);
              }
            }
            
            if (i < levels.length - 1) {
            node.isLeaf = false;
            }

            currentChildren = node.children;
        }
        }

        return roots;
    }  
  
  
  
    /**
   * Возвращает плоский список всех узлов дерева (для отладки).
   */
  flattenTree(roots: Map<string, NavNode>): string[] {
    const result: string[] = [];
    this._flatten(roots, result, 0);
    return result;
  }

  private _flatten(nodes: Map<string, NavNode>, result: string[], indent: number) {
    // Сортируем лексикографически
    const sorted = Array.from(nodes.values()).sort((a, b) => a.label.localeCompare(b.label));
    
    for (const node of sorted) {
      const prefix = '  '.repeat(indent);
      const virtual = node.isVirtual ? ' [virtual]' : '';
      const deep = node.isTooDeep ? ' [TOO DEEP]' : '';
      const dupes = node.occurrences.length > 1 ? ` (${node.occurrences.length})` : '';
      const leaf = node.isLeaf ? ' ●' : '';
      
      result.push(`${prefix}${node.label}${virtual}${deep}${dupes}${leaf}`);
      
      if (node.children.size > 0) {
        this._flatten(node.children, result, indent + 1);
      }
    }
  }
}