export function generateUUID() {
  const idKey = 'consumerId'
  let id = localStorage.get(idKey)
  if(!id) {
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
    localStorage.set(idKey, id)
  }
  return id
}