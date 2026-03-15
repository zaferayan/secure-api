require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");

const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerDoc = require("./swagger.json");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "secure-api-secret-key";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@secure-api.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

app.set("json spaces", 2);
app.use(cors());
app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// --- DB helpers ---

function getDb() {
  return JSON.parse(fs.readFileSync("db.json", "utf-8"));
}

function saveDb(db) {
  fs.writeFileSync("db.json", JSON.stringify(db, null, 2));
}

// --- Auth Middleware ---

function authenticate(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

// --- Homepage ---

app.get("/", (req, res) => {
  res.json({
    name: "Secure API",
    version: "1.0.0",
    endpoints: {
      public: {
        "POST /auth/register": "Create a new account",
        "POST /auth/login": "Login and get a token",
        "GET /products": "List all products",
        "GET /products/:id": "Get a single product",
        "GET /posts": "List all posts",
        "GET /posts/:id": "Get a single post",
      },
      protected: {
        "GET /auth/me": "Get current user profile",
        "PUT /auth/me": "Update current user profile",
        "GET /orders": "List current user's orders",
        "POST /orders": "Create a new order",
        "GET /orders/:id": "Get a specific order",
        "POST /posts": "Create a new post",
        "PUT /posts/:id": "Update own post",
        "DELETE /posts/:id": "Delete own post",
        "GET /comments": "List comments",
        "POST /comments": "Add a comment to a post",
        "DELETE /comments/:id": "Delete own comment",
        "GET /admin/users": "List all users (admin only)",
        "DELETE /admin/users/:id": "Delete a user (admin only)",
      },
    },
  });
});

// =====================
// AUTH ROUTES (public)
// =====================

// POST /auth/register
app.post("/auth/register", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email, and password are required." });
  }

  const db = getDb();

  if (db.users.find((u) => u.email === email)) {
    return res.status(409).json({ error: "Email already exists." });
  }

  if (db.users.find((u) => u.username === username)) {
    return res.status(409).json({ error: "Username already taken." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const maxId = db.users.reduce((max, u) => Math.max(max, u.id), 0);

  const newUser = {
    id: maxId + 1,
    username,
    email,
    password: hashedPassword,
    role: "user",
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  saveDb(db);

  const token = jwt.sign({ id: newUser.id, username: newUser.username, role: newUser.role }, SECRET, { expiresIn: "7d" });
  const { password: _, ...userWithoutPassword } = newUser;

  res.status(201).json({ token, user: userWithoutPassword });
});

// POST /auth/login
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required." });
  }

  const db = getDb();
  const user = db.users.find((u) => u.email === email);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: "7d" });
  const { password: _, ...userWithoutPassword } = user;

  res.json({ token, user: userWithoutPassword });
});

// GET /auth/me (protected)
app.get("/auth/me", authenticate, (req, res) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// PUT /auth/me (protected)
app.put("/auth/me", authenticate, async (req, res) => {
  const { username, email, password } = req.body;
  const db = getDb();
  const index = db.users.findIndex((u) => u.id === req.user.id);

  if (index === -1) {
    return res.status(404).json({ error: "User not found." });
  }

  if (email && email !== db.users[index].email) {
    if (db.users.find((u) => u.email === email && u.id !== req.user.id)) {
      return res.status(409).json({ error: "Email already in use." });
    }
    db.users[index].email = email;
  }

  if (username) db.users[index].username = username;
  if (password) db.users[index].password = await bcrypt.hash(password, 10);

  saveDb(db);

  const { password: _, ...userWithoutPassword } = db.users[index];
  res.json(userWithoutPassword);
});

// ==========================
// PRODUCTS ROUTES (public)
// ==========================

// GET /products
app.get("/products", (req, res) => {
  const db = getDb();
  res.json(db.products);
});

// GET /products/:id
app.get("/products/:id", (req, res) => {
  const db = getDb();
  const product = db.products.find((p) => p.id === Number(req.params.id));

  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }

  res.json(product);
});

// ==========================
// POSTS ROUTES (mixed)
// ==========================

// GET /posts (public)
app.get("/posts", (req, res) => {
  const db = getDb();
  res.json(db.posts);
});

// GET /posts/:id (public)
app.get("/posts/:id", (req, res) => {
  const db = getDb();
  const post = db.posts.find((p) => p.id === Number(req.params.id));

  if (!post) {
    return res.status(404).json({ error: "Post not found." });
  }

  res.json(post);
});

// POST /posts (protected)
app.post("/posts", authenticate, (req, res) => {
  const { title, body, category } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: "title and body are required." });
  }

  const db = getDb();
  const maxId = db.posts.reduce((max, p) => Math.max(max, p.id), 0);

  const newPost = {
    id: maxId + 1,
    title,
    body,
    category: category || "general",
    authorId: req.user.id,
  };

  db.posts.push(newPost);
  saveDb(db);

  res.status(201).json(newPost);
});

// PUT /posts/:id (protected - own posts only)
app.put("/posts/:id", authenticate, (req, res) => {
  const db = getDb();
  const index = db.posts.findIndex((p) => p.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Post not found." });
  }

  if (db.posts[index].authorId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "You can only edit your own posts." });
  }

  const { title, body, category } = req.body;
  if (title) db.posts[index].title = title;
  if (body) db.posts[index].body = body;
  if (category) db.posts[index].category = category;

  saveDb(db);
  res.json(db.posts[index]);
});

// DELETE /posts/:id (protected - own posts or admin)
app.delete("/posts/:id", authenticate, (req, res) => {
  const db = getDb();
  const index = db.posts.findIndex((p) => p.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Post not found." });
  }

  if (db.posts[index].authorId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "You can only delete your own posts." });
  }

  const deleted = db.posts.splice(index, 1)[0];
  saveDb(db);
  res.json(deleted);
});

// ==========================
// ORDERS ROUTES (protected)
// ==========================

// GET /orders (protected - own orders)
app.get("/orders", authenticate, (req, res) => {
  const db = getDb();

  const orders = req.user.role === "admin"
    ? db.orders
    : db.orders.filter((o) => o.userId === req.user.id);

  res.json(orders);
});

// GET /orders/:id (protected - own order)
app.get("/orders/:id", authenticate, (req, res) => {
  const db = getDb();
  const order = db.orders.find((o) => o.id === Number(req.params.id));

  if (!order) {
    return res.status(404).json({ error: "Order not found." });
  }

  if (order.userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "Access denied." });
  }

  res.json(order);
});

// POST /orders (protected)
app.post("/orders", authenticate, (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    return res.status(400).json({ error: "productId and quantity are required." });
  }

  const db = getDb();
  const product = db.products.find((p) => p.id === productId);

  if (!product) {
    return res.status(404).json({ error: "Product not found." });
  }

  if (product.stock < quantity) {
    return res.status(400).json({ error: `Not enough stock. Available: ${product.stock}` });
  }

  const maxId = db.orders.reduce((max, o) => Math.max(max, o.id), 0);

  const newOrder = {
    id: maxId + 1,
    userId: req.user.id,
    productId,
    quantity,
    status: "pending",
    date: new Date().toISOString().split("T")[0],
  };

  product.stock -= quantity;
  db.orders.push(newOrder);
  saveDb(db);

  res.status(201).json(newOrder);
});

// ==========================
// COMMENTS ROUTES (mixed)
// ==========================

// GET /comments (protected)
app.get("/comments", authenticate, (req, res) => {
  const db = getDb();
  const { postId } = req.query;

  const comments = postId
    ? db.comments.filter((c) => c.postId === Number(postId))
    : db.comments;

  res.json(comments);
});

// POST /comments (protected)
app.post("/comments", authenticate, (req, res) => {
  const { postId, body } = req.body;

  if (!postId || !body) {
    return res.status(400).json({ error: "postId and body are required." });
  }

  const db = getDb();
  const post = db.posts.find((p) => p.id === postId);

  if (!post) {
    return res.status(404).json({ error: "Post not found." });
  }

  const maxId = db.comments.reduce((max, c) => Math.max(max, c.id), 0);

  const newComment = {
    id: maxId + 1,
    postId,
    userId: req.user.id,
    body,
    date: new Date().toISOString().split("T")[0],
  };

  db.comments.push(newComment);
  saveDb(db);

  res.status(201).json(newComment);
});

// DELETE /comments/:id (protected - own comment or admin)
app.delete("/comments/:id", authenticate, (req, res) => {
  const db = getDb();
  const index = db.comments.findIndex((c) => c.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "Comment not found." });
  }

  if (db.comments[index].userId !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({ error: "You can only delete your own comments." });
  }

  const deleted = db.comments.splice(index, 1)[0];
  saveDb(db);
  res.json(deleted);
});

// ==========================
// ADMIN ROUTES (admin only)
// ==========================

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

// PUT /admin/users/:id/role (admin only - promote/demote users)
app.put("/admin/users/:id/role", authenticate, adminOnly, (req, res) => {
  const { role } = req.body;

  if (!role || !["user", "admin"].includes(role)) {
    return res.status(400).json({ error: "role must be 'user' or 'admin'." });
  }

  const db = getDb();
  const index = db.users.findIndex((u) => u.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "User not found." });
  }

  db.users[index].role = role;
  saveDb(db);

  const { password: _, ...userWithoutPassword } = db.users[index];
  res.json(userWithoutPassword);
});

// GET /admin/users (admin only)
app.get("/admin/users", authenticate, adminOnly, (req, res) => {
  const db = getDb();
  const users = db.users.map(({ password, ...u }) => u);
  res.json(users);
});

// DELETE /admin/users/:id (admin only)
app.delete("/admin/users/:id", authenticate, adminOnly, (req, res) => {
  const db = getDb();
  const index = db.users.findIndex((u) => u.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ error: "User not found." });
  }

  if (db.users[index].id === req.user.id) {
    return res.status(400).json({ error: "You cannot delete yourself." });
  }

  const deleted = db.users.splice(index, 1)[0];
  const { password: _, ...userWithoutPassword } = deleted;
  saveDb(db);
  res.json(userWithoutPassword);
});

// --- Seed admin user ---

async function seedAdmin() {
  const db = getDb();
  if (db.users.length === 0) {
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    db.users.push({
      id: 1,
      username: "admin",
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: "admin",
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    console.log(`  Seed admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}\n`);
  }
}

// --- Start ---

app.listen(PORT, async () => {
  await seedAdmin();
  console.log(`\n  Secure API running at http://localhost:${PORT}\n`);
  console.log("  Public endpoints:");
  console.log("    POST /auth/register");
  console.log("    POST /auth/login");
  console.log("    GET  /products");
  console.log("    GET  /posts");
  console.log("\n  Protected endpoints (requires Bearer token):");
  console.log("    GET  /auth/me");
  console.log("    PUT  /auth/me");
  console.log("    POST /posts");
  console.log("    PUT  /posts/:id");
  console.log("    DEL  /posts/:id");
  console.log("    GET  /orders");
  console.log("    POST /orders");
  console.log("    GET  /comments");
  console.log("    POST /comments");
  console.log("    DEL  /comments/:id");
  console.log("\n  Admin only:");
  console.log("    GET  /admin/users");
  console.log("    PUT  /admin/users/:id/role");
  console.log("    DEL  /admin/users/:id");
  console.log();
});
