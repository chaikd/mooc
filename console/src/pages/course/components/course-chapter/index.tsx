import { ChapterTreeNodeType, createChapter, deleteChapter, getParseChapterTree, updateChapter } from "@/api/course/chapter"
import { DeleteOutlined, EditOutlined, FileOutlined, FolderOutlined, PlusOutlined } from "@ant-design/icons"
import { Button, Card, Col, Empty, Form, Input, InputNumber, message, Modal, Popconfirm, Row, Space, Spin, Tree, TreeNodeProps, Upload } from "antd"
import TextArea from "antd/es/input/TextArea"
import { Ref, useEffect, useImperativeHandle, useRef, useState } from "react"
import { Link } from "react-router"
import ChapterUpload from "../chapter-upload"
import { addInformation, InformationType } from "@/api/information"
import { BasicDataNode } from "antd/es/tree"

interface CourseChapterProps {
  courseId: string | undefined;
  isEdit?: boolean;
  ref?: Ref<{handleAdd: () => void}>;
}

export default function CourseChapter({ courseId, isEdit = false, ref }: CourseChapterProps) {
  const [form] = Form.useForm();
  const [detailForm] = Form.useForm()
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [selectedChapter, setSelectedChapter] = useState<ChapterTreeNodeType | null>(null)
  const [editing, setEditing] = useState(false);
  const [currentChapter, setCurrentChapter] = useState<ChapterTreeNodeType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [chapterTree, setChapterTree] = useState<ChapterTreeNodeType[]>([]);
  const chapterUploadRef = useRef(null)

  useImperativeHandle(ref, () => ({
    handleAdd
  }))
  useEffect(() => {
    fetchChapterTree()
  }, [])
  // 获取章节树
  const fetchChapterTree = async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const {trees, keys} = await getParseChapterTree(courseId);
      setChapterTree(trees)
      // 默认展开所有节点
      setExpandedKeys(keys);
    } catch (error) {
      console.error('失败:', error);
      message.error('获取章节列表失败');
    } finally {
      setLoading(false);
    }
  };
  // 打开新增章节弹窗
  const handleAdd = (parentChapter?: ChapterTreeNodeType) => {
    setEditing(false);
    setCurrentChapter(parentChapter || null);
    form.resetFields();
    if (parentChapter) {
      const lastChild = parentChapter?.children?.[parentChapter?.children.length - 1]
      form.setFieldsValue({
        parentChapterId: parentChapter._id,
        sort: (lastChild?.sort || -1) + 1
      });
    }
    setModalOpen(true);
  };
  // 打开编辑章节弹窗
  const handleEdit = (chapter: ChapterTreeNodeType) => {
    setEditing(true);
    setCurrentChapter(chapter);
    form.setFieldsValue({
      chapterName: chapter.chapterName,
      chapterDesc: chapter.chapterDesc,
      sort: chapter.sort || 0
    });
    setModalOpen(true);
  };

  // 删除章节
  const handleDelete = async (chapter: ChapterTreeNodeType) => {
    if (!chapter._id) return;
    
    try {
      await deleteChapter(chapter._id);
      message.success('删除成功');
      fetchChapterTree();
    } catch (error) {
      console.error('失败:', error);
      message.error('删除失败');
    }
  };

  const onTreeSelect = async (
    selectedKeys: React.Key[],
    info: { selectedNodes: Array<{ data: ChapterTreeNodeType }> }
  ) => {
    setSelectedKeys(selectedKeys as string[]);
    setSelectedChapter(info.selectedNodes[0]?.data);
    detailForm.setFieldsValue(info.selectedNodes[0]?.data);
  };

  // 提交表单
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const list = (chapterUploadRef.current as {getFileList: () => InformationType[]} | null)?.getFileList() as InformationType[]
      if(list?.length > 0) {
        const {data} = await addInformation({list})
        values.materialIds = data.map((v: {_id: string}) => v._id)
      }
      if (editing && currentChapter?._id) {
        // 编辑
        await updateChapter({
          _id: currentChapter._id,
          ...values,
          courseId: courseId!
        });
        message.success('更新成功');
      } else {
        // 新增
        await createChapter({
          ...values,
          courseId: courseId!
        });
        message.success('创建成功');
      }
      
      setModalOpen(false);
      fetchChapterTree();
    } catch (error) {
      console.error('提交失败:', error);
    }
  };

  // 渲染树节点
  const renderTreeNodes = (nodes: ChapterTreeNodeType[]): BasicDataNode[] => {
    return nodes?.map(node => ({
      key: node._id,
      title: (
        <div className={`flex items-center justify-between w-full ${node.parentChapterId ? 'ml-8' : ''}`}>
          <span>{node.chapterName}</span>
          {isEdit && <Space size="small">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleAdd(node);
              }}
            >
            </Button>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(node);
              }}
            />
            <Popconfirm
              title="确定要删除这个章节吗？"
              onConfirm={(e) => {
                e?.stopPropagation();
                handleDelete(node);
              }}
              onCancel={(e) => e?.stopPropagation()}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Space>}
        </div>
      ),
      icon: node.children && node.children.length > 0 ? <FolderOutlined className={node.parentChapterId ? 'ml-8' : ''}/> : <FileOutlined  className={node.parentChapterId ? 'ml-8' : ''}/>,
      children: node.children ? renderTreeNodes(node.children) : undefined,
      data: node
    }));
  };
  
  return(
    <>
      <Row gutter={24}>
        <Col span={isEdit ? 8 : 24}>
          <Card title={
            <>
              <div className="flex justify-between">
                <span>章节</span>
                {!isEdit && <Link to={`/course/chapters/${courseId}`}>章节管理</Link>}
              </div>
            </>
          }>
            {(!chapterTree || chapterTree.length === 0) && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            <Spin spinning={loading}>
              <Tree
                treeData={renderTreeNodes(chapterTree)}
                showIcon
                expandedKeys={expandedKeys}
                selectedKeys={selectedKeys}
                onExpand={(keys) => setExpandedKeys(keys as string[])}
                onSelect={(selectedKeys, info) => onTreeSelect(
                  selectedKeys,
                  { selectedNodes: (info).selectedNodes?.map((n: TreeNodeProps) => ({ data: n.data })) ?? [] }
                )}
              />
            </Spin>
          </Card>
        </Col>
        {isEdit && <Col span={16}>
          <Card title="章节详情">
            <Form form={detailForm} layout="vertical" disabled={!selectedKeys || selectedKeys.length === 0}>
              <Form.Item label="章节名称" name="chapterName">
                <Input placeholder="请输入章节名称" readOnly/>
              </Form.Item>
              <Form.Item
                name="chapterDesc"
                label="章节描述"
              >
                <TextArea
                  rows={3}
                  placeholder="请输入章节描述"
                  readOnly
                />
              </Form.Item>
              <Form.Item label="资料">
                <div className="flex">
                  <Space>
                    <Upload
                      fileList={
                        selectedChapter?.materials?.map((v) => ({
                          ...v,
                          url: v.fileUrl,
                          uid: v._id as string, // ensure uid is always a string
                          name: v.name,
                          status: 'done',
                        })) || []
                      }
                      disabled
                      showUploadList={{ showRemoveIcon: false }}
                    >
                      {/* <Button icon={<UploadOutlined />}>上传文档</Button> */}
                    </Upload>
                  </Space>
                </div>
              </Form.Item>
              {/* <Form.Item label="关联直播场次" name="live">
                <Select placeholder="请选择关联的直播场次" options={liveSessions} />
              </Form.Item> */}
            </Form>
          </Card>
        </Col>}
      </Row>
      <Modal
        title={editing ? '编辑章节' : '添加章节'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="chapterName"
            label="章节名称"
            rules={[{ required: true, message: '请输入章节名称' }]}
          >
            <Input placeholder="请输入章节名称" />
          </Form.Item>

          <Form.Item
            name="chapterDesc"
            label="章节描述"
          >
            <TextArea
              rows={3}
              placeholder="请输入章节描述"
            />
          </Form.Item>

          <Form.Item label="上传资料">
            <ChapterUpload ref={chapterUploadRef}></ChapterUpload>
          </Form.Item>

          <Form.Item
            name="sort"
            label="排序"
            initialValue={0}
          >
            <InputNumber
              min={0}
              placeholder="数字越小排序越靠前"
              style={{ width: '100%' }}
            />
          </Form.Item>

          {currentChapter && (
            <Form.Item
              name="parentChapterId"
              label="父级章节"
              initialValue={isEdit ? currentChapter.parentChapterId : currentChapter._id}
            >
              <Input disabled />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  )
}