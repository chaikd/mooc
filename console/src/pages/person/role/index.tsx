import { fetchPermissionList } from "@/api/permission";
import { addRole, deleteRole, editRole, getRoleList, RoleType } from "@/api/role";
import BreadcrumbChain from "@/components/breadcrumb-chain";
import { StoreType } from "@/store";
import { Button, Form, Input, message, Modal, PaginationProps, Popconfirm, Table, TableProps, Tree, TreeProps, Typography } from "antd";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Fragment } from "react/jsx-runtime";
const { Paragraph } = Typography;
export default function Role() {
  const [searchForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [roleList, setRoleList] = useState<RoleType[]>([])
  const [isEdit, setIsEdit] = useState<RoleType | null>(null)
  const [isAdd, setIsAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [treeData, setTreeData] = useState([])
  const [checkedKeys, setCheckedKeys] = useState<string[]>([])
  const [halfCheckedKeys, setHalfCheckedKeys] = useState<string[]>([])
  const userId = useSelector((state: StoreType) => state.user.userId)
  const onPaginationChange = (current: number, pageSize: number) => {
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
    const searchValue: {[key: string]: string} = {}
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
  const toEditRole = (val: RoleType) => {
    setLoading(true)
    setIsEdit(val)
  }
  const toDeleteRole = async (val: RoleType) => {
    await deleteRole({id: val._id})
    fetchList()
  }
  const toAddRole = () => {
    setLoading(true)
    setIsAdd(true)
  }
  const editName = async (name: string,val: RoleType) => {
    await editRole({
      ...val,
      editUserId: userId,
      name,
    })
    fetchList()
    message.success('编辑成功');
  }
  const handleOk = async () => {
    editForm.validateFields().then(async value => {
       if(isEdit) {
        Reflect.deleteProperty(value, 'createUserId')
        await editRole({
          ...isEdit,
          ...value,
          permissions: [...new Set([...checkedKeys,...halfCheckedKeys])].join(','),
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
      key: 'name',
      render: (_, val) => (<Paragraph editable={{ onChange: (name) => editName(name,val) }}>{val.name}</Paragraph>)
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
  const fetchPermiList = async () => {
    const {data} = await fetchPermissionList()
    setTreeData(data)
  }
  const afterModalOpenChange = async (isOpen: boolean) => {
    if (isOpen) {
      await fetchPermiList()
      if (isEdit) {
        const {permissions, ...data} = isEdit
        setCheckedKeys(permissions)
        editForm.setFieldsValue(data)
      }
      setLoading(false)
    } else {
      setCheckedKeys([])
    }
  }
  const onCheck: TreeProps['onCheck'] = (checkedKeysValue, check) => {
    setCheckedKeys(checkedKeysValue);
    setHalfCheckedKeys(check.halfCheckedKeys.map(v => `0-${v}`))
  };
  useEffect(() => {
    fetchList()
     
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
        afterOpenChange={afterModalOpenChange}
        onOk={handleOk}
        onCancel={handleCancel}
        loading={loading}
      >
        <Form form={editForm}>
          <Form.Item name="name" label="角色名称" rules={[
            {required: true, message: '请输入角色名称'}
          ]}>
            <Input placeholder="角色名称"></Input>
          </Form.Item>
          <Form.Item name="code" label="角色编码" rules={[
            {required: true, message: '请输入编码'}
          ]}>
            <Input placeholder="角色编码"></Input>
          </Form.Item>
          <Form.Item name="createUserId" initialValue={userId} hidden>
            <Input></Input>
          </Form.Item>
        </Form>
        <Form.Item label="权限控制">
          <Tree
            checkable
            onCheck={onCheck}
            checkedKeys={checkedKeys}
            treeData={treeData}
          />
        </Form.Item>
      </Modal>
    </Fragment>
  )
}