# prompt-to-image-widget
AI Image Widget is a framework-agnostic Web Component for prompt-to-image generation. It includes a secure Node/Express backend that proxies requests to the OpenAI Images API, keeping keys off the client. Users can refine prompts, choose size/quality/background/format, preview results, and download in PNG/JPEG/WebP.


# AI Image Widget

A professionally styled, framework-agnostic **prompt-to-image Web Component** with a secure **Node/Express** proxy for the OpenAI Images API.

Users can:
- enter and refine prompts
- pick size, quality, background, and output format
- preview the result
- download as **PNG / JPEG / WebP**

> This repo keeps your OpenAI API key on the server—never in the browser.

---

## Demo

Run locally and open:

- `http://localhost:3000`

You’ll see a clean, production-ready widget you can embed into any site.

---

## Tech stack

- Frontend: Native Web Component (no framework required)
- Backend: Node.js + Express
- OpenAI: Images generation via `gpt-image-1`

---

## Project layout

```txt
public/
  index.html            # Demo page
  ai-image-widget.js    # Web Component
server/
  server.js             # Secure API proxy
  package.json
  .env.example
