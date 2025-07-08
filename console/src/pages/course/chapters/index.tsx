import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Button,
  message,
  Typography,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  PlusOutlined,
} from '@ant-design/icons';
import { getCursorDetail, CursorDetailType } from '@/api/course';
import BreadcrumbChain from '@/components/breadcrumb-chain';
import { useParams } from 'react-router';
import CourseChapter from '../components/course-chapter';

const { Title, Text } = Typography;

const CursorChapters: React.FC = () => {
  const { id: courseId } = useParams<{ id: string }>();
  const [courseInfo, setCourseInfo] = useState<CursorDetailType | null>(null);
  const courseChapterTreeRef = useRef(null)
  const breadcrumbItems = [
    { title: '课程管理', href: '/course' },
    { title: courseInfo?.courseName || '课程详情', href: `/course/edit/${courseId}` },
    { title: '章节管理' }
  ];

  // 获取课程信息
  const fetchCourseInfo = async () => {
    if (!courseId) return;
    try {
      const { data } = await getCursorDetail(courseId);
      setCourseInfo(data);
    } catch (error) {
      message.error('获取课程信息失败');
    }
  };
  const handleAdd = () => {
    courseChapterTreeRef.current.handleAdd()
  }

  useEffect(() => {
    fetchCourseInfo();
  }, [courseId]);

  return (
    <div>
      <BreadcrumbChain breads={breadcrumbItems}/>
      
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={4}>
              {courseInfo?.courseName} - 章节管理
            </Title>
            <Text type="secondary">
              讲师: {courseInfo?.instructorInfo?.username} | 
              状态: {courseInfo?.statusInfo?.statusName}
            </Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleAdd()}
            >
              添加根章节
            </Button>
          </Col>
        </Row>

        <Divider />

        <CourseChapter courseId={courseId} isEdit={true} ref={courseChapterTreeRef}></CourseChapter>
      </Card>
    </div>
  );
};

export default CursorChapters; 