export function numberToChinese(num: number): string {
  const units = ['', '十', '百', '千', '万', '十万', '百万', '千万', '亿'];
  const chars = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (num === 0) return chars[0];
  let str = '';
  const numStr = num.toString();
  for (let i = 0; i < numStr.length; i++) {
    const n = Number(numStr[i]);
    const unit = units[numStr.length - i - 1];
    if (n === 0) {
      if (!str.endsWith(chars[0]) && str !== '') str += chars[0];
    } else {
      str += chars[n] + unit;
    }
  }
  // 处理“十”前的“一”
  str = str.replace(/^一十/, '十');
  // 去掉末尾的“零”
  str = str.replace(/零+$/, '');
  return str;
}