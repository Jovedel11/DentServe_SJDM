import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// middlewares
app.use(express.json());

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));

// routes
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Express Backend" })
});

app.post("/api/echo", (req, res) => {
  res.json({ youSent: req.body })
});

app.get("/", (req, res) => res.send("<h1>Hello From Backend</h1>"))

app.get("/health", (_req, res) => res.send("OK"));

app.listen(PORT, () => console.log(`API listening at http://localhost:${PORT}`))
