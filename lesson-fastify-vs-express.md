# Lesson — Fastify vs Express

*Goal: Understand why Fastify was chosen over Express in the Laufbahn job tracker, and what its core concepts mean in practice.*

---

## 1. Schema-driven validation

In Express, you validate request bodies manually — usually with a middleware or inline checks. If you forget, bad data reaches your handler.

```ts
// Express — manual, easy to forget
app.post('/login', (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({ error: 'missing fields' });
  }
});
```

In Fastify, you attach a Zod schema directly to the route. Fastify validates the request **before your handler runs** — if the body is invalid, it never reaches you.

```ts
// Fastify — declarative, always enforced
router.post('/login', {
  schema: { body: loginSchema }
}, async (request, reply) => {
  // if we're here, request.body is already valid and typed
  const { email, password } = request.body;
});
```

---

## 2. Response serialization (stripping extra fields)

Express sends back whatever you pass to `res.json()` — including fields you didn't intend to expose.

```ts
// Express — accidentally leaks passwordHash
app.get('/me', async (req, res) => {
  const user = await db.findUser(id);
  res.json(user); // { id, email, passwordHash, ... } — all of it goes out
});
```

Fastify lets you declare a response schema. Anything **not** in that schema is silently stripped before the response is sent.

```ts
// Fastify — passwordHash never reaches the client
router.get('/me', {
  schema: {
    response: { 200: userPublicSchema } // only id, email, name, createdAt
  }
}, async (request, reply) => {
  const user = await db.findUser(id);
  return user; // passwordHash is dropped automatically
});
```

This is a security feature as much as a convenience one.

---

## 3. TypeScript types flow from the schema

This is the payoff of the two points above. You define the schema once, and it does three jobs: validates at runtime, types the handler at compile time, documents the shape for serialization.

```ts
// Express — manual cast, no real safety
app.post('/login', (req, res) => {
  const email = (req.body as LoginInput).email; // you're just hoping
});

// Fastify — type is inferred from loginSchema automatically
router.post('/login', {
  schema: { body: loginSchema }
}, async (request, reply) => {
  request.body.email    // ✅ TypeScript knows this is a string
  request.body.missing  // ❌ TypeScript error at compile time
});
```

In this project, schemas live in `*.schemas.ts` per module (e.g. `auth.schemas.ts`) and are shared between validation, serialization, and TypeScript types — zero duplication.

---

## 4. Plugin encapsulation

Express uses a flat `Router`. Middleware you add to it can affect things in unexpected ways across the app.

```ts
// Express — shared, flat scope
const router = express.Router();
router.use(someMiddleware); // applies to everything registered after this
app.use('/auth', router);
```

Fastify uses **plugins** — each plugin gets its own isolated scope. Hooks, decorators, and middleware registered inside a plugin don't leak out to other plugins.

```ts
// Fastify — each module is a self-contained plugin
export const authRoutes: FastifyPluginAsyncZod = async (router) => {
  // everything here is scoped — nothing bleeds into other modules
  router.post('/login', ...);
  router.post('/refresh', ...);
};

// Registered in app.ts
app.register(authRoutes, { prefix: '/auth' });
app.register(applicationRoutes, { prefix: '/applications' });
```

Think of each plugin as a self-contained module. The architecture in this project maps cleanly: one plugin per feature module (`auth`, `applications`, `interviews`, etc.).

---

## 5. Performance

Fastify uses compiled JSON schemas under the hood (via `fast-json-stringify`) rather than `JSON.stringify`. Benchmarks show it handling ~2–3× more requests per second than Express at scale. For a portfolio project this is a secondary benefit, but it demonstrates awareness of the Node.js ecosystem beyond the default choice.

---

## Summary

| | Express | Fastify |
|---|---|---|
| Validation | Manual middleware | Schema attached to route, runs before handler |
| Response safety | Whatever you send | Schema strips undeclared fields |
| TypeScript types | Manual casts | Inferred from Zod schema automatically |
| Module isolation | Shared Router scope | Scoped plugins — nothing bleeds out |
| Performance | Baseline | ~2–3× faster (compiled schemas) |

---

## Key takeaways

1. **Define the schema once, get validation + types + serialization for free.** In Express you need separate tools for each; in Fastify they're unified via `fastify-type-provider-zod`.
2. **Response schemas are a security control.** Declaring what goes out means sensitive fields (like `passwordHash`) can never accidentally leak, even if your service returns the full DB row.
3. **Plugins give you real module isolation.** Each feature module in this project is a `FastifyPluginAsyncZod` — its internals are invisible to other modules.
4. **The tradeoff:** Fastify has a steeper learning curve than Express. The schema-first mental model feels unfamiliar at first. Express is simpler for small scripts; Fastify pays off in structured, typed APIs.
