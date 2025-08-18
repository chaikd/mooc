import { checkPromission } from "@/components/promission"

// 根据课程状态获取可用的操作按钮
export const getActionsByStatus = (status: {
  statusCode: string
}): string[] => {
  let actions = []
  switch (status.statusCode) {
    case '2':
      actions = ['编辑', '下架', '删除']
      break;
    case '1':
      actions = ['编辑', '发布', '删除']
      break;
    case '3':
      actions = ['编辑', '发布', '删除']
      break;
    default:
      actions = ['编辑', '删除']
  }
  return actions.map(v => {
    if(['编辑', '下架', '发布'].includes(v)) {
      return (checkPromission('EditCourse') && v) || ''
    }
    if(v === '删除') {
      return (checkPromission('DeleteCourse') && v) || ''
    }
    return v
  }).filter(v => !!v)
}

// 获取按钮类型
export const getButtonType = (action: string): 'primary' | 'default' => {
  return action === '编辑' ? 'primary' : 'default'
}

// 判断是否为危险按钮
export const isDangerButton = (action: string): boolean => {
  return action === '删除'
} 