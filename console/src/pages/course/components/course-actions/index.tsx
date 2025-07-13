import { Button, message, Modal, Space } from "antd"
import { getActionsByStatus, getButtonType, isDangerButton } from "@/utils/course-actions"
import { useNavigate } from "react-router"
import { deleteCursor, updateCursor } from "@/api/course"
import { useContext } from "react"
import { CursorContext } from "../../list"

interface CourseActionsProps {
  status: {
    statusName: string;
    statusCode: string;
  }
  size?: 'small' | 'middle' | 'large'
  course?: any
}

type contextType = {fetchList: () => void}

export default function CourseActions({ status, size = 'small', course }: CourseActionsProps) {
  const actions = getActionsByStatus(status)
  const navigate = useNavigate()
  const context: contextType = useContext(CursorContext) as contextType
  const actionTouch = async (action: string) => {
    switch(action) {
      case '编辑':
        navigate(`/course/edit/${course._id}`)
        break;
      case '发布':
        const res = await updateCursor({
          _id: course._id,
          statusCode: 2
        })
        if(res.success) {
          message.success('发布成功')
          context.fetchList()
        }
        break;
      case '下架':
        const {success} = await updateCursor({
          _id: course._id,
          statusCode: 1
        })
        if(success) {
          message.success('下架成功')
          context.fetchList()
        }
        break;
      case '删除':
        Modal.confirm({
          content: '确认删除？',
          onOk: async () => {
            const res = await deleteCursor(course._id)
            if (res.success) {
              message.success('删除成功')
              context.fetchList()
            }
          }
        })
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