import http from "http";
import { readFile, writeFile } from "fs/promises";
import path from "path"
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3007;

const serveFile = async (res, filePath, contentType) => {
    try {
        const data = await readFile(filePath, "utf-8");
        res.writeHead(200, { "Content-Type": contentType })
        res.end(data);
    } catch (err) {
        res.writeHead(400, { "Content-Type": "text/plain" })
        res.end("Internal Server Error");
    }
}

const loadLinks = async (DATA_FILE) => {
    try {
        const data = await readFile(DATA_FILE);
        if (data.length > 0) {
            return JSON.parse(data);
        } else {
            return {}
        }
    } catch (err) {
        if (err.code === "ENOENT") {
            await writeFile(DATA_FILE, JSON.stringify({}));
            return {};
        }
    }
}

const saveToFile = async (DATA_FILE, links) => {
    await writeFile(DATA_FILE, JSON.stringify(links))
}

const server = http.createServer(async (req, res) => {
    const DATA_FILE = path.join(__dirname, "..", "data", "links.json")

    if (req.method === "GET") {
        if (req.url === "/") {
            const filePath = path.join(__dirname, "..", "public", "index.html")
            serveFile(res, filePath, "text/html")
        } else if (req.url === "/links") {
            const links = await loadLinks(DATA_FILE);
            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(JSON.stringify(links));
        } else {
            const links = await loadLinks(DATA_FILE);
            const shortCode = req.url.slice(1);
            if (links[shortCode]) {
                res.writeHead(302, { location: links[shortCode] });
                return res.end()
            }
            res.writeHead(404, { "Content-Type": "text/plain" });
            return res.end("Shortened URL not found!!")
        }
    }

    if (req.method === "POST" && req.url === "/shorten") {
        let body = ''

        req.on('data', (chunk) => {
            body += chunk;
        })
        req.on('end', async () => {

            const { url, shortCode } = JSON.parse(body);
            const links = await loadLinks(DATA_FILE);

            if (!url) {
                res.writeHead(400, { "Content-Type": "text/plain" });
                return res.end("URL is required!!");
            }

            if (links[shortCode]) {
                res.writeHead(400, { "Content-Type": "text/plain" });
                return res.end("ShortCode already exists please select another!!");
            }

            links[shortCode] = url;

            await saveToFile(DATA_FILE, links);

            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ "success": true }));
        })
    }
})

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at port http://localhost:${PORT}`);
})