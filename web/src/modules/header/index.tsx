import HeadAuth from './head-auth'
import Link from "next/link";
import HeaderMenu from './head-menu';

export default async function Header() {
  return (
    <header className="shadow">
      <div className="w-container flex justify-between items-center mx-auto p-4">
        <div className="flex items-center">
          <Link className="logo" href="/">
            <span className="text-2xl font-[600] text-primary">MOOC</span>
          </Link>
          <HeaderMenu></HeaderMenu>
        </div>
        <div className="main">
          <HeadAuth></HeadAuth>
        </div>
      </div>
    </header>
  )
}