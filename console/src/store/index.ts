import { configureStore } from "@reduxjs/toolkit";
import Menus from './modules/menus'

export default configureStore({
  reducer: {
    menus: Menus
  }
})