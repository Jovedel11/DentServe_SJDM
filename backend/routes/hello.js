import express from "express";

const router = express.Router();

router.post('/hello', (req, res) => {
  const { name } = req.body;
  res.send({ message: `Hello ${name}` })
})

export default router