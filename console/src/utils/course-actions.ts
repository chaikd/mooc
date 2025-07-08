// 根据课程状态获取可用的操作按钮
export const getActionsByStatus = (status): string[] => {
  switch (status.statusCode) {
    case '2':
      return ['编辑', '下架', '删除']
    case '1':
      return ['编辑', '发布', '删除']
    case '3':
      return ['编辑', '发布', '删除']
    default:
      return ['编辑', '删除']
  }
}

// 获取按钮类型
export const getButtonType = (action: string): 'primary' | 'default' => {
  return action === '编辑' ? 'primary' : 'default'
}

// 判断是否为危险按钮
export const isDangerButton = (action: string): boolean => {
  return action === '删除'
} 