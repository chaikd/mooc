import { UploadOutlined, VideoCameraOutlined } from "@ant-design/icons";
import { Button, Space, Upload, UploadFile, UploadProps } from "antd";
import { useImperativeHandle, useState } from "react";
import * as qiniu from 'qiniu-js'
import { getQiniuToken } from "@/api/qiniu";
import { useSelector } from "react-redux";
import { StoreType } from "@/store";

export default function ChapterUpload({ref}) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const useId = useSelector((state: StoreType) => state.user.info._id)

  useImperativeHandle(ref, () => ({
    getFileList
  }))

  const handleChange: UploadProps['onChange'] = (info) => {
    console.log('info', info)
    let newFileList = [...info.fileList];
    newFileList = newFileList.slice(-2);
    newFileList = newFileList.map((file) => {
      if (file.response) {
        file.url = file.response.url;
      }
      return file;
    });
    setFileList(newFileList);
  };

  const beforeUpload: UploadProps['beforeUpload'] = async (file, fileList) => {
    try{
      const token = await getQiniuToken()
      const uploadTasks = fileList.map(file => {
        const uploadTask = qiniu.createDirectUploadTask({
          type: 'file',
          data: file
        }, {
          tokenProvider: () => Promise.resolve(token)
        })
        return uploadTask.start()
      })
      Promise.all(uploadTasks).then((res: Array<Object>) => {
        const result = res.map((v: {result: string}) => (JSON.parse(v.result)))
        const list = result.map(v => {
          let file = fileList.find(file => file.name === v.name)
          return {
            uid: file.uid,
            createUserId: useId,
            name: file.name,
            fileUrl: v.imgUrl,         // 资料关联地址
            fileSize: file.size,      // 文件大小
            fileExtension: file.name.split('.').pop()  // 文件扩展名
          }
        })
        setFileList(list)
      })
    }catch(err){
      console.log(err)
    }
    return Upload.LIST_IGNORE
  }

  const getFileList = () => fileList

  const props = {
    onChange: handleChange,
    multiple: true,
    beforeUpload,
  };
  return (
    <div className="flex">
      <Space>
        <Upload {...props} multiple={true} fileList={fileList}>
          <Button icon={<UploadOutlined />}>上传资料</Button>
        </Upload>
      </Space>
    </div>
  )
}