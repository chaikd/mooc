export function tryFn<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await fn()
      resolve(res)
    } catch(err) {
      reject(err)
    }
  })
}