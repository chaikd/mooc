export interface ChapterItem {
  _id?: string;
  chapterName: string;
  chapterDesc?: string;
  children?: ChapterItem[];
}

export default function ChapterTree({ data }: { data: ChapterItem[] }) {
  return <>
    {
      data?.map((item: ChapterItem) => {
        return (
          <div className="ml-8 mt-6" key={item._id}>
            <div>
              <span>{item.chapterName}</span>
              <span className="ml-4">({item.chapterDesc})</span>
            </div>
            {item.children?.map((child: ChapterItem) => (
              <div key={child._id}>
                <span>{child.chapterName}</span>
                <span className="ml-4">({child.chapterDesc})</span>
              </div>
            ))}
          </div>
        );
      })
    }
  </>
}
