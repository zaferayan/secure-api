# Secure API

REST API with JWT authentication, protected routes, and role-based access control.

Built with Express, bcrypt, and JSON Web Tokens. No database needed - just a single `db.json` file.

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

API runs at `http://localhost:3000`.

## Authentication

Register or login to get a JWT token. Include it in the `Authorization` header for protected routes:

```
Authorization: Bearer <token>
```

Tokens expire after 7 days.

## Endpoints

### Public (no token required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create a new account |
| POST | `/auth/login` | Login and get a token |
| GET | `/products` | List all products |
| GET | `/products/:id` | Get a single product |
| GET | `/posts` | List all posts |
| GET | `/posts/:id` | Get a single post |

### Protected (token required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/me` | Get current user profile |
| PUT | `/auth/me` | Update current user profile |
| POST | `/posts` | Create a new post |
| PUT | `/posts/:id` | Update own post |
| DELETE | `/posts/:id` | Delete own post |
| GET | `/orders` | List current user's orders |
| POST | `/orders` | Create a new order |
| GET | `/orders/:id` | Get a specific order |
| GET | `/comments` | List comments |
| POST | `/comments` | Add a comment to a post |
| DELETE | `/comments/:id` | Delete own comment |

### Admin Only (admin role required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List all users |
| DELETE | `/admin/users/:id` | Delete a user |

## Examples

### Register

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john","email":"john@test.com","password":"123456"}'
```

### Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"123456"}'
```

### Access a protected route

```bash
curl http://localhost:3000/orders \
  -H "Authorization: Bearer <token>"
```

### Create a post (protected)

```bash
curl -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"title":"My Post","body":"Hello world!"}'
```

### Access without token

```bash
curl http://localhost:3000/orders
# => {"error":"Access denied. No token provided."}
```

## Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Bad request (missing fields) |
| 401 | Unauthorized (no token or invalid token) |
| 403 | Forbidden (not owner or not admin) |
| 404 | Not found |
| 409 | Conflict (duplicate email/username) |

## Register as Admin

Pass `"role": "admin"` in the register body:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@test.com","password":"admin123","role":"admin"}'
```
