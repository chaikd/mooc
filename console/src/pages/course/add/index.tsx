import { Button, Card, Form, Input, Select, Row, Col, message } from 'antd';
import { LeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { Image } from 'antd';
import { getAllUser, UserType } from '@/api/user';
import { InputNumber } from "antd";
import { createCursor, CursorType, getCursorDetail, updateCursor } from '@/api/course';
import CourseChapter from '../components/course-chapter';

export default function AddCursor() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [curseDetail, setCurseDetail] = useState<CursorType | null>(null)
  const [instructors, setInstructors] = useState([])
  const courseChapterTreeRef = useRef(null)
  const param = useParams()
  const getDetail = async () => {
    if(param.id) {
      const res = await getCursorDetail(param.id)
      form.setFieldsValue(res.data)
      setCurseDetail(res.data)
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
  useEffect(() => {
    getInstructors()
    getDetail()
  }, [])

  const submit = async (statusCode: 1 | 2) => {
    const data = form.getFieldsValue()
    data.statusCode = statusCode
    let res
    if (param.id) {
      res = await updateCursor({
        ...curseDetail,
        ...data
      })
    } else {
      res = await createCursor(data)
    }
    if(res.success) {
      const msg = param.id ? '编辑成功' : '添加成功'
      message.success(msg)
      navigate(-1)
    }
  }

  return (
    <div className="h-full">
      {/* 顶部返回和标题 */}
      <div className="flex items-center mb-4">
        <Button type="link" icon={<LeftOutlined />} onClick={() => navigate('/course')}>
          返回列表
        </Button>
        {/* <span className="text-xl font-bold flex-1 ml-4">添加课程</span> */}
      </div>

      {/* 基本信息 */}
      <Card>
        <Form form={form} layout="vertical">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="课程名称" name="courseName" rules={[{ required: true, message: '请输入课程名称' }]}>
                <Input placeholder="请输入课程名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="讲师" name="instructorId" rules={[{ required: true, message: '请选择讲师' }]}>
                <Select placeholder="请选择讲师" options={instructors} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="课程时长（分钟）" name="courseDuration" rules={[{ required: true, message: '请输入课程时长' }]}>
                <Input placeholder="请输入课程时长" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="价格" name="price" rules={[{ required: true, message: '请输入课程价格' }]}>
                <InputNumber placeholder="请输入课程价格" precision={2} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="课程简介" name="courseDesc">
                <Input.TextArea rows={3} placeholder="请输入课程简介" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="课程封面" name="courseCover">
                <Input placeholder="请输入课程封面地址" onChange={(e) => setCurseDetail({
                  ...curseDetail,
                  courseCover: e.target.value
                } as any)}/>
              </Form.Item>
              {curseDetail?.courseCover && <Image
                src={curseDetail?.courseCover}
                fallback="data:image/png;base64,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"
              />}
            </Col>
          </Row>
        </Form>
      </Card>

      {param.id && <div className="mt-4">
        <CourseChapter courseId={param.id} ref={courseChapterTreeRef}></CourseChapter>
      </div>}

      {/* 底部按钮 */}
      <div className="flex justify-end mt-8 gap-4">
        <Button onClick={() => submit(1)}>保存草稿</Button>
        <Button type="primary" onClick={() => submit(2)}>发布课程</Button>
      </div>
    </div>
  );
}
