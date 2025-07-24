import { Carousel } from "antd";
import Image from "next/image";

export default function Banner({infos}) {
  return (
    <Carousel autoplay className="bg-gray-100 min-h-100">
      {
        infos.map((v, k) => (
          <div className="item relative" key={k}>
            <Image width={1920} height={1080} className="h-150 w-full" src={v.imgUrl} alt=""/>
            <div className="w-full absolute left-0 top-1/2 text-right">
              <span className="text-white font-[600] text-3xl mr-40">{ v.msg }</span>
            </div>
            <div className="absolute top-0 h-full w-full bg-gradient-to-r from-purple-100 to-transition"></div>
          </div>
        ))
      }
    </Carousel>
  )
}