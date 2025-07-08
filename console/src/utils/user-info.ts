import { RoleType } from "@/api/role"
import { UserType } from "@/api/user"

export const UserInfoKey = 'USER_INFO'

export function setUserInfo(userInfo) {
  localStorage.setItem(UserInfoKey, JSON.stringify(userInfo))
}

export function getUserInfo(): UserType & {roleInfo: RoleType} {
  return JSON.parse(localStorage.getItem(UserInfoKey))
}

export function removeUserInfo(){
  localStorage.removeItem(UserInfoKey)
}