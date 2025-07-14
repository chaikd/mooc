import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, TablePaginationConfig } from 'antd';
import { getUserList, addUser, editUser, deleteUser, UserType } from '@/api/user';
import { getRoleList } from '@/api/role';
import BreadcrumbChain from '@/components/breadcrumb-chain';

export default function User() {
  const [list, setList] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserType | null>(null);
  const [editForm] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [pagination, setPagination] = useState<TablePaginationConfig>({ current: 1, pageSize: 10, total: 0 });
  const [roleOptions, setRoleOptions] = useState<{value: string | undefined, label: string | undefined}[]>([]);

  const fetchRoles = async () => {
    const res = await getRoleList({ size: 100 });
    setRoleOptions((res.data || []).map(r => ({ value: r._id, label: r.name })));
  };

  const fetchList = async (params = {}) => {
    setLoading(true);
    const { current, pageSize } = pagination;
    const searchValues = searchForm.getFieldsValue()
    const searchProp: Record<string, string> = {}
    Object.keys(searchValues).forEach(k => {
      if(searchValues[k]) {
        searchProp[k] = searchValues[k]
      }
    })
    const res = await getUserList({
      size: pageSize as number,
      page: current as number,
      ...searchProp,
      ...params
    });
    setList(res.data || []);
    setPagination(p => ({ ...p, total: res.total ?? (res.data ? res.data.length : 0) }));
    setLoading(false);
  };

  useEffect(() => {
    fetchRoles();
    fetchList();
     
  }, []);

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
    editForm.resetFields()
  };

  const handleEdit = (record: UserType) => {
    setEditing(record as UserType);
    setModalOpen(true);
    editForm.setFieldsValue(record);
  };

  const handleCancel = () => {
    setModalOpen(false)
    editForm.resetFields()
  }

  const handleDelete = async (record: UserType) => {
    await deleteUser({ _id: record._id as string});
    message.success('删除成功');
    fetchList();
  };

  const handleOk = async () => {
    const values = await editForm.validateFields();
    if (editing) {
      await editUser({ ...editing, ...values });
      message.success('编辑成功');
    } else {
      await addUser(values);
      message.success('添加成功');
    }
    setModalOpen(false);
    fetchList();
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    setPagination(p => ({ ...p, current: pagination.current, pageSize: pagination.pageSize }));
    fetchList({ page: pagination.current, size: pagination.pageSize });
  };

  const handleSearch = () => {
    setPagination(p => ({ ...p, current: 1 }));
    fetchList({ page: 1 });
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '角色', dataIndex: 'role', key: 'role', render: (_: string, val: UserType) => {
      return roleOptions.find(v => v.value === val.role)?.label
    } },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime', render: (t: string) => t ? new Date(t).toLocaleString() : '' },
    {
      title: '操作',
      key: 'action',
      render: (_: string, record: UserType) => (
        <>
          <Button type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除吗？" onConfirm={() => handleDelete(record)}>
            <Button type="link" danger>删除</Button>
          </Popconfirm>
        </>
      )
    }
  ];

  return (
    <div>
      <BreadcrumbChain></BreadcrumbChain>
      <div className='mt-4'></div>
      <Form form={searchForm} layout="inline" style={{ marginBottom: 16 }}>
        <Form.Item name="username" label="用户名"><Input placeholder="搜索用户名" allowClear /></Form.Item>
        <Form.Item name="role" label="角色"><Select allowClear options={roleOptions} placeholder="全部角色" style={{ minWidth: 120 }} /></Form.Item>
        <Form.Item>
          <Button type="primary" onClick={handleSearch}>搜索</Button>
        </Form.Item>
      </Form>
      <Button type="primary" onClick={handleAdd} style={{ marginBottom: 16 }}>添加用户</Button>
      <Table
        rowKey="_id"
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: t => `共 ${t} 条`
        }}
        onChange={handleTableChange}
      />
      <Modal
        title={!editing ? '添加用户' : '编辑用户'}
        destroyOnHidden
        open={modalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}><Input /></Form.Item>
          {!editing && (
            <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}><Select options={roleOptions} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}