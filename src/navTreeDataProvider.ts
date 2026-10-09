import * as vscode from 'vscode';
import { NavNode } from './treeBuilder';
import { NavTreeItem } from './navTreeItem';

export class NavTreeDataProvider implements vscode.TreeDataProvider<NavNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<NavNode | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _tree: Map<string, NavNode> = new Map();

  /**
   * Обновить дерево с новыми данными.
   */
  updateTree(tree: Map<string, NavNode>) {
    this._tree = tree;
    this._onDidChangeTreeData.fire();
  }

  /**
   * Обновить конкретный узел (для точечных обновлений).
   */
  refresh(node?: NavNode) {
    this._onDidChangeTreeData.fire(node);
  }

  getTreeItem(node: NavNode): vscode.TreeItem {
    return new NavTreeItem(node);
  }

  getChildren(node?: NavNode): NavNode[] {
    if (!node) {
      // Корневые узлы
      return Array.from(this._tree.values()).sort((a, b) => a.label.localeCompare(b.label));
    }
    // Дети узла
    return Array.from(node.children.values()).sort((a, b) => a.label.localeCompare(b.label));
  }

  /**
   * Найти родительский узел (нужно для точечного обновления).
   */
  getParent(node: NavNode): NavNode | undefined {
    // Для корневых узлов родителя нет
    if (!node.key.includes('_')) return undefined;

    // Ищем по ключу
    const parentKey = node.key.substring(0, node.key.lastIndexOf('_'));
    return this._findNodeByKey(parentKey, this._tree);
  }

  private _findNodeByKey(key: string, nodes: Map<string, NavNode>): NavNode | undefined {
    for (const node of nodes.values()) {
      if (node.key === key) return node;
      const found = this._findNodeByKey(key, node.children);
      if (found) return found;
    }
    return undefined;
  }
}