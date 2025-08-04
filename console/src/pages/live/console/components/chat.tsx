import { LiveType } from "@/api/live";
import { StoreType } from "@/store";
import { Button, Form, message } from "antd";
import { useForm } from "antd/es/form/Form";
import TextArea from "antd/es/input/TextArea";
import classNames from "classnames";
import dayjs from "dayjs";
import { Ref, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router";
import { io, Socket } from "socket.io-client";

type PropType = {
  // id: string | number | undefined
  ref: Ref<object>
  liveDetail: (LiveType & {duration?: string}) | null
}

type MessageType = {
  username: string
  userId: string
  createTime: string
  message: string
}

export default function LiveChat({ref, liveDetail}: PropType) {
  const [messageList, setMessageList] = useState<MessageType[]>([])
  const userInfo = useSelector((state: StoreType) => state.user.info)
  const [messageForm] = useForm()
  const { id } = useParams()
  const chatIo = useRef<Socket | null>(null)
  const msgContainerRef = useRef<HTMLDivElement | null>(null)
  
  chatIo.current = io('http://localhost:3000/ws/chat', {
    query: {
      roomId: id
    },
    transports: ['websocket', 'polling']
  })
  chatIo.current.on('message', (message) => {
    setMessageList(messageList.concat(JSON.parse(message)))
    scrolltToBottom()
  })
  chatIo.current.on('messageList', (messages) => {
    const list: MessageType[] = []
    for(const msg of messages) {
      list.push(JSON.parse(msg))
    }
    setMessageList((pre) => [...list, ...pre])
    scrolltToBottom()
  })
  const scrolltToBottom = () => {
    new Promise(resolve => setTimeout(resolve, 100)).then(() => {
      msgContainerRef.current?.scrollTo({
        top: msgContainerRef.current.scrollHeight,
        behavior: 'smooth'
      })
    })
  }

  const getMessages = () => {
    chatIo.current?.emit('messageAll')
  }
  const sendMsg = async ({messageText}: {messageText: string}) => {
    if(!messageText) {
      message.warning('请输入要发送的信息')
    }
    await chatIo.current?.emit('messageSend', JSON.stringify({
      userId: userInfo._id,
      username: userInfo.username,
      message: messageText,
      createTime: new Date()
    }))
    messageForm.resetFields()
  }
  const closeLive = () => {
    chatIo.current?.emit('closeLive')
  }
  useImperativeHandle(ref,() => {
    return {
      closeLive
    }
  })
  useEffect(() => {
    getMessages()
    return () => {
      chatIo.current?.disconnect()
    }
  }, [])
  return (
    <div className="flex flex-col h-full">
      <div ref={msgContainerRef} className="w-full h-0 p-4 flex-1 overflow-y-auto">
        {messageList?.length > 0 && messageList.map((v: MessageType) => {
          return(
            <div key={v.createTime} className={classNames('mt-2', {
              'text-right': v.userId === userInfo._id
            })}>
              <p className="text-blue-400">
                {v.userId !== userInfo._id && <span className="mr-2">{v.username}</span>}
                <span>{dayjs(v.createTime).format('YYYY-MM-DD HH:mm:ss')}</span>
                {v.userId === userInfo._id && <span className="ml-2">{v.username}</span>}
              </p>
              <p className="mt-2">{v.message}</p>
            </div>
          )
        }) || <>
          <div className="mt-20 text-center">暂无聊天数据</div>
        </>}
      </div>
      {
        liveDetail?.status !== 'ended' && <div className="p-2 border-t border-gray-100" style={{ height: '140px' }}>
          <Form form={messageForm} onFinish={sendMsg}>
            <Form.Item name="messageText" className="!mb-2">
              <TextArea rows={2}></TextArea>
            </Form.Item>
            <Form.Item className="text-right !mb-0">
              <Button htmlType="submit">发送</Button>
            </Form.Item>
          </Form>
        </div>
      }
    </div>
  )
}