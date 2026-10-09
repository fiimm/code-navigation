/**
 * Разбирает тег на уровни.
 * "INIT_BLE1_MAIN" → ["INIT", "BLE1", "MAIN"]
 * "WORK_PROCESS" → ["WORK", "PROCESS"]
 */
export function parseTagToLevels(tag: string): string[] {
  if (!tag) return [];
  
  // Split по underscore, фильтруем пустые части (на случай "INIT__BLE")
  return tag.split('_').filter(part => part.length > 0);
}

/**
 * Возвращает ключ родителя для данного тега.
 * "INIT_BLE1_MAIN" → "INIT_BLE1"
 * "WORK_PROCESS" → "WORK"
 * "INIT" → null (корневой узел)
 */
export function getParentTag(tag: string): string | null {
  const parts = parseTagToLevels(tag);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('_');
}

/**
 * Возвращает имя узла (последнюю часть тега).
 * "INIT_BLE1_MAIN" → "MAIN"
 * "WORK" → "WORK"
 */
export function getNodeName(tag: string): string {
  const parts = parseTagToLevels(tag);
  return parts.length > 0 ? parts[parts.length - 1] : tag;
}
/**
 * Разворачивает "сырой" тег со слэшами в несколько тегов.
 * Обработка идёт с последнего слэша, рекурсивно.
 * Максимум MAX_EXPANDED результатов. Если больше — возвращаем исходный тег как есть.
 */
const MAX_EXPANDED = 16;

export function expandSlashTag(tag: string, warn?: (msg: string) => void): string[] {
  const result: string[] = [];
  expandRecursive(tag, result, MAX_EXPANDED + 1);
  if (result.length > MAX_EXPANDED) {
    if (warn) {
      warn(`[WARN] Tag "${tag}" expands to ${result.length} entries (limit ${MAX_EXPANDED}), keeping as-is`);
    }
    return [tag];
  }
  return result;
}

function expandRecursive(tag: string, out: string[], limit: number): void {
  if (out.length > limit) return; // ранний выход, чтобы не раздувать

  const slashIdx = tag.lastIndexOf('/');
  if (slashIdx === -1) {
    out.push(tag);
    return;
  }

  const parts = tag.split('_');

  // Ищем сегмент с последним слэшем (идём с конца)
  let slashPartIdx = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].includes('/')) {
      slashPartIdx = i;
      break;
    }
  }
  if (slashPartIdx === -1) {
    out.push(tag);
    return;
  }

  const slashPart = parts[slashPartIdx];
  const [left, right] = slashPart.split('/');
  if (left === undefined || right === undefined) {
    out.push(tag);
    return;
  }

  const tail = parts.slice(slashPartIdx + 1);

  // Хвост короче 2 — не разворачиваем
  if (tail.length < 2) {
    out.push(tag);
    return;
  }

  const headBefore = parts.slice(0, slashPartIdx);

  const v1parts = [...headBefore, left, ...tail];
  const tailSwapped = [tail[1], tail[0], ...tail.slice(2)];
  const v2parts = [...headBefore, right, ...tailSwapped];

  expandRecursive(v1parts.join('_'), out, limit);
  expandRecursive(v2parts.join('_'), out, limit);
}