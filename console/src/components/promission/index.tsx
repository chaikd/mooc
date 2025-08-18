import { StoreType } from "@/store"
import { ReactNode } from "react"
import { useSelector } from "react-redux"

export function checkPromission(authToken: string | string[]) {
  const promissions = useSelector((state: StoreType) => state.user.permissions)
  let checkPass = false
  if(typeof authToken === 'string') {
    checkPass = promissions.includes(authToken)
  } else if(Array.isArray(authToken)) {
    checkPass = authToken.every(v => {
      return promissions.includes(v)
    })
  }
  return checkPass
}

export default function Promission({children, authToken}: {
  children: ReactNode,
  authToken: string
}) {
  return checkPromission(authToken) && children || null
}