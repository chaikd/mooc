'use client'
import { LiveType, UserType } from "@mooc/live-service";
import { Button, Form, message } from "antd";
import { useForm } from "antd/es/form/Form";
import TextArea from "antd/es/input/TextArea";
import classNames from "classnames";
import dayjs from "dayjs";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type PropType = {
  // id: string | number | undefined
  // ref: Ref<object>
  liveDetail: (LiveType & {duration?: string}) | null
  userInfo: UserType | undefined
}

type MessageType = {
  username: string
  userId: string
  createTime: string
  message: string
}

export default function LiveChat({liveDetail, userInfo}: PropType) {
  const [messageList, setMessageList] = useState<MessageType[]>([])
  const [messageForm] = useForm()
  const { id } = useParams()
  const chatIo = useRef<Socket | null>(null)
  const msgBoxRef = useRef<HTMLDivElement>(null)
  
  chatIo.current = io(`${process.env.NEXT_PUBLIC_LIVE_HOST}/ws/chat`, {
    query: {
      roomId: id
    },
    transports: ['websocket', 'polling']
  })
  chatIo.current.on('message', (message) => {
    setMessageList(messageList.concat(JSON.parse(message)))
    scrollToBottom()
  })
  chatIo.current.on('messageList', (messages) => {
    const list: MessageType[] = []
    for(const msg of messages) {
      list.push(JSON.parse(msg))
    }
    setMessageList((pre) => [...list, ...pre])
    scrollToBottom()
  })

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
  const scrollToBottom = () => {
    new Promise(resolve => setTimeout(resolve, 100)).then(() => {
      msgBoxRef.current?.scrollTo({
        top: msgBoxRef.current.scrollHeight,
        behavior: 'smooth'
      })
    })
  }
  // useImperativeHandle(ref,() => {
  //   return {
  //     closeLive
  //   }
  // })
  useEffect(() => {
    getMessages()
    return () => {
      closeLive()
      chatIo.current?.disconnect()
    }
  }, [])
  return (
    <div className="flex flex-col h-full">
      <div className="w-full p-4 flex-1 overflow-y-auto" ref={msgBoxRef}>
        {messageList?.length > 0 && messageList.map((v: MessageType) => {
          return(
            <div key={v.createTime} className={classNames('mt-2', {
              'text-right': v.userId === userInfo?._id
            })}>
              <p className=" text-blue-400">
                {v.userId !== userInfo?._id && <span className="mr-2">{v.username}</span>}
                <span>{dayjs(v.createTime).format('YYYY-MM-DD HH:mm:ss')}</span>
                {v.userId === userInfo?._id && <span className="ml-2">{v.username}</span>}
              </p>
              <p className="mt-2">{v.message}</p>
            </div>
          )
        }) || <>
          <div className="mt-20 text-center">暂无聊天数据</div>
        </>}
      </div>
      {
        liveDetail?.status !== 'ended' && <div className="p-2 border-t border-gray-200">
          <Form form={messageForm} disabled={!userInfo} onFinish={sendMsg}>
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