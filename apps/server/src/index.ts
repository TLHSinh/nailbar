import httpServer from "./app.ts";

const port = Number(process.env.PORT ?? 3001);
httpServer.listen(port, "127.0.0.1", () => console.log(`Nail Online server: http://localhost:${port}`));
