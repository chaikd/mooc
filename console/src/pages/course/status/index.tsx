import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message, Popconfirm, Space } from 'antd';
import { 
  getCursorStatusList, 
  createCursorStatus, 
  updateCursorStatus, 
  deleteCursorStatus,
  CursorStatusType,
} from '@/api/course/status';
import BreadcrumbChain from '@/components/breadcrumb-chain';

export default function CursorStatus() {
  const [list, setList] = useState<CursorStatusType[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CursorStatusType | null>(null);
  const [editForm] = Form.useForm();
  const [searchForm] = Form.useForm();
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  const fetchList = async (params = {}) => {
    setLoading(true);
    try {
      const { current, pageSize } = pagination;
      let searchValues = searchForm.getFieldsValue();
      let searchProp = {};
      Object.keys(searchValues).forEach(k => {
        if (!!searchValues[k]) {
          searchProp[k] = searchValues[k];
        }
      });

      const res = await getCursorStatusList({
        size: pageSize,
        page: current,
        ...searchProp,
        ...params
      });

      setList(res.data.data || []);
      setPagination(p => ({ ...p, total: res.data.total ?? 0 }));
    } catch (error) {
      message.error('获取课程状态列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
    editForm.resetFields();
  };

  const handleEdit = (record: CursorStatusType) => {
    setEditing(record);
    setModalOpen(true);
    editForm.setFieldsValue(record);
  };

  const handleCancel = () => {
    setModalOpen(false);
    editForm.resetFields();
  };

  const handleDelete = async (record: CursorStatusType) => {
    try {
      await deleteCursorStatus(record._id!);
      message.success('删除成功');
      fetchList();
    } catch (error) {
      message.error('删除失败');
    }
  };

  const handleOk = async () => {
    try {
      const values = await editForm.validateFields();
      
      if (editing) {
        // 更新
        await updateCursorStatus({
          _id: editing._id!,
          ...values
        });
        message.success('更新成功');
      } else {
        // 新增
        await createCursorStatus(values);
        message.success('添加成功');
      }
      
      setModalOpen(false);
      fetchList();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleTableChange = (pagination: any) => {
    setPagination(p => ({ 
      ...p, 
      current: pagination.current, 
      pageSize: pagination.pageSize 
    }));
    fetchList({ 
      page: pagination.current, 
      size: pagination.pageSize 
    });
  };

  const handleSearch = () => {
    setPagination(p => ({ ...p, current: 1 }));
    fetchList({ page: 1 });
  };

  const columns = [
    { 
      title: '状态代码', 
      dataIndex: 'statusCode', 
      key: 'statusCode' 
    },
    { 
      title: '状态名称', 
      dataIndex: 'statusName', 
      key: 'statusName' 
    },
    { 
      title: '状态描述', 
      dataIndex: 'statusDesc', 
      key: 'statusDesc' 
    },
    { 
      title: '排序', 
      dataIndex: 'sort', 
      key: 'sort',
      render: (sort: number) => sort || 0
    },
    { 
      title: '创建时间', 
      dataIndex: 'createTime', 
      key: 'createTime',
      render: (time: string) => time ? new Date(time).toLocaleString() : ''
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: CursorStatusType) => (
        <Space>
          <Button type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm 
            title="确定删除吗？" 
            onConfirm={() => handleDelete(record)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <BreadcrumbChain />
      
      <div className="mt-4">
        <Form form={searchForm} layout="inline" style={{ marginBottom: 16 }}>
          <Form.Item name="statusName" label="状态名称">
            <Input placeholder="搜索状态名称" allowClear />
          </Form.Item>
          <Form.Item name="statusCode" label="状态代码">
            <Input placeholder="搜索状态代码" allowClear />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleSearch}>
              搜索
            </Button>
          </Form.Item>
        </Form>
      </div>

      <Button type="primary" onClick={handleAdd} style={{ marginBottom: 16 }}>
        添加状态
      </Button>

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
          showTotal: (total) => `共 ${total} 条`
        }}
        onChange={handleTableChange}
      />

      <Modal
        title={editing ? '编辑课程状态' : '添加课程状态'}
        destroyOnHidden
        open={modalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item 
            name="statusCode" 
            label="状态代码" 
            rules={[{ required: true, message: '请输入状态代码' }]}
          >
            <Input placeholder="请输入状态代码" />
          </Form.Item>
          
          <Form.Item 
            name="statusName" 
            label="状态名称" 
            rules={[{ required: true, message: '请输入状态名称' }]}
          >
            <Input placeholder="请输入状态名称" />
          </Form.Item>
          
          <Form.Item 
            name="statusDesc" 
            label="状态描述"
          >
            <Input.TextArea placeholder="请输入状态描述" rows={3} />
          </Form.Item>
          
          <Form.Item 
            name="sort" 
            label="排序"
          >
            <InputNumber 
              placeholder="请输入排序值" 
              min={0} 
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
