import { Fragment} from "react";
import Header from '@/components/header'
import Banner from "@/components/banner";
import Footer from "@/components/footer";
import HomeContent from "@/components/home/content";

const infos = [
  {
    imgUrl: 'https://picsum.photos/1920/1080?random=1',
    msg: '星空正从你的裂缝里涌进来。'
  },
  {
    imgUrl: 'https://picsum.photos/1920/1080?random=4',
    msg: '别叩问！直接撞向它！'
  },
  {
    imgUrl: 'https://picsum.photos/1920/1080?random=2',
    msg: '一朵花的美丽在于它曾经凋谢过。'
  },
  {
    imgUrl: 'https://picsum.photos/1920/1080?random=3',
    msg: '前行不息，无须迟疑和退避，健行于你寂寥的小径。'
  },
]

export default function Home() {
  return (
    <Fragment>
      <Header></Header>
      <Banner infos={infos}></Banner>
      <div className="container mx-auto mt-4">
        <HomeContent></HomeContent>
      </div>
      <Footer></Footer>
    </Fragment>
  )
}