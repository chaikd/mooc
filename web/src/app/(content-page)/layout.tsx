import Footer from "@/modules/footer";
import Header from "@/modules/header";
import { AuthProvider } from "@/modules/auth/auth-context";
import './layout.scss'

export default function ContentPageLayout({children}) {
  return (
    <AuthProvider>
      <Header></Header>
      <div className="layout-container">
        {children}
      </div>
      <Footer></Footer>
    </AuthProvider>
  )
}
