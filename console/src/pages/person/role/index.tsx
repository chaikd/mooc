import { addRole, deleteRole, editRole, getRoleList, RoleType } from "@/api/role";
import BreadcrumbChain from "@/components/breadcrumb-chain";
import { StoreType } from "@/store";
import { Button, Form, Input, message, Modal, PaginationProps, Popconfirm, Table, TableProps } from "antd";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Fragment } from "react/jsx-runtime";

export default function Role() {
  const [searchForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [roleList, setRoleList] = useState([])
  const [isEdit, setIsEdit] = useState(null)
  const [isAdd, setIsAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const userId = useSelector((state: StoreType) => state.user.userId)
  const onPaginationChange = (current, pageSize) => {
    setTablePagination((pre) => (
      {
        ...pre,
        pageSize,
        current
      }
    ))
    fetchList()
  }
  const [tablePagination, setTablePagination] = useState<PaginationProps>({
    onChange: onPaginationChange,
    pageSize: 10,
    current: 1,
    total: 0
  })
  const search = () => {
    setTablePagination(prev => ({
      ...prev,
      current: 1,
      total: 0
    }))
    fetchList()
  }
  const fetchList = () => {
    setLoading(true)
    const searchFormData = searchForm.getFieldsValue()
    let searchValue = {}
    Object.keys(searchFormData).forEach(k => {
      if(searchFormData[k]) {
        searchValue[k] = searchFormData[k]
      }
    })
    const {pageSize, current} = tablePagination
    getRoleList({
      size: pageSize,
      page: current,
      ...searchValue,
    }).then(res => {
      setRoleList(res.data.map(v => ({
        ...v,
        key:v._id
      })))
      setLoading(false)
      setTablePagination((pre) => ({
        ...pre,
        total: res.total
      }))
    })
  }
  const toEditRole = (val) => {
    setIsEdit(val)
    editForm.setFieldValue('name', val.name)
  }
  const toDeleteRole = async (val) => {
    await deleteRole({id: val._id})
    fetchList()
  }
  const toAddRole = () => {
    setIsAdd(true)
  }
  const handleOk = async () => {
    editForm.validateFields().then(async value => {
       if(isEdit) {
        Reflect.deleteProperty(value, 'createUserId')
        await editRole({
          ...isEdit,
          ...value,
          editUserId: userId
        })
        setIsEdit(null)
        fetchList()
        message.success('编辑成功');
      } else if(isAdd) {
        await addRole(value)
        setIsAdd(false)
        fetchList()
        message.success('添加成功');
      }
    }).catch(err => {
    })
  }
  const handleCancel = () => {
    setIsAdd(false)
    setIsEdit(null)
    editForm.resetFields()
  }
  const columns: TableProps<RoleType>['columns'] = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      render: (_, val) => (new Date(val.createTime).toLocaleString())
    },
    {
      title: '创建人',
      dataIndex: 'createUsername',
      key: 'createUsername',
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_, val) => (
        <>
          <Button className="mr-4" type="link" onClick={() => {toEditRole(val)}}>编辑</Button>
          <Popconfirm title="确定删除吗？" okText="确认" cancelText="取消" onConfirm={() => toDeleteRole(val)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </>
      )
    }
  ]
  useEffect(() => {
    fetchList()
    // eslint-disable-next-line
  }, [tablePagination.current, tablePagination.pageSize])
  return (
    <Fragment>
      <BreadcrumbChain></BreadcrumbChain>
      <div className="mt-4">
        <Form form={searchForm} layout="inline" onFinish={search}>
          <Form.Item name="name">
            <Input placeholder="角色名称"></Input>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">搜索</Button>
          </Form.Item>
        </Form>
      </div>
      <div className="mt-4">
        <Button type="primary" onClick={toAddRole}>添加角色</Button>
      </div>
      <div className="mt-4">
        <Table loading={loading} dataSource={roleList} columns={columns} pagination={tablePagination}></Table>
      </div>
      <Modal
        title={isEdit ? '编辑' : '添加' + '角色'}
        closable={{ 'aria-label': 'Custom Close Button' }}
        destroyOnHidden
        open={!!isEdit || isAdd}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={editForm}>
          <Form.Item name="name" rules={[
            {required: true, message: '请输入角色名称'}
          ]}>
            <Input placeholder="角色名称"></Input>
          </Form.Item>
          <Form.Item name="createUserId" initialValue={userId} hidden>
            <Input></Input>
          </Form.Item>
        </Form>
      </Modal>
    </Fragment>
  )
}