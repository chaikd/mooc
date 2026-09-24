export type ClassValue = string | number | null | false | undefined;

/** 零依赖的 class 合并工具，替代 classnames/clsx（组件库不引入运行时依赖） */
export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
