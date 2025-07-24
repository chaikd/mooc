import { Suspense } from "react";
import { Skeleton } from "antd";
import Content from "@/modules/course/course-detail/content";

export default async function CourseDetail({ params }) {
  const { id } = await params;
  return (
    <div className="w-container mx-auto mt-6 min-h-[450px]">
      <Suspense fallback={<Skeleton />}>
        <Content id={id}></Content>
      </Suspense>
    </div>
  );
}
