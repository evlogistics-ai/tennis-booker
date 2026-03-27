import { Hono } from "hono";
import { handle } from "hono/vercel";

const app = new Hono().basePath("/api");

app.get("/test", (c) => c.json({ works: true }));

export default handle(app);
