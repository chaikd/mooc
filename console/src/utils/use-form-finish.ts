import { useState } from "react";

export default function useFormFinish(cb) {
  const [pendding, setPendding] = useState(false)
  const finishFn = async (data) => {
    setPendding(true)
    await cb(data)
    setPendding(false)
  }
  return {
    pendding, finishFn
  }
}