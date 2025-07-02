import { Button, Space } from "antd"
import { getActionsByStatus, getButtonType, isDangerButton } from "@/utils/course-actions"

interface CourseActionsProps {
  status: string
  size?: 'small' | 'middle' | 'large'
}

export default function CourseActions({ status, size = 'small' }: CourseActionsProps) {
  const actions = getActionsByStatus(status)
  
  return (
    <Space size="small">
      {actions.map((action, index) => (
        <Button 
          key={index} 
          size={size} 
          type={getButtonType(action)}
          danger={isDangerButton(action)}
        >
          {action}
        </Button>
      ))}
    </Space>
  )
} 