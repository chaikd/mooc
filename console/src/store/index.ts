import { configureStore } from "@reduxjs/toolkit";
import Menus from './modules/menus'
import User from './modules/user'

export interface StoreType {
  user
  menus
}

export default configureStore({
  reducer: {
    menus: Menus,
    user: User
  }
})