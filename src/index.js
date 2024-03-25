import express from "express";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.post("/user", async (req, res) => {
  try {
    const data = await prisma.user.create({
      data: {
        username: "pcode",
        password: "PQssword123",
      },
    });
    res.send(data);
  } catch (error) {
    console.log(error);
  }
});

app.post("/profile", async (req, res) => {
  try {
    const data = await prisma.profile.create({
      data: {
        email: "pojok@gmail.com",
        name: "Pojok Code",
        address: "jl. flamboyan no 44 Kembangan jakarta Barat",
        phone: "081234567890",
        userId: 1,
      },
    });
    res.send(data);
  } catch (error) {
    console.log(error);
  }
});

app.put("/update", async (req, res) => {
  try {
    const data = await prisma.user.update({
      where: {
        id: 1,
      },
      data: {
        username: "pcodetest",
        password: "123",
      },
    });
    res.send(data);
  } catch (error) {
    console.log(error);
  }
});

app.delete("/delete", async (req, res) => {
  try {
    const data = await prisma.user.delete({
      where: {
        id: 2,
      },
    });
    res.send(data);
  } catch (error) {
    console.log(error);
  }
});

app.post("/category", async (req, res) => {
  try {
    const data = await prisma.category.create({
      data: {
        name: "Programming",
      },
    });
    res.send(data);
  } catch (error) {
    console.log(error);
  }
});

app.post("/insert-post", async (req, res) => {
  try {
    const data = await prisma.$transaction(async (prisma) => {
      const post = await prisma.post.create({
        data: {
          title: "Post Title",
          published: true,
          content: "Post Body",
          authorId: 1,
        },
      });
      await prisma.categoriesOnPosts.create({
        data: {
          postId: post.id,
          categoryId: 1,
          assignedBy: "admin",
        },
      });
      return post;
    });
    res.send(data);
  } catch (error) {
    console.log(error);
  }
});

app.get("/get-user", async (req, res) => {
  try {
    const data = await prisma.user.findMany();
    res.send(data);
  } catch (error) {
    console.log(error);
  }
});

app.get("/get-profile", async (req, res) => {
  try {
    const data = await prisma.$queryRaw`
      SELECT * FROM "Profile" where id=1
    `;
    res.send(data);
  } catch (error) {
    console.log(error);
  }
});

app.get("/post/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.post.findUnique({
      where: {
        id: Number(id),
      },
    });
    res.send(data);
  } catch (error) {
    console.log(error);
  }
});
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
