import { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "manuals-ai_products";

// ─── ICONS ────────────────────────────────────────────────────────────────────
const IconMenu = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>);
const IconX = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>);
const IconSearch = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8"/><path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>);
const IconChevronRight = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconChevronLeft = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconTrash = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconBook = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="1.8"/></svg>);
const IconLink = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>);
const IconCamera = () => (<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.8"/></svg>);


const SECTION_META = {
  "Setup":           { icon: "🔧", color: "#f97316" },
  "Daily Use":       { icon: "⚡", color: "#3b82f6" },
  "Tips & Tricks":   { icon: "💡", color: "#eab308" },
  "Troubleshooting": { icon: "🛠️", color: "#a855f7" },
  "Maintenance":     { icon: "🔄", color: "#22c55e" },
};

// ─── AFFILIATE ────────────────────────────────────────────────────────────────
const AFFILIATE_TAG = "YOUR-TAG-20"; // ← replace with your Amazon Associates tag
function getAmazonUrl(productName) {
  const query = encodeURIComponent(productName);
  return `https://www.amazon.com/s?k=${query}&tag=${AFFILIATE_TAG}`;
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function fetchUrlContent(url) {
  try {
    const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (!data.contents) return null;
    return data.contents
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ").trim().slice(0, 3000);
  } catch { return null; }
}

async function fetchProductGuide(input) {
  const isUrl = input.startsWith("http://") || input.startsWith("https://");
  let pageContext = "", fetchStatus = "";
  if (isUrl) {
    const content = await fetchUrlContent(input);
    if (content) { pageContext = `\n\nScraped page content:\n"""\n${content}\n"""`; fetchStatus = "fetched"; }
    else fetchStatus = "failed";
  }

  const prompt = `You are a helpful product guide assistant. Input: "${input}"
${pageContext}

${isUrl && fetchStatus === "fetched" ? "Use the scraped content to identify the exact product." : isUrl ? "Page fetch failed. Infer product from URL path." : "Use your knowledge of this product."}

Return ONLY valid JSON (no markdown, no preamble):
{
  "productName": "exact product name and model",
  "productEmoji": "single emoji",
  "tagline": "one-line description",
  "sections": [
    { "title": "Setup", "steps": ["step1","step2","step3","step4"] },
    { "title": "Daily Use", "steps": ["..."] },
    { "title": "Tips & Tricks", "steps": ["..."] },
    { "title": "Troubleshooting", "steps": ["..."] },
    { "title": "Maintenance", "steps": ["..."] }
  ]
}`;

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error("API error: " + data.error.message);
  const text = data.content?.[0]?.text || "";
  if (!text) throw new Error("Empty response from Claude");
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response: " + text.slice(0, 200));
  return JSON.parse(jsonMatch[0]);
}

async function identifyProductFromImage(base64Image, mediaType) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Image } },
          { type: "text", text: "What product is shown in this image? Reply with ONLY the exact product name and model number (e.g. 'Sony WH-1000XM5 Wireless Headphones'). If you cannot identify a specific product, reply with your best guess based on what you see. Be concise." }
        ]
      }],
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error("API error: " + data.error.message);
  return data.content?.[0]?.text?.trim() || "";
}

// ─── DRAWER ───────────────────────────────────────────────────────────────────
function Drawer({ open, onClose, products, onSelectProduct, onDeleteProduct }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(101,76,45,0.35)", backdropFilter: "blur(6px)", opacity: open ? 1 : 0, pointerEvents: open ? "all" : "none", transition: "opacity 0.3s ease" }} />
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "290px", zIndex: 50, background: "linear-gradient(180deg, #F5F0E8 0%, #F5F0E8 100%)", borderRight: "1px solid #D4CBB8", transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)", display: "flex", flexDirection: "column", boxShadow: open ? "12px 0 48px rgba(101,76,45,0.18)" : "none" }}>
        <div style={{ padding: "28px 20px 18px", borderBottom: "1px solid #D4CBB8" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#F5F0E8", border: "1px solid #D4CBB8", display: "flex", alignItems: "center", justifyContent: "center", color: "#8B4513" }}><IconBook /></div>
              <span style={{ fontFamily: "'Georgia', serif", fontSize: "16px", fontWeight: "700", color: "#2C2416", letterSpacing: "-0.2px" }}>My Products</span>
            </div>
            <button onClick={onClose} style={{ background: "rgba(101,76,45,0.07)", border: "1px solid #D4CBB8", borderRadius: "8px", color: "#9C8B74", cursor: "pointer", padding: "6px", display: "flex", transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.color="#6B5B45"} onMouseLeave={e => e.currentTarget.style.color="#9C8B74"}>
              <IconX />
            </button>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "#9C8B74", fontFamily: "system-ui, sans-serif" }}>{products.length} saved {products.length === 1 ? "product" : "products"}</p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          {products.length === 0 ? (
            <div style={{ textAlign: "center", padding: "52px 16px" }}>
              <div style={{ fontSize: "40px", marginBottom: "14px", opacity: 0.4 }}>📦</div>
              <p style={{ color: "#9C8B74", fontSize: "13px", fontFamily: "system-ui, sans-serif", margin: 0, lineHeight: 1.6 }}>No products yet.<br />Search for one to get started.</p>
            </div>
          ) : products.map(p => (
            <div key={p.id}
              onClick={() => { onSelectProduct(p); onClose(); }}
              style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "11px", cursor: "pointer", marginBottom: "2px", transition: "background 0.15s", border: "1px solid transparent" }}
              onMouseEnter={e => { e.currentTarget.style.background = "#F5F0E8"; e.currentTarget.style.borderColor = "#C4B49A"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}
            >
              <span style={{ fontSize: "22px", flexShrink: 0 }}>{p.productEmoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: "600", color: "#2C2416", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "system-ui, sans-serif" }}>{p.productName}</p>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#9C8B74", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: "system-ui, sans-serif" }}>{p.tagline}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); onDeleteProduct(p.id); }}
                style={{ background: "none", border: "none", color: "#C4B49A", cursor: "pointer", padding: "4px", display: "flex", borderRadius: "6px", flexShrink: 0, transition: "color 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.color = "#DC2626"}
                onMouseLeave={e => e.currentTarget.style.color = "#C4B49A"}
              ><IconTrash /></button>
            </div>
          ))}
        </div>

        <div style={{ padding: "16px 20px", borderTop: "1px solid #D4CBB8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#9C8B74" }}>
            <IconBook />
            <span style={{ fontFamily: "'Georgia', serif", fontSize: "13px", color: "#9C8B74" }}>Manuals<span style={{ color: "#8B4513" }}>.ai</span></span>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
function HomeScreen({ onSearch, onOpenDrawer, error, onDismissError }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef(null);
  const cameraRef = useRef(null);
  const isUrl = query.startsWith("http://") || query.startsWith("https://");
  const submit = () => query.trim() && onSearch(query.trim());

  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setCameraLoading(true);
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      const mediaType = file.type || "image/jpeg";
      const productName = await identifyProductFromImage(base64, mediaType);
      if (productName) {
        setQuery(productName);
        setPreviewUrl(null);
        onSearch(productName);
      }
    } catch (err) {
      console.error("Camera identify error:", err);
    } finally {
      setCameraLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F5F0E8", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      {/* Background glows */}
      <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", width: "700px", height: "700px", background: "radial-gradient(circle, rgba(101,76,45,0.07) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "40%", left: "20%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(101,76,45,0.05) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "25%", right: "15%", width: "300px", height: "300px", background: "radial-gradient(circle, rgba(101,76,45,0.04) 0%, transparent 65%)", pointerEvents: "none" }} />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 28px", position: "relative", zIndex: 10 }}>
        <button onClick={onOpenDrawer}
          style={{ background: "rgba(101,76,45,0.07)", border: "1px solid #D4CBB8", borderRadius: "10px", color: "#6B5B45", cursor: "pointer", padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontFamily: "system-ui, sans-serif", transition: "all 0.2s" }}
          onMouseEnter={e => { e.currentTarget.style.background="rgba(101,76,45,0.07)"; e.currentTarget.style.color="#2C2416"; }}
          onMouseLeave={e => { e.currentTarget.style.background="rgba(101,76,45,0.07)"; e.currentTarget.style.color="#6B5B45"; }}
        >
          <IconMenu />
          <span>My Products</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#9C8B74" }}>
          <span style={{ fontSize: "12px", fontFamily: "system-ui, sans-serif", letterSpacing: "0.3px" }}>Powered by Claude AI</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px 100px", position: "relative", zIndex: 10 }}>
        <h1 style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(52px, 9vw, 96px)", fontWeight: "700", color: "#2C2416", margin: "0 0 32px", textAlign: "center", lineHeight: 1.05, letterSpacing: "-2.5px" }}>
          Manuals<span style={{ color: "#8B4513" }}>.ai</span>
        </h1>


        <p style={{ fontFamily: "system-ui, sans-serif", fontSize: "15px", color: "#6B5B45", margin: "-24px 0 36px", textAlign: "center", maxWidth: "420px", lineHeight: 1.65 }}>
          Type a product name or paste a shop URL — get a clear, categorized guide in seconds.
        </p>

        {/* Search */}
        <div style={{ width: "100%", maxWidth: "580px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Input row */}
          <div style={{ width: "100%", background: "#EDE8DC", border: `1.5px solid ${focused ? "#8B4513" : "#D4CBB8"}`, borderRadius: "18px", padding: "6px 12px 6px 20px", display: "flex", alignItems: "center", gap: "10px", boxShadow: focused ? "0 0 0 4px rgba(101,76,45,0.07), 0 4px 20px rgba(101,76,45,0.07)" : "0 2px 12px rgba(101,76,45,0.08)", transition: "all 0.25s ease" }}>
            <span style={{ color: focused ? "#8B4513" : "#9C8B74", flexShrink: 0, display: "flex", transition: "color 0.2s" }}>
              {isUrl ? <IconLink /> : <IconSearch />}
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Product name or URL..."
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "15px", color: "#2C2416", fontFamily: "system-ui, sans-serif", padding: "11px 0", minWidth: 0 }}
            />
            {/* Camera button inline */}
            <button
              onClick={() => cameraRef.current?.click()}
              disabled={cameraLoading}
              title="Take a photo to identify product"
              style={{ padding: "8px", background: "transparent", color: cameraLoading ? "#8B4513" : "#9C8B74", border: "none", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background="#F5F0E8"; e.currentTarget.style.color="#8B4513"; }}
              onMouseLeave={e => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=cameraLoading?"#8B4513":"#9C8B74"; }}
            >
              {cameraLoading ? (
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10"/>
                </svg>
              ) : <IconCamera />}
            </button>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} style={{ display: "none" }} />
          </div>
          {/* Get Guide button — full width below on all screens */}
          <button onClick={submit} disabled={!query.trim()}
            style={{ width: "100%", padding: "14px", background: query.trim() ? "#8B4513" : "rgba(101,76,45,0.06)", color: query.trim() ? "#EDE8DC" : "#C4B49A", border: "none", borderRadius: "14px", cursor: query.trim() ? "pointer" : "default", fontSize: "15px", fontWeight: "600", fontFamily: "system-ui, sans-serif", transition: "all 0.2s", boxShadow: query.trim() ? "0 4px 16px rgba(101,76,45,0.15)" : "none" }}
          >
            Get Guide →
          </button>
        </div>

        {/* Camera preview */}
        {previewUrl && (
          <div style={{ width: "100%", maxWidth: "580px", marginTop: "12px", borderRadius: "14px", overflow: "hidden", border: "1px solid #C4B49A", position: "relative" }}>
            <img src={previewUrl} alt="Captured product" style={{ width: "100%", maxHeight: "220px", objectFit: "cover", filter: "brightness(0.7)" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "8px" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite", color: "#8B4513" }}>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="28" strokeDashoffset="10"/>
              </svg>
              <p style={{ margin: 0, fontSize: "13px", color: "#EDE8DC", fontFamily: "system-ui, sans-serif", fontWeight: "600" }}>Identifying product…</p>
            </div>
          </div>
        )}

        {/* Quick hints */}
        <div style={{ display: "flex", gap: "8px", marginTop: "18px", flexWrap: "wrap", justifyContent: "center" }}>
          {["Instant Pot Duo 7-in-1", "Dyson V15 Detect", "IKEA KALLAX shelf"].map(hint => (
            <button key={hint} onClick={() => { setQuery(hint); setTimeout(() => inputRef.current?.focus(), 0); }}
              style={{ background: "rgba(101,76,45,0.06)", border: "1px solid #D4CBB8", borderRadius: "100px", padding: "5px 13px", color: "#9C8B74", fontSize: "12px", fontFamily: "system-ui, sans-serif", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background="#F5F0E8"; e.currentTarget.style.color="#6B5B45"; e.currentTarget.style.borderColor="#C4B49A"; }}
              onMouseLeave={e => { e.currentTarget.style.background="rgba(101,76,45,0.06)"; e.currentTarget.style.color="#9C8B74"; e.currentTarget.style.borderColor="#D4CBB8"; }}
            >
              {hint}
            </button>
          ))}
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div style={{ position: "fixed", bottom: "28px", left: "50%", transform: "translateX(-50%)", background: "#F5F0E8", border: "1px solid #D4CBB8", borderRadius: "14px", padding: "13px 18px", display: "flex", alignItems: "center", gap: "10px", zIndex: 100, maxWidth: "500px", width: "calc(100% - 48px)", boxShadow: "0 8px 40px rgba(101,76,45,0.35)" }}>
          <span>⚠️</span>
          <span style={{ flex: 1, fontSize: "13px", color: "#DC2626", fontFamily: "system-ui, sans-serif" }}>{error}</span>
          <button onClick={onDismissError} style={{ background: "none", border: "none", color: "#DC2626", cursor: "pointer", padding: "2px", display: "flex" }}><IconX /></button>
        </div>
      )}
    </div>
  );
}

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────
function LoadingScreen({ query }) {
  const [dots, setDots] = useState(".");
  const [phase, setPhase] = useState(0);
  const isUrl = query.startsWith("http://") || query.startsWith("https://");

  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!isUrl) return;
    const t = setTimeout(() => setPhase(1), 2800);
    return () => clearTimeout(t);
  }, [isUrl]);

  const phases = isUrl ? ["Fetching product page", "Generating your guide"] : ["Generating your guide"];

  return (
    <div style={{ minHeight: "100vh", background: "#F5F0E8", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ textAlign: "center", maxWidth: "380px" }}>
        <div style={{ fontSize: "56px", marginBottom: "28px", filter: "drop-shadow(0 0 20px rgba(139,69,19,0.2))" }}>
          {isUrl && phase === 0 ? "🌐" : "🤖"}
        </div>
        <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "24px", color: "#2C2416", margin: "0 0 10px", fontWeight: "700" }}>{phases[phase]}{dots}</h2>
        <p style={{ fontSize: "14px", color: "#6B5B45", fontFamily: "system-ui, sans-serif", margin: "0 0 28px", fontStyle: "italic" }}>
          "{query.length > 55 ? query.slice(0, 55) + "…" : query}"
        </p>
        {isUrl && (
          <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "24px" }}>
            {phases.map((_, i) => (
              <div key={i} style={{ height: "3px", width: "48px", borderRadius: "2px", background: i <= phase ? "#8B4513" : "#D4CBB8", transition: "background 0.5s ease" }} />
            ))}
          </div>
        )}
        <p style={{ fontSize: "13px", color: "#9C8B74", fontFamily: "system-ui, sans-serif", margin: 0, lineHeight: 1.7 }}>
          {isUrl && phase === 0 ? "Reading the product page for accurate details…" : "Claude is crafting your personalized step-by-step guide"}
        </p>
      </div>
    </div>
  );
}

// ─── GUIDE SCREEN ─────────────────────────────────────────────────────────────
function GuideScreen({ product, onSelectSection, onBack, onOpenDrawer }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F5F0E8", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px 28px", borderBottom: "1px solid #D4CBB8", position: "sticky", top: 0, background: "rgba(245,240,232,0.92)", backdropFilter: "blur(12px)", zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "rgba(101,76,45,0.07)", border: "1px solid #D4CBB8", borderRadius: "10px", color: "#6B5B45", cursor: "pointer", padding: "7px 13px", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontFamily: "system-ui, sans-serif", transition: "all 0.15s" }} onMouseEnter={e=>e.currentTarget.style.color="#2C2416"} onMouseLeave={e=>e.currentTarget.style.color="#6B5B45"}>
          <IconChevronLeft /> Back
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={onOpenDrawer} style={{ background: "rgba(101,76,45,0.07)", border: "1px solid #D4CBB8", borderRadius: "10px", color: "#6B5B45", cursor: "pointer", padding: "7px 10px", display: "flex", transition: "all 0.15s" }} onMouseEnter={e=>e.currentTarget.style.color="#2C2416"} onMouseLeave={e=>e.currentTarget.style.color="#6B5B45"}>
          <IconMenu />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "40px 28px 60px", maxWidth: "700px", margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{ fontSize: "68px", marginBottom: "18px", filter: "drop-shadow(0 0 16px rgba(139,69,19,0.15))" }}>{product.productEmoji}</div>
          <h1 style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(22px,4vw,32px)", fontWeight: "700", color: "#2C2416", margin: "0 0 10px", lineHeight: 1.2 }}>{product.productName}</h1>
          <p style={{ fontSize: "15px", color: "#6B5B45", fontFamily: "system-ui, sans-serif", margin: 0 }}>{product.tagline}</p>
          <a
            href={getAmazonUrl(product.productName)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "14px", padding: "9px 18px", background: "#FF9900", color: "#111", borderRadius: "10px", fontSize: "13px", fontWeight: "600", fontFamily: "system-ui, sans-serif", textDecoration: "none", transition: "opacity 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13.23 10.56V10c-1.94.02-3.99.39-3.99 2.67 0 1.16.61 1.95 1.63 1.95.76 0 1.43-.47 1.86-1.22.52-.93.5-1.8.5-2.84zm2.7 6.53c-.18.16-.43.17-.63.06-1.04-.86-1.23-1.26-1.8-2.08-1.73 1.76-2.95 2.29-5.19 2.29-2.65 0-4.71-1.63-4.71-4.9 0-2.55 1.38-4.29 3.36-5.14 1.71-.75 4.1-.88 5.93-1.09V5.78c0-.73.06-1.59-.37-2.22-.38-.56-1.1-.79-1.74-.79-1.18 0-2.23.61-2.49 1.87-.05.28-.27.55-.55.56l-3.08-.33c-.26-.06-.54-.27-.47-.67C4.7 1.96 7.3.5 10.13.5c1.44 0 3.32.38 4.46 1.47C15.9 3.15 15.77 5.03 15.77 7v4.9c0 1.47.61 2.12 1.18 2.91.2.28.24.61-.01.82l-1.01.46zM20.16 19.54C18 21.14 14.82 22 12.1 22c-3.81 0-7.25-1.41-9.85-3.76-.2-.18-.02-.43.25-.29 2.78 1.63 6.25 2.61 9.83 2.61 2.41 0 5.07-.5 7.51-1.53.37-.16.68.24.32.51zm.95-1.07c-.28-.36-1.85-.17-2.57-.08-.19.02-.22-.16-.03-.3 1.26-.89 3.32-.63 3.56-.33.24.3-.07 2.35-1.24 3.33-.18.15-.36.07-.28-.13.26-.67.85-2.14.56-2.49z"/></svg>
            Buy on Amazon
          </a>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", background: "#FFF8E7", border: "1px solid #F0D080", borderRadius: "13px", padding: "13px 16px", marginBottom: "32px" }}>
          <span>⚠️</span>
          <p style={{ margin: 0, fontSize: "12px", color: "#8B4513", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>AI-generated guide. Always verify critical steps with the official manufacturer documentation.</p>
        </div>

        <p style={{ margin: "0 0 14px", fontSize: "10px", fontWeight: "700", letterSpacing: "1.8px", color: "#9C8B74", fontFamily: "system-ui, sans-serif" }}>SECTIONS</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          {product.sections.map((section, i) => {
            const meta = SECTION_META[section.title] || { icon: "📖", color: "#6366f1" };
            return (
              <div key={i} onClick={() => onSelectSection(section)}
                style={{ background: "#EDE8DC", border: "1px solid #F5F0E8", borderRadius: "16px", padding: "20px 16px", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden" }}
                onMouseEnter={e => { e.currentTarget.style.background = `${meta.color}12`; e.currentTarget.style.borderColor = `${meta.color}40`; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 20px ${meta.color}18`; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#EDE8DC"; e.currentTarget.style.borderColor = "#F5F0E8"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${meta.color}, transparent)`, opacity: 0.6 }} />
                <div style={{ fontSize: "26px", marginBottom: "12px" }}>{meta.icon}</div>
                <p style={{ margin: "0 0 3px", fontSize: "14px", fontWeight: "700", color: "#2C2416", fontFamily: "system-ui, sans-serif" }}>{section.title}</p>
                <p style={{ margin: 0, fontSize: "12px", color: "#9C8B74", fontFamily: "system-ui, sans-serif" }}>{section.steps.length} steps</p>
                <div style={{ position: "absolute", bottom: "16px", right: "14px", color: "#C4B49A" }}><IconChevronRight /></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}



// ─── SECTION SCREEN ───────────────────────────────────────────────────────────
function SectionScreen({ section, product, onBack, onOpenDrawer }) {
  const meta = SECTION_META[section.title] || { icon: "📖", color: "#6366f1" };
  return (
    <div style={{ minHeight: "100vh", background: "#F5F0E8", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px 28px", borderBottom: "1px solid #D4CBB8", position: "sticky", top: 0, background: "rgba(245,240,232,0.92)", backdropFilter: "blur(12px)", zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "rgba(101,76,45,0.07)", border: "1px solid #D4CBB8", borderRadius: "10px", color: "#6B5B45", cursor: "pointer", padding: "7px 13px", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontFamily: "system-ui, sans-serif", transition: "all 0.15s" }} onMouseEnter={e=>e.currentTarget.style.color="#2C2416"} onMouseLeave={e=>e.currentTarget.style.color="#6B5B45"}>
          <IconChevronLeft /> {product.productName.length > 22 ? product.productName.slice(0, 22) + "…" : product.productName}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={onOpenDrawer} style={{ background: "rgba(101,76,45,0.07)", border: "1px solid #D4CBB8", borderRadius: "10px", color: "#6B5B45", cursor: "pointer", padding: "7px 10px", display: "flex", transition: "all 0.15s" }} onMouseEnter={e=>e.currentTarget.style.color="#2C2416"} onMouseLeave={e=>e.currentTarget.style.color="#6B5B45"}>
          <IconMenu />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "32px 28px 60px", maxWidth: "700px", margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px", paddingBottom: "28px", borderBottom: "1px solid #D4CBB8" }}>
          <div style={{ width: "54px", height: "54px", borderRadius: "15px", background: `${meta.color}15`, border: `1px solid ${meta.color}35`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", flexShrink: 0 }}>{meta.icon}</div>
          <div>
            <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "24px", fontWeight: "700", color: "#2C2416", margin: "0 0 4px" }}>{section.title}</h2>
            <p style={{ margin: 0, fontSize: "13px", color: "#9C8B74", fontFamily: "system-ui, sans-serif" }}>{product.productName} · {section.steps.length} steps</p>
          </div>
        </div>

        {section.steps.map((step, i) => (
          <div key={i} style={{ marginBottom: "14px", background: "#EDE8DC", border: "1px solid #F5F0E8", borderRadius: "16px", overflow: "hidden" }}>
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", padding: "18px 18px 14px" }}>
              <div style={{ minWidth: "30px", height: "30px", borderRadius: "50%", background: `linear-gradient(135deg, ${meta.color}, ${meta.color}80)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "700", color: "#fff", flexShrink: 0, fontFamily: "system-ui, sans-serif", boxShadow: `0 3px 10px ${meta.color}35`, marginTop: "1px" }}>
                {i + 1}
              </div>
              <p style={{ margin: 0, fontSize: "15px", color: "#3D2B1F", lineHeight: 1.7, fontFamily: "system-ui, sans-serif", paddingTop: "4px" }}>{step}</p>
            </div>

          </div>
        ))}

        <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", background: "#FFF8E7", border: "1px solid #F0D080", borderRadius: "13px", padding: "13px 16px", marginTop: "12px" }}>
          <span>⚠️</span>
          <p style={{ margin: 0, fontSize: "12px", color: "#8B4513", fontFamily: "system-ui, sans-serif", lineHeight: 1.6 }}>AI-generated. Verify with manufacturer documentation for accuracy.</p>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  const [products, setProducts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [loadingQuery, setLoadingQuery] = useState("");
  const [error, setError] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const saveProducts = list => {
    setProducts(list);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  };

  const handleSearch = async (query) => {
    setLoadingQuery(query);
    setScreen("loading");
    setError(null);
    try {
      const guide = await fetchProductGuide(query);
      const product = { ...guide, id: Date.now(), addedAt: new Date().toISOString() };
      saveProducts([product, ...products.filter(p => p.productName !== product.productName)]);
      setActiveProduct(product);
      setScreen("guide");
    } catch (e) {
      console.error("Manuals.ai error:", e);
      const msg = e.message?.includes("API error") ? e.message
        : e.message?.includes("No JSON") ? "Claude returned an unexpected response. Try again."
        : e.message?.includes("fetch") ? "Network error — check your connection."
        : "Couldn't generate guide. Please try again.";
      setError(msg);
      setScreen("home");
    }
  };

  return (
    <>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #F5F0E8; } ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(101,76,45,0.2); border-radius: 3px; } ::placeholder { color: #C4B49A !important; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} products={products}
        onSelectProduct={p => { setActiveProduct(p); setScreen("guide"); }}
        onDeleteProduct={id => saveProducts(products.filter(p => p.id !== id))}
      />

      {screen === "home" && <HomeScreen onSearch={handleSearch} onOpenDrawer={() => setDrawerOpen(true)} error={error} onDismissError={() => setError(null)} />}
      {screen === "loading" && <LoadingScreen query={loadingQuery} />}
      {screen === "guide" && activeProduct && <GuideScreen product={activeProduct} onSelectSection={s => { setActiveSection(s); setScreen("section"); }} onBack={() => setScreen("home")} onOpenDrawer={() => setDrawerOpen(true)} />}
      {screen === "section" && activeSection && activeProduct && <SectionScreen section={activeSection} product={activeProduct} onBack={() => setScreen("guide")} onOpenDrawer={() => setDrawerOpen(true)} />}
    </>
  );
}