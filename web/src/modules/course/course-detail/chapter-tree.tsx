export default function ChapterTree({data}) {
  return <>
    {
      data?.map((item) => {
        return (
          <div className="ml-8 mt-6" key={item._id}>
            <div>
              <span>{item.chapterName}</span>
              <span className="ml-4">({item.chapterDesc})</span>
            </div>
            {item.children?.map((child) => (
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