import { getAllUser, UserType } from "@/api/user";
import BreadcrumbChain from "@/components/breadcrumb-chain";
import { Button, DatePicker, Form, Input, message, Modal, Popconfirm, Select, Table } from "antd";
import { useForm } from "antd/es/form/Form";
import { ColumnProps } from "antd/es/table";
import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router";
import dayjs, { Dayjs } from 'dayjs'
import TextArea from "antd/es/input/TextArea";
import { addLive, deleteLive, editLive, getLiveList, EditLiveType, LiveType } from "@/api/live";
import { useSelector } from "react-redux";
import { StoreType } from "@/store";
const { RangePicker } = DatePicker;

export default function Live() {
  const [isOpen, setIsOpen] = useState(false)
  const [isEdit, setIsEdit] = useState<EditLiveType | null>(null)
  const [instructors, setInstructors] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [form] = useForm()
  const [searchForm] = useForm()
  const [dataSource, setDataSource] = useState<LiveType[]>([])
  const [defaultTime] = useState<[Dayjs, Dayjs]>([dayjs(new Date()), dayjs(new Date()).add(2, 'hours')])
  const userInfo = useSelector((state: StoreType) => state.user.info)
  const modalConfirm = async () => {
    const formValue = await form.validateFields()
    formValue.startTime = formValue.time[0]
    formValue.endTime = formValue.time[1]
    if(!isEdit) {
      const res = await addLive(formValue)
      if(res.success) {
        message.success('添加成功')
        setIsOpen(false)
        setPagination({
          ...pagination,
          current: 1,
        })
        getList()
      }
    } else {
      console.log('formValue', formValue)
      const res = await editLive({
        ...isEdit,
        ...formValue
      })
      if(res.success) {
        message.success('修改成功')
        getList()
        setIsEdit(null)
      }
    }
  }
  const afterOpenChange = (open: boolean) => {
    if(open) {
      if (!instructors || instructors.length == 0) {
        getInstructors()
      }
      if(!isEdit) {
        form.setFieldValue('time', defaultTime)
      } else {
        isEdit.time = [dayjs(isEdit.startTime), dayjs(isEdit.endTime)]
        form.setFieldsValue(isEdit)
      }
    } else {
      setIsEdit(null)
      setIsOpen(false)
      form.resetFields()
    }
  }

  const getInstructors = async () => {
    const res = await getAllUser({
      roleCode: "TEACHER"
    })
    setInstructors(res.data.map((v: UserType) => {
      return {
        label: v.username,
        value: v._id
      }
    }))
  }
  const getList = async () => {
    const {current, pageSize} = pagination
    const {searchValue} = await searchForm.getFieldsValue()
    const res = await getLiveList({
      searchValue,
      page: current,
      size: pageSize
    })
    if (res.success) {
      setDataSource(res.data as LiveType[])
      setPagination({
        ...pagination,
        total: res.total as number
      })
    }
  }
  const searchFinish = async () => {
    setPagination({
      ...pagination,
      current: 1
    })
  }
  const toDeleteItem = async (val: EditLiveType) => {
    const res = await deleteLive({id: val._id as string})
    if(res.success) {
      message.success('删除成功')
      getList()
    }
  }
  const toEdit = async (val: EditLiveType) => {
    setIsEdit(val)
  }
  const modalCancel = () => {
    setIsOpen(false)
    setIsEdit(null)
  }
  useEffect(() => {
    getList()
  }, [])
  const columns: Array<ColumnProps> = [
    {
      title: '直播标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '讲师',
      dataIndex: 'instructorName',
      key: 'instructorName',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {return status}
    },
    {
      title: '计划时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (_, record) => {
        return record.startTime && record.endTime && `${dayjs(record.startTime).format('YYYY-MM-DD HH:mm:ss')} - ${dayjs(record.endTime).format('YYYY-MM-DD HH:mm:ss')}` || '--'
      }
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_, record: Partial<EditLiveType>): ReactNode => {
        return (
          <>
            <Button type="link" onClick={() => toEdit(record as EditLiveType)}>编辑</Button>
            <Popconfirm title="确定删除吗？" okText="确认" cancelText="取消" onConfirm={() => toDeleteItem(record as EditLiveType)}>
              <Button type="link" danger>删除</Button>
            </Popconfirm>
            {
              ((record.status === 'scheduled' && record.startTime && record.endTime && (dayjs() > dayjs(record.startTime).subtract(20, 'minutes') && dayjs() < dayjs(record.endTime)))
              || record.status === 'live' || record.status === 'ended')
              && (userInfo._id === record.instructorId || userInfo.roleInfo?.code === 'SYSTEM')
              && <Link to={`/live/${record._id}`}><Button type="link">进入控制台</Button></Link>
            }
          </>
        )
      }
    },
  ]
  return (
    <>
      <div className="h-full">
        <div className="head flex justify-between">
          <BreadcrumbChain></BreadcrumbChain>
          <Button onClick={() => setIsOpen(true)}>创建直播</Button>
        </div>
        <div className="search inline-block mt-4 mb-4">
          <Form form={searchForm} onFinish={searchFinish} layout="inline">
            <Form.Item name="searchValue">
              <Input placeholder="搜索直播标题/讲师"></Input>
            </Form.Item>
            <Form.Item>
              <Button htmlType="submit">搜索</Button>
            </Form.Item>
          </Form>
        </div>
        <Table rowKey="_id" columns={columns} dataSource={dataSource} pagination={pagination}></Table>
      </div>

      <Modal {...{
        open: isOpen || !!isEdit,
        title: isEdit ? '编辑' : '创建直播',
        onOk: modalConfirm,
        onCancel: modalCancel,
        afterOpenChange
      }}>
        <Form form={form} labelCol={{ span: 4 }}>
          <Form.Item name="title" label="直播标题" rules={[{required: true, message: '请输入直播标题'}]}>
            <Input placeholder="请输入直播标题"></Input>
          </Form.Item>
          <Form.Item label="讲师" name="instructorId" rules={[{ required: true, message: '请选择讲师' }]}>
            <Select placeholder="请选择讲师" options={instructors} />
          </Form.Item>
          <Form.Item name="time" label="直播时间" rules={[{required: true, message: '请选择直播开始和结束时间'}]}>
            <RangePicker showTime />
          </Form.Item>
          <Form.Item name="liveCover" label="直播封面">
            <Input placeholder="直播封面图片地址"></Input>
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea placeholder="直播描述"></TextArea>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
