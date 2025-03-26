import express from "express";
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";

// Configuration
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware Configuration
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Utility Functions
class ValidationUtils {
  static createValidator(validations) {
    return async (req, res, next) => {
      await Promise.all(validations.map(validation => validation.run(req)));
      
      const errors = validationResult(req);
      if (errors.isEmpty()) {
        return next();
      }

      return res.status(400).json({ errors: errors.array() });
    };
  }

  static userCreationRules = [
    body('username')
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be 3-50 characters long'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
  ];

  static profileCreationRules = [
    body('email').isEmail().withMessage('Invalid email format'),
    body('name').optional().trim(),
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('phone').trim().isMobilePhone('any').withMessage('Invalid phone number')
  ];
}

class SecurityUtils {
  static async hashPassword(password: string) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }
}

// User Controller
class UserController {
  static async createUser(req, res) {
    try {
      const { username, password } = req.body;
      
      const existingUser = await prisma.user.findUnique({ 
        where: { username } 
      });
      
      if (existingUser) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const hashedPassword = await SecurityUtils.hashPassword(password);
      
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
  }

  static async updateUser(req, res) {
    try {
      const { id, username, password } = req.body;
      
      const updateData: any = {};
      if (username) updateData.username = username;
      if (password) updateData.password = await SecurityUtils.hashPassword(password);

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
  }

  static async deleteUser(req, res) {
    try {
      const { id } = req.body;
      
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
  }

  static async getUsers(req, res) {
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
  }
}

// Profile Controller
class ProfileController {
  static async createProfile(req, res) {
    try {
      const { email, name, address, phone, userId } = req.body;
      
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
  }

  static async getProfile(req, res) {
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
  }
}

// Post Controller
class PostController {
  static async createPost(req, res) {
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
  }

  static async getPost(req, res) {
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
  }
}

// Category Controller
class CategoryController {
  static async createCategory(req, res) {
    try {
      const { name } = req.body;
      
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
  }
}

// Routes
app.post("/user", 
  ValidationUtils.createValidator(ValidationUtils.userCreationRules),
  UserController.createUser
);

app.post("/profile", 
  ValidationUtils.createValidator(ValidationUtils.profileCreationRules),
  ProfileController.createProfile
);

app.put("/update", 
  ValidationUtils.createValidator([
    body('username').optional().trim().isLength({ min: 3, max: 50 }),
    body('password').optional().isLength({ min: 8 })
  ]),
  UserController.updateUser
);

app.delete("/delete", UserController.deleteUser);

app.post("/category", 
  ValidationUtils.createValidator([
    body('name').trim().notEmpty().withMessage('Category name is required')
  ]),
  CategoryController.createCategory
);

app.post("/insert-post", 
  ValidationUtils.createValidator([
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('content').optional(),
    body('published').optional().isBoolean(),
    body('authorId').isInt().withMessage('Valid author ID is required')
  ]),
  PostController.createPost
);

app.get("/get-user", UserController.getUsers);

app.get("/get-profile", ProfileController.getProfile);

app.get("/post/:id", PostController.getPost);

// Server Start
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;