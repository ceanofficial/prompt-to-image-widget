class AIImageWidget extends HTMLElement {
  static get observedAttributes() {
    return ["api-endpoint", "title", "subtitle"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.apiEndpoint = this.getAttribute("api-endpoint") || "/api/generate-image";
    this.titleText = this.getAttribute("title") || "AI Image Generator";
    this.subtitleText =
      this.getAttribute("subtitle") || "Create, refine, and download images";

    this._currentBlob = null;
    this._currentObjectURL = null;
    this._currentFormat = "png";

    this.shadowShadowSafeRender();
  }

  attributeChangedCallback(name, _old, value) {
    if (!value) return;
    if (name === "api-endpoint") this.apiEndpoint = value;
    if (name === "title") this.titleText = value;
    if (name === "subtitle") this.subtitleText = value;
    this.shadowShadowSafeRender();
  }

  connectedCallback() {
    this.wireEvents();
  }

  disconnectedCallback() {
    this.cleanupObjectURL();
  }

  cleanupObjectURL() {
    if (this._currentObjectURL) {
      URL.revokeObjectURL(this._currentObjectURL);
      this._currentObjectURL = null;
    }
  }

  shadowShadowSafeRender() {
    const style = `
      :host{
        --bg: #0c0f14;
        --panel: #111621;
        --panel-2: #0f1420;
        --text: #f5f7fb;
        --muted: #a8b0c3;
        --accent: #6ee7ff;
        --accent-2: #a78bfa;
        --danger: #ff6b6b;
        --ok: #7af0a3;
        --radius: 14px;
        --shadow: 0 10px 30px rgba(0,0,0,.35);
        --border: 1px solid rgba(255,255,255,.06);
        display: block;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto,
                     "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans",
                     sans-serif;
      }

      .card{
        background: linear-gradient(135deg, rgba(110,231,255,.06), rgba(167,139,250,.06)),
                    var(--panel);
        border: var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        overflow: hidden;
      }

      .header{
        padding: 22px 22px 14px 22px;
        background:
          radial-gradient(800px 200px at 0% 0%, rgba(110,231,255,.12), transparent 60%),
          radial-gradient(800px 200px at 100% 0%, rgba(167,139,250,.12), transparent 60%),
          var(--panel-2);
        border-bottom: var(--border);
      }

      .title{
        color: var(--text);
        font-size: 20px;
        font-weight: 650;
        letter-spacing: .2px;
        display:flex;
        align-items:center;
        gap:10px;
      }

      .title-badge{
        font-size: 10px;
        padding: 3px 8px;
        border-radius: 999px;
        background: linear-gradient(90deg, rgba(110,231,255,.18), rgba(167,139,250,.18));
        border: 1px solid rgba(255,255,255,.08);
        color: var(--muted);
      }

      .subtitle{
        color: var(--muted);
        font-size: 12.5px;
        margin-top: 6px;
      }

      .body{
        padding: 18px 22px 22px 22px;
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 18px;
      }

      @media (max-width: 860px){
        .body{ grid-template-columns: 1fr; }
      }

      .controls{
        display:flex;
        flex-direction:column;
        gap: 14px;
      }

      label{
        color: var(--muted);
        font-size: 11.5px;
        letter-spacing: .2px;
        margin-bottom: 6px;
        display:block;
      }

      textarea{
        width: 100%;
        min-height: 150px;
        resize: vertical;
        padding: 12px 12px 14px 12px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.03);
        color: var(--text);
        font-size: 13.5px;
        line-height: 1.35;
        outline: none;
      }
      textarea:focus{
        border-color: rgba(110,231,255,.35);
        box-shadow: 0 0 0 3px rgba(110,231,255,.12);
      }

      .chips{
        display:flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chip{
        cursor:pointer;
        user-select:none;
        font-size: 10.5px;
        color: var(--muted);
        padding: 7px 9px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.02);
        transition: transform .08s ease, border-color .12s ease, color .12s ease;
      }
      .chip:hover{
        transform: translateY(-1px);
        color: var(--text);
        border-color: rgba(255,255,255,.18);
      }

      .grid{
        display:grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      @media (max-width: 520px){
        .grid{ grid-template-columns: 1fr; }
      }

      select, input[type="text"]{
        width: 100%;
        padding: 9px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.03);
        color: var(--text);
        font-size: 12.5px;
        outline:none;
      }
      select:focus, input[type="text"]:focus{
        border-color: rgba(167,139,250,.35);
        box-shadow: 0 0 0 3px rgba(167,139,250,.12);
      }

      .actions{
        display:flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 4px;
      }

      button{
        appearance:none;
        border: 1px solid rgba(255,255,255,.08);
        background:
          linear-gradient(135deg, rgba(110,231,255,.12), rgba(167,139,250,.12)),
          rgba(255,255,255,.02);
        color: var(--text);
        font-size: 12.5px;
        padding: 10px 12px;
        border-radius: 10px;
        cursor: pointer;
        transition: transform .08s ease, border-color .12s ease, opacity .12s ease;
      }
      button:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.18); }
      button:disabled{ opacity: .45; cursor: not-allowed; transform:none; }

      .btn-primary{
        background:
          linear-gradient(135deg, rgba(110,231,255,.18), rgba(167,139,250,.22)),
          rgba(255,255,255,.02);
        border-color: rgba(110,231,255,.25);
      }

      .btn-ghost{
        background: rgba(255,255,255,.02);
      }

      .status{
        min-height: 18px;
        font-size: 11.5px;
        color: var(--muted);
        display:flex;
        align-items:center;
        gap: 8px;
        margin-top: 4px;
      }
      .status.error{ color: var(--danger); }
      .status.ok{ color: var(--ok); }

      .spinner{
        width: 12px; height: 12px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,.18);
        border-top-color: rgba(110,231,255,.9);
        animation: spin .8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      .preview{
        border: var(--border);
        border-radius: 12px;
        background:
          linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0)),
          rgba(255,255,255,.02);
        padding: 14px;
        display:flex;
        flex-direction:column;
        gap: 12px;
        min-height: 320px;
      }

      .preview-head{
        display:flex;
        align-items:center;
        justify-content: space-between;
        gap: 10px;
      }
      .preview-title{
        font-size: 12px;
        color: var(--muted);
      }
      .preview-meta{
        font-size: 10px;
        color: var(--muted);
        opacity: .9;
      }

      .img-wrap{
        flex: 1;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius: 10px;
        border: 1px dashed rgba(255,255,255,.08);
        background: rgba(255,255,255,.02);
        overflow: hidden;
      }

      img{
        max-width: 100%;
        height: auto;
        display: none;
      }

      .placeholder{
        text-align:center;
        color: var(--muted);
        font-size: 11.5px;
        padding: 30px 14px;
      }

      .download{
        display:grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
      }
      @media (max-width: 520px){
        .download{ grid-template-columns: 1fr; }
      }

      .footnote{
        margin-top: 10px;
        font-size: 10px;
        color: var(--muted);
        opacity: .85;
      }
    `;

    const html = `
      <div class="card">
        <div class="header">
          <div class="title">
            <span>${this.escapeHTML(this.titleText)}</span>
            <span class="title-badge">gpt-image-1</span>
          </div>
          <div class="subtitle">${this.escapeHTML(this.subtitleText)}</div>
        </div>

        <div class="body">
          <div class="controls">
            <div>
              <label for="prompt">Prompt</label>
              <textarea id="prompt" placeholder="Describe what you want to see..."></textarea>
            </div>

            <div class="chips">
              <span class="chip" data-chip="A minimalist product photo on a soft gradient background">Minimal product</span>
              <span class="chip" data-chip="A cinematic landscape at golden hour, ultra detailed">Cinematic landscape</span>
              <span class="chip" data-chip="A cute mascot character, flat vector style">Mascot vector</span>
              <span class="chip" data-chip="A futuristic city street in the rain, neon reflections">Neon rain</span>
            </div>

            <div class="grid">
              <div>
                <label for="size">Size</label>
                <select id="size">
                  <option value="1024x1024">Square (1024×1024)</option>
                  <option value="1536x1024">Landscape (1536×1024)</option>
                  <option value="1024x1536">Portrait (1024×1536)</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
              <div>
                <label for="quality">Quality</label>
                <select id="quality">
                  <option value="auto">Auto</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label for="background">Background</label>
                <select id="background">
                  <option value="auto">Auto</option>
                  <option value="opaque">Opaque</option>
                  <option value="transparent">Transparent</option>
                </select>
              </div>
              <div>
                <label for="format">Output format</label>
                <select id="format">
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
            </div>

            <div class="actions">
              <button class="btn-primary" id="generate">Generate</button>
              <button class="btn-ghost" id="regenerate" disabled>Regenerate</button>
              <button class="btn-ghost" id="clear">Clear</button>
            </div>

            <div class="status" id="status" aria-live="polite"></div>

            <div class="download">
              <div>
                <label for="filename">File name</label>
                <input id="filename" type="text" value="generated-image" />
              </div>
              <div style="align-self:end">
                <button id="downloadBtn" disabled>Download</button>
              </div>
            </div>

            <div class="footnote">
              Tip: keep prompts specific (subject, style, lighting, composition).
            </div>
          </div>

          <div class="preview">
            <div class="preview-head">
              <div class="preview-title">Preview</div>
              <div class="preview-meta" id="meta"></div>
            </div>
            <div class="img-wrap">
              <img id="img" alt="Generated preview"/>
              <div class="placeholder" id="placeholder">
                Your image will appear here.<br/>
                Choose settings and click <strong>Generate</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      ${html}
    `;
  }

  wireEvents() {
    const $ = (id) => this.shadowRoot.getElementById(id);

    const promptEl = $("prompt");
    const sizeEl = $("size");
    const qualityEl = $("quality");
    const backgroundEl = $("background");
    const formatEl = $("format");

    const generateBtn = $("generate");
    const regenerateBtn = $("regenerate");
    const clearBtn = $("clear");
    const downloadBtn = $("downloadBtn");

    const filenameEl = $("filename");

    const imgEl = $("img");
    const placeholderEl = $("placeholder");
    const statusEl = $("status");
    const metaEl = $("meta");

    // Avoid double-binding if re-rendered
    if (this._wired) return;
    this._wired = true;

    // Prompt chips
    this.shadowRoot.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const text = chip.getAttribute("data-chip") || "";
        promptEl.value = text;
        promptEl.focus();
      });
    });

    // Basic compatibility rule: transparent background can't be jpeg
    const enforceBackgroundFormatRule = () => {
      const bg = backgroundEl.value;
      if (bg === "transparent" && formatEl.value === "jpeg") {
        formatEl.value = "png";
        this.setStatus("Switched format to PNG for transparent background.", "ok");
      }
    };

    backgroundEl.addEventListener("change", enforceBackgroundFormatRule);
    formatEl.addEventListener("change", enforceBackgroundFormatRule);

    const setBusy = (busy) => {
      generateBtn.disabled = busy;
      regenerateBtn.disabled = busy || !promptEl.value.trim();
      clearBtn.disabled = busy;
      downloadBtn.disabled = busy || !this._currentBlob;
      promptEl.disabled = busy;
      sizeEl.disabled = busy;
      qualityEl.disabled = busy;
      backgroundEl.disabled = busy;
      formatEl.disabled = busy;
      filenameEl.disabled = busy;
    };

    generateBtn.addEventListener("click", async () => {
      await this.generate({
        promptEl,
        sizeEl,
        qualityEl,
        backgroundEl,
        formatEl,
        imgEl,
        placeholderEl,
        statusEl,
        metaEl,
        regenerateBtn,
        downloadBtn,
        setBusy
      });
    });

    regenerateBtn.addEventListener("click", async () => {
      await this.generate({
        promptEl,
        sizeEl,
        qualityEl,
        backgroundEl,
        formatEl,
        imgEl,
        placeholderEl,
        statusEl,
        metaEl,
        regenerateBtn,
        downloadBtn,
        setBusy
      });
    });

    clearBtn.addEventListener("click", () => {
      promptEl.value = "";
      metaEl.textContent = "";
      this.cleanupObjectURL();
      this._currentBlob = null;
      this._currentFormat = "png";
      imgEl.style.display = "none";
      imgEl.removeAttribute("src");
      placeholderEl.style.display = "block";
      this.setStatus("", "");
      regenerateBtn.disabled = true;
      downloadBtn.disabled = true;
    });

    promptEl.addEventListener("input", () => {
      regenerateBtn.disabled = !promptEl.value.trim();
    });

    downloadBtn.addEventListener("click", () => {
      if (!this._currentBlob) return;

      const baseName = (filenameEl.value || "generated-image").trim() || "generated-image";
      const ext = this._currentFormat === "jpeg" ? "jpg" : this._currentFormat;

      const a = document.createElement("a");
      const url = this._currentObjectURL || URL.createObjectURL(this._currentBlob);
      a.href = url;
      a.download = `${baseName}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // If we had to create a new url for download, revoke it
      if (url !== this._currentObjectURL) {
        URL.revokeObjectURL(url);
      }
    });
  }

  async generate(ctx) {
    const {
      promptEl,
      sizeEl,
      qualityEl,
      backgroundEl,
      formatEl,
      imgEl,
      placeholderEl,
      statusEl,
      metaEl,
      regenerateBtn,
      downloadBtn,
      setBusy
    } = ctx;

    const prompt = promptEl.value.trim();
    if (!prompt) {
      this.setStatus("Please enter a prompt.", "error", statusEl);
      return;
    }

    // Enforce local rule before request
    if (backgroundEl.value === "transparent" && formatEl.value === "jpeg") {
      formatEl.value = "png";
    }

    setBusy(true);
    this.setStatus("Generating image…", "loading", statusEl);

    try {
      const payload = {
        prompt,
        size: sizeEl.value,
        quality: qualityEl.value,
        background: backgroundEl.value,
        output_format: formatEl.value
      };

      const res = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const b64 = data?.b64;
      const fmt = data?.output_format || payload.output_format;

      if (!b64) throw new Error("No image returned.");

      // Convert base64 to Blob
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const mime = fmt === "jpeg" ? "image/jpeg" : `image/${fmt}`;
      const blob = new Blob([bytes], { type: mime });

      this.cleanupObjectURL();
      const objectURL = URL.createObjectURL(blob);

      this._currentBlob = blob;
      this._currentObjectURL = objectURL;
      this._currentFormat = fmt;

      imgEl.src = objectURL;
      imgEl.style.display = "block";
      placeholderEl.style.display = "none";

      metaEl.textContent = `${data.size || payload.size} • ${fmt.toUpperCase()} • ${data.quality || payload.quality}`;

      this.setStatus("Done.", "ok", statusEl);

      regenerateBtn.disabled = false;
      downloadBtn.disabled = false;
    } catch (err) {
      this.setStatus(err?.message || "Generation failed.", "error", statusEl);
    } finally {
      setBusy(false);
    }
  }

  setStatus(message, kind = "", statusElOverride = null) {
    const statusEl = statusElOverride || this.shadowRoot.getElementById("status");
    if (!statusEl) return;

    statusEl.className = "status";

    if (!message) {
      statusEl.textContent = "";
      return;
    }

    if (kind === "loading") {
      statusEl.innerHTML = `<span class="spinner"></span><span>${this.escapeHTML(message)}</span>`;
      return;
    }

    if (kind === "error") statusEl.classList.add("error");
    if (kind === "ok") statusEl.classList.add("ok");

    statusEl.textContent = message;
  }

  escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

customElements.define("ai-image-widget", AIImageWidget);
