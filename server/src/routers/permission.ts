import { Permission, mdaction } from "@mooc/db-shared"
import Express from "express"

const router = Express.Router()

router.post('/add', async (req, res) => {
  const role = await mdaction.createDoc(Permission, req.body);
  res.json({ success: true, data: role });
})

router.post('/edit', async (req, res) => {
  const {_id, ...data} = req.body
  const role = await mdaction.updateDoc(Permission, _id, data);
  res.json({ success: true, data: role });
})

router.delete('/delete', async (req, res) => {
  const { id } = req.query as {id: string};
  const result = await mdaction.deleteDoc(Permission, id);
  res.json({ success: true, data: result });
})

router.get('/list', async (req, res) => {
  const data = await mdaction.findAll(Permission)
  res.json({
    success: true,
    data
  })
})

export default router