export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="p-10 shadow mt-10">
      <div className="text-center text-sm text-gray-400">
        <span>@{year}在线学习平台，版权所有</span>
      </div>
    </footer>
  )
}