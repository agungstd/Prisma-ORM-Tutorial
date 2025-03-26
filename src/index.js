import express from "express";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware untuk validasi input
const validateInput = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({ errors: errors.array() });
  };
};

// Middleware untuk hash password
const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

app.post("/user", 
  validateInput([
    body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters long'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
  ]),
  async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Cek apakah username sudah ada
      const existingUser = await prisma.user.findUnique({ where: { username } });
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      
      const data = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
        },
        select: { 
          id: true, 
          username: true 
        }
      });
      
      res.status(201).json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create user" });
    }
});

app.post("/profile", 
  validateInput([
    body('email').isEmail().withMessage('Invalid email format'),
    body('name').optional().trim(),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('phone').trim().isMobilePhone('any').withMessage('Invalid phone number')
  ]),
  async (req, res) => {
    try {
      const { email, name, address, phone, userId } = req.body;
      
      // Cek apakah user sudah memiliki profile
      const existingProfile = await prisma.profile.findUnique({ 
        where: { userId } 
      });
      
      if (existingProfile) {
        return res.status(409).json({ error: "Profile already exists for this user" });
      }

      const data = await prisma.profile.create({
        data: {
          email,
          name,
          address,
          phone,
          userId
        }
      });
      
      res.status(201).json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create profile" });
    }
});

app.put("/update", 
  validateInput([
    body('username').optional().trim().isLength({ min: 3, max: 50 }),
    body('password').optional().isLength({ min: 8 })
  ]),
  async (req, res) => {
    try {
      const { id, username, password } = req.body;
      
      const updateData: any = {};
      if (username) updateData.username = username;
      if (password) updateData.password = await hashPassword(password);

      const data = await prisma.user.update({
        where: { id: Number(id) },
        data: updateData,
        select: { 
          id: true, 
          username: true 
        }
      });
      
      res.status(200).json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update user" });
    }
});

app.delete("/delete", async (req, res) => {
  try {
    const { id } = req.body;
    
    // Pastikan id diberikan
    if (!id) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const data = await prisma.user.delete({
      where: { id: Number(id) },
      select: { 
        id: true, 
        username: true 
      }
    });
    
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

app.post("/category", 
  validateInput([
    body('name').trim().notEmpty().withMessage('Category name is required')
  ]),
  async (req, res) => {
    try {
      const { name } = req.body;
      
      // Cek apakah kategori sudah ada
      const existingCategory = await prisma.category.findUnique({ 
        where: { name } 
      });
      
      if (existingCategory) {
        return res.status(409).json({ error: "Category already exists" });
      }

      const data = await prisma.category.create({
        data: { name }
      });
      
      res.status(201).json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create category" });
    }
});

app.post("/insert-post", 
  validateInput([
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').optional(),
    body('published').optional().isBoolean(),
    body('authorId').isInt().withMessage('Valid author ID is required')
  ]),
  async (req, res) => {
    try {
      const { title, published = false, content, authorId, categoryId, assignedBy = 'admin' } = req.body;
      
      const data = await prisma.$transaction(async (prisma) => {
        const post = await prisma.post.create({
          data: {
            title,
            published,
            content,
            authorId,
          },
        });
        
        await prisma.categoriesOnPosts.create({
          data: {
            postId: post.id,
            categoryId,
            assignedBy,
          },
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
    const data = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        createdAt: true,
        Post: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get users" });
  }
});

app.get("/get-profile", async (req, res) => {
  try {
    const data = await prisma.profile.findUnique({
      where: { id: 1 },
      include: {
        user: {
          select: {
            username: true
          }
        }
      }
    });
    
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

app.get("/post/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = await prisma.post.findUnique({
      where: { id: Number(id) },
      include: {
        author: {
          select: {
            username: true
          }
        },
        CategoriesOnPosts: {
          include: {
            category: true
          }
        }
      }
    });
    
    if (!data) {
      return res.status(404).json({ error: "Post not found" });
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get post" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;