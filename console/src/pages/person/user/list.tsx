import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, Space } from 'antd';
import { getUserList, addUser, editUser, deleteUser } from '@/api/user';
import { getRoleList } from '@/api/role';
import BreadcrumbChain from '@/components/breadcrumb-chain';

export default function User() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [roleOptions, setRoleOptions] = useState([]);

  const fetchRoles = async () => {
    const res = await getRoleList({ size: 100 });
    setRoleOptions((res.data || []).map(r => ({ value: r._id, label: r.name })));
  };

  const fetchList = async (params = {}) => {
    setLoading(true);
    const { current, pageSize } = pagination;
    const searchValues = searchForm.getFieldsValue()
    const searchProp = {}
    Object.keys(searchValues).forEach(k => {
      if(searchValues[k]) {
        searchProp[k] = searchValues[k]
      }
    })
    const res = await getUserList({
      size: pageSize,
      page: current,
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

  const handleEdit = (record) => {
    setEditing(record);
    setModalOpen(true);
    editForm.setFieldsValue(record);
  };

  const handleCancel = () => {
    setModalOpen(false)
    editForm.resetFields()
  }

  const handleDelete = async (record) => {
    await deleteUser({ _id: record._id });
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

  const handleTableChange = (pagination) => {
    setPagination(p => ({ ...p, current: pagination.current, pageSize: pagination.pageSize }));
    fetchList({ page: pagination.current, size: pagination.pageSize });
  };

  const handleSearch = () => {
    setPagination(p => ({ ...p, current: 1 }));
    fetchList({ page: 1 });
  };

  const columns = [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    { title: '角色', dataIndex: 'role', key: 'role', render: (_, val) => {
      return roleOptions.find(v => v.value === val.role)?.label
    } },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime', render: t => t ? new Date(t).toLocaleString() : '' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
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
        title={editing ? '编辑用户' : '添加用户'}
        destroyOnHidden
        open={modalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}><Input /></Form.Item>
          <Form.Item hidden={editing} name={editing ? null : 'password'} label="密码" rules={[{ required: true, message: '请输入密码' }]}><Input.Password /></Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}><Select options={roleOptions} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}