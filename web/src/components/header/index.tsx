import HeadAuth from './head-auth'

export default function Header() {
  return (
    <header className="shadow flex justify-between items-center p-4">
      <div className="logo">
        <span className="text-xl font-[600]">MOOC</span>
      </div>
      <div className="main">
        <HeadAuth></HeadAuth>
      </div>
    </header>
  )
}