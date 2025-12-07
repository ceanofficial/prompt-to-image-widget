import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY. Create server/.env from .env.example");
  process.exit(1);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---- Middleware
app.use(express.json({ limit: "1mb" }));

// ---- Static site
app.use(express.static(join(__dirname, "..", "public")));

// ---- Helpers
const ALLOWED_SIZES = new Set([
  "auto",
  "1024x1024",
  "1536x1024",
  "1024x1536"
]);

const ALLOWED_FORMATS = new Set(["png", "jpeg", "webp"]);
const ALLOWED_QUALITY = new Set(["auto", "high", "medium", "low"]);
const ALLOWED_BACKGROUND = new Set(["auto", "transparent", "opaque"]);

function safeString(v, max = 32000) {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s.length > max ? s.slice(0, max) : s;
}

// ---- API endpoint for the widget
app.post("/api/generate-image", async (req, res) => {
  try {
    const prompt = safeString(req.body?.prompt);
    const size = safeString(req.body?.size, 32) || "1024x1024";
    const output_format = safeString(req.body?.output_format, 8) || "png";
    const quality = safeString(req.body?.quality, 16) || "auto";
    const background = safeString(req.body?.background, 16) || "auto";

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    if (!ALLOWED_SIZES.has(size)) {
      return res.status(400).json({ error: "Invalid size." });
    }
    if (!ALLOWED_FORMATS.has(output_format)) {
      return res.status(400).json({ error: "Invalid output_format." });
    }
    if (!ALLOWED_QUALITY.has(quality)) {
      return res.status(400).json({ error: "Invalid quality." });
    }
    if (!ALLOWED_BACKGROUND.has(background)) {
      return res.status(400).json({ error: "Invalid background." });
    }

    // If user requests transparent background, ensure format supports it.
    if (background === "transparent" && output_format === "jpeg") {
      return res.status(400).json({
        error: "Transparent background requires png or webp."
      });
    }

    // gpt-image-1 supports output_format, output_compression, background, quality, size. :contentReference[oaicite:2]{index=2}
    const img = await client.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size,
      quality,
      background,
      output_format
    });

    const b64 = img?.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(502).json({ error: "No image data returned." });
    }

    // gpt-image-1 returns base64 images. :contentReference[oaicite:3]{index=3}
    return res.json({
      b64,
      output_format,
      size,
      quality,
      background
    });
  } catch (err) {
    const msg =
      err?.message ||
      "Image generation failed. Check server logs for details.";
    console.error(err);
    return res.status(500).json({ error: msg });
  }
});

app.listen(port, () => {
  console.log(`AI image widget running on http://localhost:${port}`);
});
