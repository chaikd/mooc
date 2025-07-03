// import { getUserInfo } from "@/api/user";
import { getToken, setToken } from "@/utils/token";
import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: 'user',
  initialState: {
    authToken: getToken() || '',
    info: null,
    userId: ''
  },
  reducers: {
    setStoreToken(state, action) {
      state.authToken = action.payload
      setToken(action.payload)
    },
    setUserInfo(state, action) {
      state.info = action.payload
    },
    setUserId(state, action) {
      state.userId = action.payload
    }
  }
})

export const {setStoreToken, setUserInfo, setUserId} = userSlice.actions

// export const asyncGetUserInfo = () => {
//   return async (dispatch) => {
//     let token = getToken()
//     const userInfo = await getUserInfo()
//     dispatch(setUserInfo(userInfo))
//   }
// }

export default userSlice.reducer