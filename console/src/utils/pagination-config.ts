// 分页配置
export const getPaginationConfig = (total: number, pageSize: number, current: number, onChange: (page: number) => void) => {
  return {
    current,
    total,
    pageSize,
    showSizeChanger: false,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`,
    onChange
  }
}

// 表格分页配置
export const getTablePaginationConfig = (total: number, pageSize: number, current: number, onChange: (page: number) => void) => {
  return {
    pageSize,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) => `第 ${range[0]}-${range[1]} 条/共 ${total} 条`
  }
} 