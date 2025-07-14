import { useEffect, useState } from 'react';
import { Select, SelectProps } from 'antd';
import { getAllCourseStatus, CourseStatusType } from '@/api/course/status';

interface CourseStatusSelectProps extends Omit<SelectProps, 'options'> {
  placeholder?: string;
  allowClear?: boolean;
}

export default function CourseStatusSelect(props: CourseStatusSelectProps) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStatusOptions = async () => {
    setLoading(true);
    try {
      const res = await getAllCourseStatus();
      const statusOptions = res.data.map((status: CourseStatusType) => ({
        value: status._id!,
        label: `${status.statusName} (${status.statusCode})`
      }));
      setOptions(statusOptions);
    } catch (error) {
      console.error('获取课程状态选项失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusOptions();
  }, []);

  return (
    <Select
      {...props}
      options={options}
      loading={loading}
      placeholder={props.placeholder || '请选择课程状态'}
      allowClear={props.allowClear !== false}
    />
  );
} 