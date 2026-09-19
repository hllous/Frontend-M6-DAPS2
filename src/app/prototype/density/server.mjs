import { createServer } from "node:http"
import { readFile } from "node:fs/promises"

const port = 3003
const htmlPath = new URL("./index.html", import.meta.url)

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", `http://${request.headers.host}`).pathname

  if (pathname === "/" || pathname === "/index.html") {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" })
    response.end(await readFile(htmlPath))
    return
  }

  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
  response.end("No encontrado")
})

server.listen(port, "127.0.0.1", () => {
  console.log(`Prototipo de escala y densidad: http://localhost:${port}/?density=B`)
})

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)))
}
