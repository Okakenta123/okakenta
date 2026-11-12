import { ja, type Dict } from './ja';

// 英語に切り替えるときは en.ts（Dict 型）を作ってここで選ぶ。
const dict: Dict = ja;

type Path<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends readonly string[]
      ? `${P}${K}`
      : Path<T[K], `${P}${K}.`>;
}[keyof T & string];

export type Key = Path<Dict>;

function lookup(key: string): unknown {
  return key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], dict);
}

/** 文言を取り出す。{name} 形式の差し込みに対応。 */
export function t(key: Key, vars?: Record<string, string | number>): string {
  const v = lookup(key);
  if (typeof v !== 'string') return key;
  return vars ? v.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : v;
}

export function tl(key: Key): string[] {
  const v = lookup(key);
  return Array.isArray(v) ? (v as string[]) : [];
}

export { dict };
