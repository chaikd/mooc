import { Skeleton } from "antd";

export default async function ListFallback() {
  return <>
      <div className="grid-cols-3">
        {[1, 2, 3].map((k) => (
          <div key={k} className="mt-4">
            <Skeleton></Skeleton>
          </div>
        ))}
      </div>
    </>
}