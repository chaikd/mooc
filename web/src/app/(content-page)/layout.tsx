import Footer from "@/modules/footer";
import Header from "@/modules/header";

export default function ContentPageLayout({children}) {
  return (
    <>
      <Header></Header>
      {children}
      <Footer></Footer>
    </>
  )
}