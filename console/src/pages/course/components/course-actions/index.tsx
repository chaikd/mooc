import { Button, message, Modal, Space } from "antd"
import { getActionsByStatus, getButtonType, isDangerButton } from "@/utils/course-actions"
import { useNavigate } from "react-router"
import { CourseType, deleteCourse, updateCourse } from "@/api/course"

interface CourseActionsProps {
  status: {
    statusName: string;
    statusCode: string;
  }
  size?: 'small' | 'middle' | 'large'
  course: CourseType
  fetchList: () => void
}


export default function CourseActions({ status, size = 'small', course, fetchList }: CourseActionsProps) {
  const actions = getActionsByStatus(status)
  const navigate = useNavigate()
  const actionTouch = async (action: string) => {
    switch(action) {
      case '编辑':{
        navigate(`/course/edit/${course?._id}`)
        break;
      }
      case '发布':{
        const res = await updateCourse({
          _id: course?._id || '',
          statusCode: 2
        })
        if(res.success) {
          message.success('发布成功')
          fetchList()
        }
        break;
      }
      case '下架':{
        const {success} = await updateCourse({
          _id: course._id || '',
          statusCode: 1
        })
        if(success) {
          message.success('下架成功')
          fetchList()
        }
        break;
      }
      case '删除':{
        Modal.confirm({
          content: '确认删除？',
          onOk: async () => {
            const res = await deleteCourse(course?._id || '')
            if (res.success) {
              message.success('删除成功')
              fetchList()
            }
          }
        })
      }
    }
  }
  
  return (
    <Space size="small">
      {actions.map((action, index) => (
        <Button 
          key={index} 
          size={size} 
          type={getButtonType(action)}
          danger={isDangerButton(action)}
          onClick={() => actionTouch(action)}
        >
          {action}
        </Button>
      ))}
    </Space>
  )
} 