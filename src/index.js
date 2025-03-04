import express from "express";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const prisma = new PrismaClient({
  errorFormat: "minimal",
});
const PORT = process.env.PORT || 3000;

app.post("/user", async (req, res) => {
  const { username, password } = req.body;
  try {
    const data = await prisma.user.create({
      data: { username, password },
    });
    res.status(201).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.post("/profile", async (req, res) => {
  const { email, name, address, phone, userId } = req.body;
  try {
    const data = await prisma.profile.create({
      data: { email, name, address, phone, userId },
    });
    res.status(201).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create profile" });
  }
});

app.put("/update", async (req, res) => {
  const { id, username, password } = req.body;
  try {
    const data = await prisma.user.update({
      where: { id: Number(id) },
      data: { username, password },
    });
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

app.delete("/delete", async (req, res) => {
  const { id } = req.body;
  try {
    const data = await prisma.user.delete({
      where: { id: Number(id) },
    });
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

app.post("/category", async (req, res) => {
  const { name } = req.body;
  try {
    const data = await prisma.category.create({
      data: { name },
    });
    res.status(201).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

app.post("/insert-post", async (req, res) => {
  const { title, published, content, authorId, categoryId, assignedBy } =
    req.body;
  try {
    const data = await prisma.$transaction(async (prisma) => {
      const post = await prisma.post.create({
        data: { title, published, content, authorId },
      });
      await prisma.categoriesOnPosts.create({
        data: { postId: post.id, categoryId, assignedBy },
      });
      return post;
    });
    res.status(201).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

app.get("/get-user", async (req, res) => {
  try {
    const data = await prisma.user.findMany();
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get users" });
  }
});

app.get("/get-profile", async (req, res) => {
  const { id } = req.query;
  try {
    const data =
      await prisma.$queryRaw`SELECT * FROM "Profile" WHERE id=${Number(id)}`;
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const data = await prisma.post.findUnique({
      where: { id: Number(id) },
    });
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get post" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
