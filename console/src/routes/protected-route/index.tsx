import { getSelfInfo } from "@/api/user";
import { StoreType } from "@/store";
import { setMenus } from "@/store/modules/menus";
import { setUserInfo } from "@/store/modules/user";
import { isPassUrl, parseRouters } from "@/utils/menu-parse";
import { getToken } from "@/utils/token";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useMatches } from "react-router";

export default function ProtectedRoute({children}): ReactNode {
  const token = getToken();
  const matchs = useMatches()
  const dispatch = useDispatch()
  const permissions = useSelector<StoreType>(state => state.user.permissions) as string[]
  const isPass = useMemo(() => {
    const id = matchs[matchs.length - 1].id
    const isPass = isPassUrl(id, permissions)
    return isPass
  }, [permissions])
  const checkPass = async () => {
    let permis = permissions
    if(!permissions || permissions?.length <= 0) {
      const userInfo = await getSelfInfo()
      dispatch(setUserInfo(userInfo.data))
      permis = userInfo.data.roleInfo.permissions
    }
    const menus = parseRouters('', permis)
    dispatch(setMenus(menus))
  }
  useEffect(() => {
    checkPass()
  }, [matchs])
  return (
    token 
      ? isPass 
        ? <>{children}</> 
        : <Navigate to="/" replace />
      : <Navigate to="/login" replace />
  )
}