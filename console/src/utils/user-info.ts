import { RoleType } from "@/api/role"
import { UserType } from "@/api/user"

export const UserInfoKey = 'USER_INFO'

export function setUserInfo(userInfo: UserType) {
  if(userInfo) {
    localStorage.setItem(UserInfoKey, JSON.stringify(userInfo))
  }
}

export function getUserInfo(): UserType & {roleInfo: RoleType} | undefined{
  const item = localStorage.getItem(UserInfoKey) as string
  if (item) {
    return JSON.parse(item)
  }
}

export function removeUserInfo(){
  localStorage.removeItem(UserInfoKey)
}