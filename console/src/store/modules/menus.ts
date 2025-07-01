import { createSlice } from "@reduxjs/toolkit";

const Menus = createSlice({
  name: 'menus',
  initialState: {
    menus: []
  },
  reducers: {
    setMenus(state, action) {
      state.menus = action.payload
    }
  }
})

export const {setMenus} = Menus.actions

export default Menus.reducer