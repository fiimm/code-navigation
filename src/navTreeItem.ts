import * as vscode from 'vscode';
import { NavNode } from './treeBuilder';

export class NavTreeItem extends vscode.TreeItem {
  // constructor(public readonly node: NavNode) {
  //   // super(
  //   //   node.label,
  //   //   node.isLeaf
  //   //     ? vscode.TreeItemCollapsibleState.None
  //   //     : vscode.TreeItemCollapsibleState.Collapsed
  //   // );

  //   // Добавляем визуальный отступ: 4 пробела на каждый уровень вложенности
  //   const indent = '\u00A0\u00A0\u00A0\u00A0'.repeat(node.level);
    
  //   super(
  //     indent + node.label,
  //     node.isLeaf
  //       ? vscode.TreeItemCollapsibleState.None
  //       : vscode.TreeItemCollapsibleState.Collapsed
  //   );

  //   // Описание справа от имени (счётчик дубликатов)
  //   if (node.occurrences.length > 1) {
  //     this.description = `(${node.occurrences.length})`;
  //   }

  //   // Иконка и цвет
  //   this.iconPath = this._getIcon();
    
  //   // Команда при клике (навигация)
  //   this.command = {
  //     command: 'codeNav.navigateTo',
  //     title: 'Navigate to tag',
  //     arguments: [node]
  //   };
  // }

  constructor(public readonly node: NavNode) {
      // Иконка как эмодзи (используем параметр node, не this.node!)
      let icon: string;
      if (node.isLeaf) {
        icon = node.isTooDeep ? '🔴' : '🔵';
      } else {
        icon = node.isVirtual ? '⚠️' : '📁';
      }

      // Отступ: 3 неразрывных пробела на каждый уровень
      const indent = '\u00A0\u00A0\u00A0'.repeat(node.level);

      // super() вызывается с уже подготовленными значениями
      super(
        `${indent}${icon} ${node.label}`,
        node.isLeaf
          ? vscode.TreeItemCollapsibleState.None
          : vscode.TreeItemCollapsibleState.Collapsed
      );

      // После super() можно использовать this
      if (node.occurrences.length > 1) {
        this.description = `(${node.occurrences.length})`;
      }

      this.command = {
        command: 'codeNav.navigateTo',
        title: 'Navigate to tag',
        arguments: [node]
      };
  }  
  
  private _getIcon(): vscode.ThemeIcon {
    if (this.node.isLeaf) {
      // Конечный узел (не родитель)
      if (this.node.isTooDeep) {
        return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
      }
      return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.blue'));
    } else {
      // Родительский узел
      if (this.node.isVirtual) {
        if (this.node.isTooDeep) {
          return new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.red'));
        }
        return new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.yellow'));
      } else {
        if (this.node.isTooDeep) {
          return new vscode.ThemeIcon('folder', new vscode.ThemeColor('charts.red'));
        }
        return new vscode.ThemeIcon('folder', new vscode.ThemeColor('foreground'));
      }
    }
  }
}