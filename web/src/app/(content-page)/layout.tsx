import Footer from "@/modules/footer";
import Header from "@/modules/header";
import './layout.scss'

export default function ContentPageLayout({children}) {
  return (
    <>
      <Header></Header>
      <div className="layout-container">
        {children}
      </div>
      <Footer></Footer>
    </>
  )
}