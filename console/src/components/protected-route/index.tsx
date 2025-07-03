import { getToken } from "@/utils/token";
import { ReactNode } from "react";
import { Navigate } from "react-router";

export default function ProtectedRoute({children}): ReactNode {
  const token = getToken();
  return (
    token ? <>{children}</> : <Navigate to="/login" replace />
  )
}