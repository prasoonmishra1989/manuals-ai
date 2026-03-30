import { useState, useEffect, useRef, useCallback } from "react";

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

// ─── HOME / LOADING KEYFRAMES ────────────────────────────────────────────────
const HOME_KEYFRAMES = `
@keyframes cmdPulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(74,222,128,0.6); }
  50%       { opacity: 0.7; box-shadow: 0 0 0 5px rgba(74,222,128,0); }
}
@keyframes cmdGridScroll {
  0%   { background-position: 0 0; }
  100% { background-position: 40px 40px; }
}
@keyframes cmdFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
}
@keyframes omniGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
  50%       { box-shadow: 0 0 32px 4px rgba(99,102,241,0.18); }
}
@keyframes scanSweep {
  0%   { top: 4%; opacity: 0; }
  5%   { opacity: 1; }
  95%  { opacity: 1; }
  100% { top: 96%; opacity: 0; }
}
@keyframes drawTop    { from { stroke-dashoffset: 120; } to { stroke-dashoffset: 0; } }
@keyframes drawRight  { from { stroke-dashoffset: 80;  } to { stroke-dashoffset: 0; } }
@keyframes drawBottom { from { stroke-dashoffset: 120; } to { stroke-dashoffset: 0; } }
@keyframes drawLeft   { from { stroke-dashoffset: 80;  } to { stroke-dashoffset: 0; } }
@keyframes drawPerspTop    { from { stroke-dashoffset: 90; } to { stroke-dashoffset: 0; } }
@keyframes drawPerspRight  { from { stroke-dashoffset: 70; } to { stroke-dashoffset: 0; } }
@keyframes scanRing {
  0%   { transform: scale(0.8); opacity: 0; }
  30%  { opacity: 1; }
  70%  { opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}
@keyframes dataFly {
  0%   { transform: translate(0, 0) scale(1); opacity: 0.9; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
}
@keyframes phaseIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes termBlink {
  0%, 100% { opacity: 1; } 50% { opacity: 0; }
}
@keyframes spin { to { transform: rotate(360deg); } }
`;

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
    <div style={{ minHeight: "100vh", background: "#080c14", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <style>{HOME_KEYFRAMES}</style>

      {/* Scrolling grid background */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        animation: "cmdGridScroll 4s linear infinite",
      }} />

      {/* Ambient color blobs */}
      <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: "80vw", height: "80vw", maxWidth: "700px", maxHeight: "700px", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "0", right: "-10%", width: "50vw", height: "50vw", background: "radial-gradient(circle, rgba(14,165,233,0.07) 0%, transparent 65%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Status bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", position: "relative", zIndex: 10 }}>
        <button onClick={onOpenDrawer}
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "rgba(255,255,255,0.55)", cursor: "pointer", padding: "7px 14px", display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontFamily: "system-ui, sans-serif", transition: "all 0.2s", letterSpacing: "0.3px" }}
          onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.55)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
        >
          <IconMenu /><span>MY PRODUCTS</span>
        </button>

        {/* Status pill */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "100px", padding: "5px 12px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", animation: "cmdPulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: "11px", fontFamily: "system-ui, sans-serif", color: "rgba(74,222,128,0.85)", letterSpacing: "1px", fontWeight: "600" }}>CLAUDE ONLINE</span>
        </div>
      </div>

      {/* Hero — command center content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px 220px", position: "relative", zIndex: 10 }}>

        {/* Logo mark */}
        <div style={{ animation: "cmdFloat 4s ease-in-out infinite", marginBottom: "28px" }}>
          <div style={{ width: "72px", height: "72px", borderRadius: "20px", background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(14,165,233,0.15))", border: "1px solid rgba(99,102,241,0.35)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
            <span style={{ fontSize: "34px" }}>📡</span>
          </div>
        </div>

        <p style={{ margin: "0 0 6px", fontSize: "11px", letterSpacing: "3px", color: "rgba(99,102,241,0.7)", fontFamily: "system-ui, sans-serif", fontWeight: "700" }}>COMMAND CENTER</p>
        <h1 style={{ fontFamily: "'Georgia', serif", fontSize: "clamp(44px, 8vw, 86px)", fontWeight: "700", color: "#fff", margin: "0 0 16px", textAlign: "center", lineHeight: 1.05, letterSpacing: "-2px",
          background: "linear-gradient(135deg, #fff 30%, rgba(99,102,241,0.9))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          Manuals<span style={{ WebkitTextFillColor: "rgba(99,102,241,1)" }}>.ai</span>
        </h1>
        <p style={{ fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.65)", margin: "0 0 40px", textAlign: "center", maxWidth: "360px", lineHeight: 1.7 }}>
          Drop a product name, URL, or snap a photo —<br />get your guide in seconds.
        </p>

        {/* Stat chips */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "40px", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { label: "AI-powered", icon: "⚡" },
            { label: "Instant guides", icon: "📖" },
            { label: "Any product", icon: "🔍" },
          ].map(({ label, icon }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "100px", padding: "5px 14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "12px" }}>{icon}</span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.75)", fontFamily: "system-ui, sans-serif", letterSpacing: "0.3px" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Quick hints */}
        <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", justifyContent: "center" }}>
          {["Instant Pot Duo 7-in-1", "Dyson V15 Detect", "IKEA KALLAX"].map(hint => (
            <button key={hint} onClick={() => { setQuery(hint); setTimeout(() => inputRef.current?.focus(), 0); }}
              style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "100px", padding: "5px 12px", color: "rgba(255,255,255,0.7)", fontSize: "12px", fontFamily: "system-ui, sans-serif", cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.22)"; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)"; }}
            >
              {hint}
            </button>
          ))}
        </div>
      </div>

      {/* ── FLOATING OMNI-SEARCH (thumb zone) ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, padding: "16px 16px calc(16px + env(safe-area-inset-bottom))" }}>
        {/* Camera preview strip */}
        {previewUrl && (
          <div style={{ maxWidth: "580px", margin: "0 auto 10px", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(99,102,241,0.3)", position: "relative" }}>
            <img src={previewUrl} alt="Captured product" style={{ width: "100%", maxHeight: "160px", objectFit: "cover", filter: "brightness(0.6)" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "8px" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite", color: "#6366f1" }}>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="28" strokeDashoffset="10"/>
              </svg>
              <p style={{ margin: 0, fontSize: "13px", color: "#fff", fontFamily: "system-ui, sans-serif", fontWeight: "600" }}>Identifying product…</p>
            </div>
          </div>
        )}

        {/* The omni-bar */}
        <div style={{ maxWidth: "580px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{
            background: "rgba(15,20,35,0.85)",
            border: `1.5px solid ${focused ? "rgba(99,102,241,0.7)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "20px",
            padding: "6px 10px 6px 18px",
            display: "flex", alignItems: "center", gap: "10px",
            backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
            boxShadow: focused
              ? "0 0 0 3px rgba(99,102,241,0.15), 0 8px 40px rgba(0,0,0,0.5)"
              : "0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
            transition: "all 0.25s ease",
            animation: focused ? "none" : "omniGlow 3s ease-in-out infinite",
          }}>
            <span style={{ color: focused ? "rgba(99,102,241,0.9)" : "rgba(255,255,255,0.3)", flexShrink: 0, display: "flex", transition: "color 0.2s" }}>
              {isUrl ? <IconLink /> : <IconSearch />}
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Product name or paste URL…"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "15px", color: "#fff", fontFamily: "system-ui, sans-serif", padding: "12px 0", minWidth: 0 }}
            />
            {/* Camera */}
            <button
              onClick={() => cameraRef.current?.click()}
              disabled={cameraLoading}
              title="Take a photo to identify product"
              style={{ padding: "9px", background: "rgba(255,255,255,0.05)", color: cameraLoading ? "#6366f1" : "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "11px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.15)"; e.currentTarget.style.color = "#6366f1"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = cameraLoading ? "#6366f1" : "rgba(255,255,255,0.35)"; }}
            >
              {cameraLoading
                ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10"/></svg>
                : <IconCamera />}
            </button>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleCameraCapture} style={{ display: "none" }} />

            {/* Submit button — inline on omnibar */}
            <button onClick={submit} disabled={!query.trim()}
              style={{ padding: "9px 18px", background: query.trim() ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "rgba(255,255,255,0.04)", color: query.trim() ? "#fff" : "rgba(255,255,255,0.2)", border: "none", borderRadius: "13px", cursor: query.trim() ? "pointer" : "default", fontSize: "13px", fontWeight: "700", fontFamily: "system-ui, sans-serif", transition: "all 0.2s", flexShrink: 0, letterSpacing: "0.3px",
                boxShadow: query.trim() ? "0 4px 16px rgba(99,102,241,0.4)" : "none",
              }}
              onMouseEnter={e => { if (query.trim()) e.currentTarget.style.boxShadow = "0 6px 24px rgba(99,102,241,0.6)"; }}
              onMouseLeave={e => { if (query.trim()) e.currentTarget.style.boxShadow = "0 4px 16px rgba(99,102,241,0.4)"; }}
            >
              Go →
            </button>
          </div>
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div style={{ position: "fixed", bottom: "120px", left: "50%", transform: "translateX(-50%)", background: "rgba(15,20,35,0.95)", border: "1px solid rgba(220,38,38,0.4)", backdropFilter: "blur(20px)", borderRadius: "14px", padding: "13px 18px", display: "flex", alignItems: "center", gap: "10px", zIndex: 100, maxWidth: "500px", width: "calc(100% - 48px)", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
          <span>⚠️</span>
          <span style={{ flex: 1, fontSize: "13px", color: "#f87171", fontFamily: "system-ui, sans-serif" }}>{error}</span>
          <button onClick={onDismissError} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "2px", display: "flex" }}><IconX /></button>
        </div>
      )}
    </div>
  );
}

// ─── DIGITIZE ANIMATION ───────────────────────────────────────────────────────
function DigitizeBox({ color }) {
  // Particles shot off during scan
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    dx: `${(Math.random() - 0.5) * 90}px`,
    dy: `${-(Math.random() * 60 + 20)}px`,
    delay: `${Math.random() * 1.8}s`,
    size: Math.random() * 3 + 1.5,
  }));

  return (
    <div style={{ position: "relative", width: "140px", height: "120px", margin: "0 auto 40px" }}>
      {/* Outer ring pulse */}
      <div style={{ position: "absolute", inset: "-18px", borderRadius: "50%", border: `1px solid ${color}55`, animation: "scanRing 2.4s ease-out infinite" }} />
      <div style={{ position: "absolute", inset: "-10px", borderRadius: "50%", border: `1px solid ${color}33`, animation: "scanRing 2.4s ease-out infinite 0.6s" }} />

      {/* SVG wireframe box */}
      <svg viewBox="0 0 140 120" width="140" height="120" style={{ position: "absolute", inset: 0 }}>
        {/* Front face */}
        <rect x="20" y="35" width="80" height="60" rx="4" fill="none" stroke={color} strokeWidth="1.5"
          strokeDasharray="120" style={{ animation: "drawTop 0.6s ease forwards, drawBottom 0.6s ease 0.2s forwards" }} />
        {/* Top perspective lines */}
        <line x1="20" y1="35" x2="45" y2="15" stroke={color} strokeWidth="1.5" strokeDasharray="90" opacity="0.7"
          style={{ animation: "drawPerspTop 0.5s ease 0.3s forwards" }} />
        <line x1="100" y1="35" x2="125" y2="15" stroke={color} strokeWidth="1.5" strokeDasharray="90" opacity="0.7"
          style={{ animation: "drawPerspTop 0.5s ease 0.4s forwards" }} />
        {/* Top face */}
        <line x1="45" y1="15" x2="125" y2="15" stroke={color} strokeWidth="1.5" strokeDasharray="90" opacity="0.7"
          style={{ animation: "drawTop 0.5s ease 0.5s forwards" }} />
        {/* Right perspective line */}
        <line x1="125" y1="15" x2="125" y2="75" stroke={color} strokeWidth="1.5" strokeDasharray="70" opacity="0.7"
          style={{ animation: "drawRight 0.5s ease 0.55s forwards" }} />
        <line x1="100" y1="95" x2="125" y2="75" stroke={color} strokeWidth="1.5" strokeDasharray="70" opacity="0.5"
          style={{ animation: "drawPerspRight 0.4s ease 0.65s forwards" }} />

        {/* Internal grid lines — depth effect */}
        {[50, 70, 90].map((x, i) => (
          <line key={x} x1={x} y1="35" x2={x} y2="95" stroke={color} strokeWidth="0.5" opacity="0.2"
            style={{ animation: `drawRight 0.4s ease ${0.7 + i * 0.1}s forwards` }} />
        ))}
        {[55, 70].map((y, i) => (
          <line key={y} x1="20" y1={y} x2="100" y2={y} stroke={color} strokeWidth="0.5" opacity="0.2"
            style={{ animation: `drawTop 0.4s ease ${0.8 + i * 0.1}s forwards` }} />
        ))}
      </svg>

      {/* Scan line sweeping over the box */}
      <div style={{
        position: "absolute", left: "14%", right: "0",
        height: "2px",
        background: `linear-gradient(90deg, transparent, ${color}, ${color}cc, transparent)`,
        boxShadow: `0 0 12px 3px ${color}88`,
        animation: "scanSweep 1.8s ease-in-out infinite",
        top: "35px",
      }} />

      {/* Data particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${20 + Math.random() * 80}px`,
          top: `${35 + Math.random() * 60}px`,
          width: `${p.size}px`, height: `${p.size}px`,
          borderRadius: "1px",
          background: color,
          opacity: 0,
          // @ts-ignore
          "--dx": p.dx, "--dy": p.dy,
          animation: `dataFly 1.6s ease-out ${p.delay} infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────
function LoadingScreen({ query }) {
  const [phase, setPhase] = useState(0);
  const [tick, setTick] = useState(0);
  const isUrl = query.startsWith("http://") || query.startsWith("https://");

  const allPhases = isUrl
    ? ["Fetching product page", "Parsing product data", "Crafting your guide"]
    : ["Scanning product", "Analyzing specifications", "Crafting your guide"];

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (phase >= allPhases.length - 1) return;
    const t = setTimeout(() => setPhase(p => p + 1), 2600);
    return () => clearTimeout(t);
  }, [phase, allPhases.length]);

  const accentColor = phase === 0 ? "#6366f1" : phase === 1 ? "#0ea5e9" : "#4ade80";
  const dots = ".".repeat((tick % 3) + 1);

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", overflow: "hidden" }}>
      <style>{HOME_KEYFRAMES}</style>

      {/* Grid bg */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
        backgroundSize: "40px 40px", animation: "cmdGridScroll 4s linear infinite",
      }} />

      {/* Ambient glow matching current phase */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60vw", height: "60vw", background: `radial-gradient(circle, ${accentColor}14 0%, transparent 65%)`, pointerEvents: "none", transition: "background 0.8s ease" }} />

      <div style={{ textAlign: "center", maxWidth: "400px", position: "relative", zIndex: 1 }}>
        {/* Digitize animation */}
        <DigitizeBox color={accentColor} />

        {/* Phase label */}
        <div key={phase} style={{ animation: "phaseIn 0.4s ease forwards" }}>
          <p style={{ margin: "0 0 4px", fontSize: "11px", letterSpacing: "2.5px", color: `${accentColor}bb`, fontFamily: "system-ui, sans-serif", fontWeight: "700" }}>
            STEP {phase + 1} OF {allPhases.length}
          </p>
          <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "22px", color: "#E2FF6F", margin: "0 0 12px", fontWeight: "700", textShadow: "0 0 20px rgba(226,255,111,0.25)" }}>
            {allPhases[phase]}{dots}
          </h2>
        </div>

        {/* Query label */}
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", fontFamily: "system-ui, sans-serif", margin: "0 0 28px", fontStyle: "italic" }}>
          "{query.length > 52 ? query.slice(0, 52) + "…" : query}"
        </p>

        {/* Progress track */}
        <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "24px" }}>
          {allPhases.map((_, i) => (
            <div key={i} style={{
              height: "3px",
              width: i < phase ? "40px" : i === phase ? "56px" : "24px",
              borderRadius: "2px",
              background: i < phase ? "#4ade80" : i === phase ? accentColor : "rgba(255,255,255,0.1)",
              transition: "all 0.5s ease",
              boxShadow: i === phase ? `0 0 8px ${accentColor}88` : "none",
            }} />
          ))}
        </div>

        {/* Terminal-style sub-label */}
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", fontFamily: "'Courier New', monospace", margin: 0, lineHeight: 1.7 }}>
          <span style={{ color: `${accentColor}88` }}>›</span>{" "}
          {phase === 0 && isUrl  && "Reading product page for accurate specs…"}
          {phase === 0 && !isUrl && "Matching product to knowledge base…"}
          {phase === 1 && "Extracting features, steps, and warnings…"}
          {phase === 2 && "Compiling into your personalized guide…"}
          <span style={{ animation: "termBlink 1s step-end infinite" }}>▋</span>
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

        <TrustBadge variant="light" />

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
// ─── TRUST BADGE ──────────────────────────────────────────────────────────────
// variant="light"  → cream background (GuideScreen)
// variant="dark"   → dark glass background (SectionScreen)
function TrustBadge({ variant = "light" }) {
  const light = {
    wrap: {
      display: "inline-flex", alignItems: "center", gap: "10px",
      background: "linear-gradient(135deg, rgba(186,230,253,0.35), rgba(167,243,208,0.3))",
      border: "1px solid rgba(147,197,253,0.45)",
      borderRadius: "100px",
      padding: "7px 16px 7px 10px",
      boxShadow: "0 1px 8px rgba(147,197,253,0.15), inset 0 1px 0 rgba(255,255,255,0.7)",
    },
    dot: { width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", boxShadow: "0 0 0 3px rgba(52,211,153,0.2)" },
    label: { fontSize: "11px", fontWeight: "700", color: "#0369a1", fontFamily: "system-ui, sans-serif", letterSpacing: "0.4px" },
    sub:   { fontSize: "11px", color: "#64748b", fontFamily: "system-ui, sans-serif" },
    divider: { width: "1px", height: "12px", background: "rgba(147,197,253,0.5)" },
  };
  const dark = {
    wrap: {
      display: "inline-flex", alignItems: "center", gap: "10px",
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "100px",
      padding: "7px 16px 7px 10px",
      backdropFilter: "blur(12px)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
    },
    dot: { width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 0 3px rgba(74,222,128,0.2)" },
    label: { fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.7)", fontFamily: "system-ui, sans-serif", letterSpacing: "0.4px" },
    sub:   { fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "system-ui, sans-serif" },
    divider: { width: "1px", height: "12px", background: "rgba(255,255,255,0.12)" },
  };
  const s = variant === "dark" ? dark : light;

  return (
    <div style={{ textAlign: "center", margin: variant === "light" ? "0 0 28px" : "16px 0 0" }}>
      <div style={s.wrap}>
        {/* Sparkle icon */}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
          <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-5.26L4 10l5.91-1.74Z"
            fill={variant === "dark" ? "rgba(74,222,128,0.8)" : "rgba(52,211,153,0.9)"} />
          <circle cx="19" cy="4" r="1.2" fill={variant === "dark" ? "rgba(74,222,128,0.5)" : "rgba(147,197,253,0.9)"} />
          <circle cx="5"  cy="19" r="0.9" fill={variant === "dark" ? "rgba(74,222,128,0.4)" : "rgba(167,243,208,0.9)"} />
        </svg>

        <div style={s.dot} />
        <span style={s.label}>AI-Crafted by Claude</span>
        <div style={s.divider} />
        <span style={s.sub}>Cross-check critical steps</span>
      </div>
    </div>
  );
}

// ─── CONFETTI ─────────────────────────────────────────────────────────────────
function ConfettiBurst({ x, y, color, onDone }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    canvas.width = 200 * DPR; canvas.height = 200 * DPR;
    ctx.scale(DPR, DPR);
    const COLORS = [color, "#a8e6cf", "#fff", "#ffd3b6", "#dcedc1", "#ffaaa5"];
    const particles = Array.from({ length: 28 }, () => ({
      x: 100, y: 100,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.65) * 14,
      size: Math.random() * 5 + 3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.3,
      shape: Math.random() > 0.4 ? "rect" : "circle",
      alpha: 1,
    }));
    let raf;
    const tick = () => {
      ctx.clearRect(0, 0, 200, 200);
      let alive = false;
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.45; p.vx *= 0.97;
        p.rot += p.rotV; p.alpha -= 0.022;
        if (p.alpha <= 0) return;
        alive = true;
        ctx.save(); ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      });
      if (alive) raf = requestAnimationFrame(tick);
      else onDone();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [color, onDone]);
  return (
    <canvas ref={canvasRef}
      style={{ position: "fixed", left: x - 100, top: y - 100, width: 200, height: 200, pointerEvents: "none", zIndex: 9999 }}
    />
  );
}

// ─── STEP CARD ────────────────────────────────────────────────────────────────
const GLASS_KEYFRAMES = `
@keyframes completePop {
  0%   { transform: scale(1); }
  40%  { transform: scale(1.22); }
  70%  { transform: scale(0.93); }
  100% { transform: scale(1); }
}
@keyframes cardComplete {
  0%   { opacity: 1; }
  50%  { opacity: 0.85; }
  100% { opacity: 1; }
}
`;

function StepCard({ step, index, accentColor }) {
  const [done, setDone] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [burst, setBurst] = useState(null);

  const handleBadgeClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (!done) {
      setBurst({ x: cx, y: cy, id: Date.now() });
    }
    setDone(d => !d);
  }, [done]);

  const completeBg = "rgba(134,239,172,0.18)";
  const completeBorder = "rgba(74,222,128,0.45)";
  const defaultBg = "rgba(255,255,255,0.12)";
  const defaultBorder = "rgba(255,255,255,0.22)";

  return (
    <>
      {burst && (
        <ConfettiBurst key={burst.id} x={burst.x} y={burst.y} color={accentColor}
          onDone={() => setBurst(null)} />
      )}
      <div
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onTouchStart={() => setPressed(true)}
        onTouchEnd={() => setPressed(false)}
        style={{
          marginBottom: "12px",
          background: done ? completeBg : defaultBg,
          border: `1px solid ${done ? completeBorder : defaultBorder}`,
          borderRadius: "20px",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: done
            ? "0 4px 24px rgba(74,222,128,0.15), inset 0 1px 0 rgba(255,255,255,0.25)"
            : "0 4px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.25)",
          transform: pressed ? "scale(0.975)" : "scale(1)",
          transition: "transform 0.12s cubic-bezier(0.34,1.56,0.64,1), background 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Shimmer top edge */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6) 50%, transparent)",
        }} />

        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", padding: "18px 18px 16px" }}>
          {/* Clickable badge */}
          <button
            onClick={handleBadgeClick}
            style={{
              minWidth: "34px", height: "34px", borderRadius: "50%",
              background: done
                ? "linear-gradient(135deg, #4ade80, #22c55e)"
                : `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
              border: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: done ? "16px" : "13px",
              fontWeight: "700", color: "#fff", flexShrink: 0,
              fontFamily: "system-ui, sans-serif",
              boxShadow: done
                ? "0 3px 14px rgba(74,222,128,0.5)"
                : `0 3px 12px ${accentColor}55`,
              cursor: "pointer",
              marginTop: "1px",
              transition: "background 0.35s ease, box-shadow 0.35s ease",
              animation: done ? "completePop 0.4s cubic-bezier(0.34,1.56,0.64,1)" : "none",
            }}
          >
            {done ? "✓" : index + 1}
          </button>

          <p style={{
            margin: 0,
            fontSize: "15px",
            color: done ? "#86efac" : "#FFFFFF",
            lineHeight: 1.7,
            fontFamily: "system-ui, sans-serif",
            paddingTop: "6px",
            transition: "color 0.35s ease",
            opacity: done ? 0.7 : 1,
          }}>
            {step}
          </p>
        </div>

        {/* Completion progress stripe */}
        {done && (
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: "2px",
            background: "linear-gradient(90deg, #4ade80, #22c55e 60%, transparent)",
            opacity: 0.7,
          }} />
        )}
      </div>
    </>
  );
}

// ─── SECTION SCREEN ───────────────────────────────────────────────────────────
function SectionScreen({ section, product, onBack, onOpenDrawer }) {
  const meta = SECTION_META[section.title] || { icon: "📖", color: "#6366f1" };
  const completedCount = 0; // tracked inside StepCards individually

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1a1025 0%, #0f1f2e 50%, #12201a 100%)", display: "flex", flexDirection: "column" }}>
      <style>{GLASS_KEYFRAMES}</style>

      {/* Ambient blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "55vw", height: "55vw", borderRadius: "50%", background: `radial-gradient(circle, ${meta.color}22 0%, transparent 70%)`, filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: "5%", right: "-10%", width: "45vw", height: "45vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(74,222,128,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: 0, background: "rgba(15,20,30,0.6)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "10px", color: "rgba(255,255,255,0.7)", cursor: "pointer", padding: "7px 13px", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontFamily: "system-ui, sans-serif", transition: "all 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.color = "#fff"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}>
          <IconChevronLeft /> {product.productName.length > 22 ? product.productName.slice(0, 22) + "…" : product.productName}
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={onOpenDrawer} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "10px", color: "rgba(255,255,255,0.7)", cursor: "pointer", padding: "7px 10px", display: "flex", transition: "all 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.color = "#fff"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}>
          <IconMenu />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px 80px", maxWidth: "680px", margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>
        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px", paddingBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: "54px", height: "54px", borderRadius: "15px", background: `${meta.color}22`, border: `1px solid ${meta.color}44`, backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", flexShrink: 0 }}>{meta.icon}</div>
          <div>
            <h2 style={{ fontFamily: "'Georgia', serif", fontSize: "24px", fontWeight: "700", color: "#E2FF6F", margin: "0 0 4px", textShadow: "0 0 24px rgba(226,255,111,0.3)" }}>{section.title}</h2>
            <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.65)", fontFamily: "system-ui, sans-serif" }}>
              {product.productName} · {section.steps.length} steps · <span style={{ color: "rgba(74,222,128,0.9)" }}>tap ① to complete</span>
            </p>
          </div>
        </div>

        {/* Step cards */}
        {section.steps.map((step, i) => (
          <StepCard key={i} step={step} index={i} accentColor={meta.color} />
        ))}

        <TrustBadge variant="dark" />
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