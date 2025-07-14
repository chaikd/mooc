import { configureStore } from "@reduxjs/toolkit";
import Menus from './modules/menus'
import User from './modules/user'
import { UserType } from "@/api/user";
import { MenuItemType } from "antd/es/menu/interface";

export type menuType = MenuItemType & Partial<{path?: string, children?: menuType[]}>
export interface StoreType {
  user: {
    authToken: string,
    info: UserType,
    userId: string,
    permissions: string[]
  }
  menus: {
    menus: menuType[]
  }
}

export default configureStore({
  reducer: {
    menus: Menus,
    user: User
  }
})