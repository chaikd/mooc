import { loginType } from "@/pages/login";
import { useState } from "react";

export default function useFormFinish(cb: (data: loginType) => void) {
  const [pendding, setPendding] = useState(false)
  const finishFn = async (data: loginType) => {
    setPendding(true)
    await cb(data)
    setPendding(false)
  }
  return {
    pendding, finishFn
  }
}