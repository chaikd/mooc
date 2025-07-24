import { Fragment, Suspense } from "react";
import Banner from "@/modules/banner";
import { Skeleton } from "antd";
import HomeContent from "@/modules/home/content";

const infos = [
  {
    imgUrl: "https://picsum.photos/1920/1080?random=1",
    msg: "星空正从你的裂缝里涌进来。",
  },
  {
    imgUrl: "https://picsum.photos/1920/1080?random=4",
    msg: "别叩问！直接撞向它！",
  },
  {
    imgUrl: "https://picsum.photos/1920/1080?random=2",
    msg: "一朵花的美丽在于它曾经凋谢过。",
  },
  {
    imgUrl: "https://picsum.photos/1920/1080?random=3",
    msg: "前行不息，无须迟疑和退避，健行于你寂寥的小径。",
  },
];

export default async function Home() {
  return (
    <Fragment>
      <Banner infos={infos}></Banner>
      <div className="container mx-auto mt-6">
        <Suspense
          fallback={
            <>
              <div className="grid-cols-3">
                {[1, 2, 3].map((k) => (
                  <div key={k} className="mt-4">
                    <Skeleton></Skeleton>
                  </div>
                ))}
              </div>
            </>
          }
        >
          <HomeContent></HomeContent>
        </Suspense>
      </div>
    </Fragment>
  );
}
