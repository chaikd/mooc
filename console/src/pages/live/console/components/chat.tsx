import { StoreType } from "@/store";
import { Button, Form, message } from "antd";
import TextArea from "antd/es/input/TextArea";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";

type PropType = {
  id: string | number | undefined
}

type MessageType = {
  username: string
  userId: string
  createTime: string
  message: string
}

export default function LiveChat({id}: PropType) {
  const [messageList, setMessageList] = useState([])
  const userInfo = useSelector((state: StoreType) => state.user.info)
  console.log(userInfo)
  const chatIo = io('http://localhost:3000/ws/chat', {
    query: {
      roomId: id
    },
    transports: ['websocket', 'polling']
  })
  chatIo.on('message', (message) => {
    setMessageList(messageList.concat(JSON.parse(message)))
  })

  const getMessages = () => {
    chatIo.emit('message:all')
  }
  const sendMsg = ({messageText}: {messageText: string}) => {
    if(!messageText) {
      message.warning('请输入要发送的信息')
    }
    chatIo.emit('message:send', JSON.stringify({
      userId: userInfo._id,
      username: userInfo.username,
      message: messageText,
      createTime: new Date()
    }))
  }
  useEffect(() => {
    getMessages()
  }, [])
  return (
    <div className="flex flex-col h-full">
      <div className="w-full h-ful p-4 flex-1">
        {messageList?.length > 0 && messageList.map((v: MessageType) => {
          return(
            <div key={v.createTime} className="mt-2">
              <p>
                {v.userId === userInfo._id && <span className="mr-2">{v.username}</span>}
                <span>{dayjs(v.createTime).format('YYYY-MM-DD HH:mm:ss')}</span>
                {v.userId !== userInfo._id && <span className="ml-2">{v.username}</span>}
              </p>
              <p className="mt-2">{v.message}</p>
            </div>
          )
        })}
      </div>
      <div className="p-4 border-t border-gray-200" style={{height: '140px'}}>
        <Form onFinish={sendMsg}>
          <Form.Item name="messageText">
            <TextArea rows={2}></TextArea>
          </Form.Item>
          <Form.Item className="text-right">
            <Button htmlType="submit">发送</Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  )
}