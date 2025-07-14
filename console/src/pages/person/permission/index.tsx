import { addPermission, deletePermission, editPermission, fetchPermissionList, PermissionType } from "@/api/permission";
import { StoreType } from "@/store";
import { Button, Form, Input, message, Modal, Popconfirm, Select } from "antd";
import Table, { TableProps } from "antd/es/table";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

export default function Permission() {
  const [isEdit, setIsEdit] = useState<PermissionType | null>(null)
  const [isAdd, setIsAdd] = useState(false)
  const [dataSource, setDataSource] = useState([])
  const userId = useSelector((state: StoreType) => state.user.userId)
  const [editForm] = Form.useForm()
  const toEditRole = (val: PermissionType) => {
    setIsEdit(val)
    editForm.setFieldsValue(val)
  }
  const toDeleteRole = async (val: PermissionType) => {
    await deletePermission(val._id as string)
    message.success('删除成功')
    fetchList()
  }
  const toAddPermission = () => {
    setIsAdd(true)
  }
  const handleOk = async () => {
    const value: PermissionType = await editForm.validateFields()
    Reflect.deleteProperty(value, 'parentName')
    if (isAdd) {
      await addPermission(value)
      fetchList()
      message.success('添加成功')
      handleCancel()
    } else {
      Reflect.deleteProperty(value, 'createUserId')
      await editPermission({
        ...isEdit,
        ...value,
      })
      fetchList()
      message.success('编辑成功')
      handleCancel()
    }
  }
  const addChildren = async (val: PermissionType) => {
    editForm.setFieldValue('parentId', val._id)
    editForm.setFieldValue('parentName', val.name)
    setIsAdd(true)
  }
  const handleCancel = () => {
    setIsAdd(false)
    setIsEdit(null)
    editForm.resetFields()
  }
  const fetchList = async () => {
    const {data} = await fetchPermissionList()
    setDataSource(data)
  }
  useEffect(() => {
    fetchList()
  }, [])
  const columns: TableProps<PermissionType>['columns'] = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type'
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_, val) => {
        return (
          <>
            <Button className="mr-4" type="link" onClick={() => {toEditRole(val)}}>编辑</Button>
            <Popconfirm title="确定删除吗？" okText="确认" cancelText="取消" onConfirm={() => toDeleteRole(val)}>
              <Button className="mr-4" type="link" danger>删除</Button>
            </Popconfirm>
            {val.type === 'menu' && <Button type="link" onClick={() => addChildren(val)}>新增</Button>}
          </>
        )
      }
    },
  ]
  return (
    <>
      <div className="mb-4">
        <Button onClick={toAddPermission}>新增权限</Button>
      </div>
      <Table columns={columns} dataSource={dataSource} rowKey={(record) => record._id as string}></Table>
      <Modal
        title={isEdit ? '编辑' : '添加' + '角色'}
        closable={{ 'aria-label': 'Custom Close Button' }}
        destroyOnHidden
        open={!!isEdit || isAdd}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={editForm}>
          <Form.Item name="createUserId" hidden initialValue={userId}>
            <Input></Input>
          </Form.Item>
          <Form.Item name='parentId' hidden>
            <Input></Input>
          </Form.Item>
          <Form.Item name='parentName' label="父级名称">
            <Input placeholder="父级名称" disabled></Input>
          </Form.Item>
          <Form.Item name="name" label="权限名称" rules={[
            {required: true, message: '请输入权限名称'}
          ]}>
            <Input placeholder="权限名称"></Input>
          </Form.Item>
          <Form.Item name="code" label="权限code" rules={[
            {required: true, message: '请输入权限code'}
          ]}>
            <Input placeholder="输入权限code"></Input>
          </Form.Item>
          <Form.Item name="type" label="权限类型" rules={[
            {required: true, message: '请选择权限类型'}
          ]}>
            <Select
              placeholder="选择权限类型"
              options={[
                { value: 'menu', label: '菜单' },
                { value: 'button', label: '按钮' },
                { value: 'api', label: '接口' },
              ]}
            ></Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}