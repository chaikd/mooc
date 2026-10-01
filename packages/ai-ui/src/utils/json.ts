export function isJSONString(str: string) {
  if (typeof str !== 'string') return false;
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    console.log("isJSONString ~ error:", e)
    return false;
  }
}