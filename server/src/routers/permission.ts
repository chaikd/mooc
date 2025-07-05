import { Permission, User } from "@/models"
import { createDoc, deleteDoc, findAll, findDocs, updateDoc } from "@/utils/database/actions"
import Express from "express"

const router = Express.Router()

router.post('/add', async (req, res) => {
  const role = await createDoc(Permission, req.body);
  res.json({ success: true, data: role });
})

router.post('/edit', async (req, res) => {
  const {_id, ...data} = req.body
  const role = await updateDoc(Permission, _id, data);
  res.json({ success: true, data: role });
})

router.delete('/delete', async (req, res) => {
  const { id } = req.query as {id: string};
  const result = await deleteDoc(Permission, id);
  res.json({ success: true, data: result });
})

router.get('/list', async (req, res) => {
  const data = await findAll(Permission)
  res.json({
    success: true,
    data
  })
})

export default router