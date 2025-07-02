import { Button, Card, Form, Input, Select, Upload, Row, Col, Tree, message } from 'antd';
import { UploadOutlined, VideoCameraOutlined, LeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';

export default function AddCursor() {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  // 假数据
  const instructors = [
    { label: '张明', value: '张明' },
    { label: '李思思', value: '李思思' },
    { label: '王建', value: '王建' },
  ];
  const liveSessions = [
    { label: '直播1', value: '1' },
    { label: '直播2', value: '2' },
  ];
  const chapterTreeData = [
    { title: '第一章：课程介绍', key: '0-0', children: [
      {
        title: '第一节',
        key: '0-0-1'
      }
    ] },
    { title: '第二章：基础知识', key: '0-1' },
  ];

  return (
    <div className="p-8 h-full overflow-y-auto">
      {/* 顶部返回和标题 */}
      <div className="flex items-center mb-6">
        <Button type="link" icon={<LeftOutlined />} onClick={() => navigate(-1)}>
          返回列表
        </Button>
        <span className="text-xl font-bold flex-1 text-center -ml-16">添加课程</span>
      </div>

      {/* 基本信息 */}
      <Card>
        <Form form={form} layout="vertical">
          <Row gutter={24}>
            <Col span={8}>
              <Form.Item label="课程名称" name="course_name" rules={[{ required: true, message: '请输入课程名称' }]}>
                <Input placeholder="请输入课程名称" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="讲师" name="instructor" rules={[{ required: true, message: '请选择讲师' }]}>
                <Select placeholder="请选择讲师" options={instructors} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="课程简介" name="desc">
                <Input.TextArea rows={4} placeholder="请输入课程简介" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 章节管理 */}
      <Row gutter={24}>
        <Col span={8}>
          <Card title="章节管理" extra={<Button type="primary">+ 添加章节</Button>}>
            <Tree
              treeData={chapterTreeData}
              defaultExpandAll
              className="mb-4"
            />
          </Card>
        </Col>
        <Col span={16}>
          <Card title="章节详情">
            <Form layout="vertical">
              <Form.Item label="章节名称" name="chapter_name">
                <Input placeholder="请输入章节名称" />
              </Form.Item>
              <Form.Item label="上传资料">
                <Upload>
                  <Button icon={<UploadOutlined />}>上传文档</Button>
                </Upload>
                <Upload>
                  <Button icon={<VideoCameraOutlined />} className="ml-2">上传视频</Button>
                </Upload>
              </Form.Item>
              <Form.Item label="关联直播场次" name="live">
                <Select placeholder="请选择关联的直播场次" options={liveSessions} />
              </Form.Item>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* 底部按钮 */}
      <div className="flex justify-end mt-8 gap-4">
        <Button>保存草稿</Button>
        <Button type="primary">发布课程</Button>
      </div>
    </div>
  );
}
