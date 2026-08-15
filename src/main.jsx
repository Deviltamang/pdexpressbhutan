
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, NavLink, useNavigate, useSearchParams, useLocation, useParams } from "react-router-dom";
import emailjs from "@emailjs/browser";
import {
  Building2, CarFront, ShoppingBag, ArrowRight, Search, MapPin, Mail, Menu, X,
  Package, House, BarChart3, Users, Plus, Edit3, LogOut, MessageCircle, Facebook, Instagram,
  Music2, Send, Trash2, Save, Loader2, Camera, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ImagePlus,
  CircleX, Upload, ExternalLink, AlertTriangle, FileSpreadsheet, FileText, QrCode, Truck, ClipboardList, Bell, Pause, Play, ShieldCheck, Star, Sparkles, BriefcaseBusiness, FileCheck, BookOpen, Shield, Film, Image, ReceiptText, Boxes, UsersRound, WalletCards, RotateCcw, Eye, EyeOff
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "./supabase";
import {
  APPLIANCE_CATEGORIES, REMOVED_APPLIANCE_CATEGORY,
  getStoreCategories, getRealEstateCategories, getMotorsCategories,
} from "./categoryConfig.js";
import CategoryNavigation from "./components/CategoryNavigation.jsx";
import CategoryListingsPage from "./pages/CategoryListingsPage.jsx";
import { QRCodeSVG } from "qrcode.react";
import * as XLSX from "xlsx-js-style";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./styles.css";

const WHATSAPP_URL = "https://wa.me/message/PORGXEPDD5K3C1";
const BRANCH_SLUG_FOR_KIND = { product: "store", property: "real-estate", vehicle: "motors" };

function whatsAppLinkForBranch(branch, message) {
  const digits = String(branch?.whatsapp_number || "").replace(/\D/g, "");
  const base = digits ? `https://wa.me/${digits}` : (branch?.whatsapp_link || WHATSAPP_URL);
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

const SOCIAL = {
  storeTikTok: "https://www.tiktok.com/@pdexpress.2017?_r=1&_t=ZS-97TfhenBrHN",
  motorsFb: "https://www.facebook.com/share/1PTyu7QYYC/",
  realEstateFb: "https://www.facebook.com/share/18o6zx62HT/",
  storeFb: "https://www.facebook.com/share/18uBjz2h7w/",
  instagram: "https://www.instagram.com/pdexpress2017?igsh=MXZsdWxrYXp4NGU1Ng==",
  twitter: "https://x.com/Pelden102017",
};

const LOCATION_BUSINESS_TYPES = ["PDExpress Store", "PD Motors Showroom"];

const DataContext = createContext(null);
const FALLBACK = { products: [], properties: [], vehicles: [], branches: [], locations: [] };
const branchSlugFor = {
  store_admin: "store",
  real_estate_admin: "real-estate",
  motors_admin: "motors",
};

export function useData() { return useContext(DataContext); }

function useSectionBranch() {
  const { branches } = useData();
  const location = useLocation();
  const slug = location.pathname.startsWith("/motors") ? "motors" : location.pathname.startsWith("/real-estate") ? "real-estate" : "store";
  return branches.find((b) => b.slug === slug);
}

function useCustomerCareContact() {
  const [contact, setContact] = useState({ whatsapp_number: "", whatsapp_link: "" });
  const [loading, setLoading] = useState(true);

  async function refreshContact() {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("site_contact").select("whatsapp_number,whatsapp_link").eq("contact_key", "customer_care").maybeSingle();
    if (data) setContact(data);
    setLoading(false);
  }

  useEffect(() => { refreshContact(); }, []);
  return { contact, loading, refreshContact };
}

function useHeroMedia() {
  const [heroMedia, setHeroMedia] = useState({ video_url: "", poster_url: "" });
  const [loading, setLoading] = useState(true);

  async function refreshHeroMedia() {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("site_media").select("video_url,poster_url,updated_at").eq("media_key", "home_hero").maybeSingle();
    if (data) setHeroMedia(data);
    setLoading(false);
  }

  useEffect(() => { refreshHeroMedia(); }, []);
  return { heroMedia, loading, refreshHeroMedia, setHeroMedia };
}


/*
  Public Home uses a JSON file in the public `hero-media` bucket first.
  This avoids public-page failures caused by table RLS/policy caching.
  The database remains the Super Admin source of truth and fallback.
*/
function usePublicHeroMedia() {
  const [heroMedia, setHeroMedia] = useState({ video_url: "", poster_url: "", updated_at: "" });

  useEffect(() => {
    let active = true;

    async function loadPublicHero() {
      if (!supabase) return;

      try {
        const configUrl = supabase.storage
          .from("hero-media")
          .getPublicUrl("home-hero.json")
          .data.publicUrl;

        const response = await fetch(`${configUrl}?t=${Date.now()}`, { cache: "no-store" });
        if (response.ok) {
          const publicConfig = await response.json();
          if (active && (publicConfig.video_url || publicConfig.poster_url)) {
            setHeroMedia(publicConfig);
            return;
          }
        }
      } catch (_) {
        // Continue to the table fallback below.
      }

      try {
        const { data } = await supabase
          .from("site_media")
          .select("video_url,poster_url,updated_at")
          .eq("media_key", "home_hero")
          .maybeSingle();

        if (active && data) setHeroMedia(data);
      } catch (_) {
        // The default visual stays visible when neither source is available.
      }
    }

    loadPublicHero();
    return () => { active = false; };
  }, []);

  return heroMedia;
}


export function useIsPhone() {
  const [isPhone, setIsPhone] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 680px)").matches);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 680px)");
    const onChange = () => setIsPhone(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return isPhone;
}

function useInView(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || !("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.16, ...options });

    observer.observe(element);
    return () => observer.disconnect();
  }, [options.rootMargin, options.threshold]);

  return [ref, visible];
}

export function Reveal({ children, className = "", delay = 0, direction = "up" }) {
  const [ref, visible] = useInView();
  return <div
    ref={ref}
    className={`reveal reveal-${direction} ${visible ? "is-visible" : ""} ${className}`}
    style={{ "--reveal-delay": `${delay}ms` }}
  >{children}</div>;
}

function CountUp({ value, duration = 900 }) {
  const [ref, visible] = useInView();
  const [display, setDisplay] = useState(0);
  const numericValue = typeof value === "number" ? value : Number(value) || 0;

  useEffect(() => {
    if (!visible) return;
    let frame;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(numericValue * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, numericValue, duration]);

  return <span ref={ref}>{display}</span>;
}

export function money(v) { return v === null || v === undefined || v === "" ? "Price on request" : `Nu. ${Number(v).toLocaleString()}`; }

export function vehiclePricing(item) {
  const base = Number(item?.base_price ?? item?.price ?? 0);
  const gst = Math.max(0, Number(item?.gst_percent ?? 0));
  const discount = Math.max(0, Math.min(100, Number(item?.discount_percent ?? 0)));
  const afterGst = Math.round(base * (1 + gst / 100));
  const final = Math.round(afterGst * (1 - discount / 100));
  return { base, gst, discount, afterGst, final };
}


export function productPricing(item) {
  const base = Number(item?.base_price ?? item?.price ?? 0);
  const gst = Math.max(0, Number(item?.gst_percent ?? 0));
  const discount = Math.max(0, Math.min(100, Number(item?.discount_percent ?? 0)));
  const afterGst = Math.round(base * (1 + gst / 100));
  const final = Math.round(afterGst * (1 - discount / 100));
  return { base, gst, discount, afterGst, final, description: item?.discount_description || "" };
}

function ProductPrice({ item, compact = false }) {
  const { base, gst, discount, afterGst, final, description } = productPricing(item);
  if (!base) return <strong className="price">Price on request</strong>;
  return <div className={`product-price ${compact ? "compact" : ""}`}>
    {gst > 0 && <span className="price-breakdown">Basic price {money(base)} + {gst}% GST = {money(afterGst)}</span>}
    {discount > 0 ? <>
      <div className="discount-row"><span className="old-price">{money(afterGst)}</span><span className="discount-badge">{discount}% OFF</span></div>
      <strong className="price">{money(final)}</strong>
      {description && <span className="discount-description">{description}</span>}
    </> : <strong className="price">{money(afterGst)}</strong>}
  </div>;
}

function VehiclePrice({ item, compact = false }) {
  const { base, gst, discount, afterGst, final } = vehiclePricing(item);
  if (!base) return <strong className="price">Price on request</strong>;
  return <div className={`vehicle-price ${compact ? "compact" : ""}`}>
    <span className="price-breakdown">Basic price {money(base)}{gst ? ` + ${gst}% GST = ${money(afterGst)}` : ""}</span>
    {discount > 0 ? <>
      <div className="discount-row"><span className="old-price">{money(afterGst)}</span><span className="discount-badge">{discount}% OFF</span></div>
      <strong className="price">{money(final)}</strong>
    </> : <strong className="price">{money(afterGst)}</strong>}
  </div>;
}
export function titleStatus(v) { return String(v || "available").replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase()); }
export function normalizeStatus(v) { return String(v || "available").trim().toLowerCase().replaceAll(" ", "_"); }
export function getImages(item) {
  const list = Array.isArray(item?.image_urls) ? item.image_urls : [];
  if (list.length) return list.filter(Boolean).slice(0, 10);
  return item?.image_url ? [item.image_url] : [];
}
export function imageFallback(kind) {
  if (kind === "product") return "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=900&q=80";
  if (kind === "property") return "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=900&q=80";
  return "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80";
}

// Some saved image URLs (e.g. links copied from Facebook posts) stop
// resolving once their signed link expires, which the browser otherwise
// shows as a broken-image icon. Swap to the same stock fallback used for
// listings with no photo at all, so a dead link degrades gracefully
// instead of looking cropped or broken.
export function handleImageError(event, kind) {
  const fallback = imageFallback(kind);
  if (event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
}


function propertyMapUrl(item) {
  if (item?.map_url) return item.map_url;
  if (item?.google_maps_url) return item.google_maps_url;
  if (item?.latitude && item?.longitude) return `https://www.google.com/maps?q=${item.latitude},${item.longitude}`;
  if (item?.address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`;
  return "";
}

function DirectionsButton({ url, label = "Get directions", compact = false }) {
  if (!url) {
    return <span className={`location-coming-soon ${compact ? "compact" : ""}`}>
      <MapPin size={compact ? 15 : 17} /> Location coming soon
    </span>;
  }

  return <a className={`directions-button ${compact ? "compact" : ""}`} href={url} target="_blank" rel="noreferrer">
    <MapPin size={compact ? 15 : 17} /> {label} <ExternalLink size={compact ? 14 : 16} />
  </a>;
}

function miniMapEmbedUrl(location) {
  if (!location || location.is_coming_soon || !location.map_url) return "";
  if (location.map_embed_url) return location.map_embed_url;
  if (location.latitude != null && location.longitude != null && location.latitude !== "" && location.longitude !== "") {
    return `https://www.google.com/maps?q=${location.latitude},${location.longitude}&output=embed`;
  }
  if (location.address) return `https://www.google.com/maps?q=${encodeURIComponent(location.address)}&output=embed`;
  return "";
}

function LocationSection({ locations, title, description, className = "" }) {
  return <section className={`branch-location-section ${className}`}>
    <div className="branch-location-heading">
      <span className="eyebrow">VISIT US</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>

    <div className={`branch-location-grid ${locations.length === 1 ? "one-location" : ""}`}>
      {locations.map((location) => {
        const embedUrl = miniMapEmbedUrl(location);
        const key = location.id || location.name;

        return <article className="branch-location-card mini-map-card" key={key}>
          <div className="mini-map-card-info">
            <div className="location-pin"><MapPin /></div>
            <div>
              {location.business_type && <span className="location-business-type">{location.business_type}</span>}
              <h3>{location.name}</h3>
              {location.address && <p>{location.address}</p>}
              {location.description && <p className="location-description">{location.description}</p>}
            </div>
          </div>

          {embedUrl ? (
            <a
              className="mini-map-link"
              href={location.map_url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${location.name} in Google Maps`}
              title="Open in Google Maps"
            >
              <iframe
                className="mini-map-frame"
                src={embedUrl}
                title={`${location.name} mini map`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                tabIndex="-1"
              />
              <span className="mini-map-action"><MapPin size={16} /> Open in Google Maps <ExternalLink size={15} /></span>
            </a>
          ) : (
            <div className="mini-map-pending">
              <MapPin size={23} />
              <strong>{location.is_coming_soon ? "Showroom coming soon" : "Showroom map coming soon"}</strong>
              <span>
                {location.is_coming_soon
                  ? "This location isn't open yet. Check back soon for details."
                  : "Add the Google Maps link in the project location settings to display it here."}
              </span>
            </div>
          )}
        </article>;
      })}
    </div>
  </section>;
}

function FooterLocations() {
  const { locations } = useData();
  const activeLocations = [...(locations || [])]
    .filter((l) => l.is_active)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  if (!activeLocations.length) return null;
  return <div className="footer-locations-wrap">
    <div className="container">
      <LocationSection
        className="footer-locations"
        locations={activeLocations}
        title="Find a PDExpress Store or PD Motors showroom near you."
        description="Click a mini map to open Google Maps directions."
      />
    </div>
  </div>;
}
function DataProvider({ children }) {
  const [data, setData] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    if (!supabase) {
      setLoading(false);
      setError("Supabase is not connected. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.");
      return;
    }
    setLoading(true);
    const [branches, products, properties, vehicles, locations] = await Promise.all([
      supabase.from("branches").select("*").order("name"),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("properties").select("*").order("created_at", { ascending: false }),
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
      // Intentionally excluded from firstError below: if store-locations-migration.sql
      // hasn't been run yet, the rest of the site should keep working normally and
      // the Visit Us section should just show nothing, not take down the whole app.
      supabase.from("store_locations").select("*").order("display_order", { ascending: true }),
    ]);
    const firstError = branches.error || products.error || properties.error || vehicles.error;
    if (firstError) setError(firstError.message);
    else {
      setError("");
      setData({
        branches: branches.data || [],
        products: products.data || [],
        properties: properties.data || [],
        vehicles: vehicles.data || [],
        locations: locations.data || [],
      });
    }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);
  return <DataContext.Provider value={{ ...data, loading, error, refresh }}>{children}</DataContext.Provider>;
}

function Logo({ variant = "onLight", className = "" }) {
  const src = variant === "onDark" ? "/logo-for-black-background.png" : "/logo-for-white-background.png";
  return <img src={src} alt="PD Express Bhutan" className={`brand-logo ${className}`} />;
}

function XIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>;
}

function WhatsAppButton() {
  const { contact } = useCustomerCareContact();
  return <a className="whatsapp-float" href={whatsAppLinkForBranch(contact)} target="_blank" rel="noreferrer">
    <MessageCircle size={24} /><span>WhatsApp</span>
  </a>;
}

const nav = [
  ["/", "Home"],
  ["/store", "PDExpress Store"],
  ["/real-estate", "Real Estate"],
  ["/motors", "PD Motors"],
  ["/about", "About Us"],
  ["/contact", "Contact"],
];

// Which nav links get a category dropdown, and the labels/section keys
// CategoryNavigation needs. Category data itself always comes from
// categoryConfig.js (Store/Real Estate) or live vehicle data (Motors) -
// never duplicated here.
const NAV_CATEGORY_SECTIONS = {
  "/store": { section: "store", sectionLabel: "Store", allLabel: "All Products" },
  "/real-estate": { section: "real-estate", sectionLabel: "Real Estate", allLabel: "All Properties" },
  "/motors": { section: "motors", sectionLabel: "Motors", allLabel: "All Vehicles" },
};

function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const footerBranch = useSectionBranch();
  const { vehicles } = useData();

  const navCategoriesByPath = {
    "/store": getStoreCategories(),
    "/real-estate": getRealEstateCategories(),
    "/motors": getMotorsCategories(vehicles),
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return <>
    <div className="site-fixed-bg" aria-hidden="true" />
    <header className={`site-header ${isHome ? "site-header-home" : ""} ${scrolled || !isHome ? "is-scrolled" : ""}`}>
      <Link className="site-logo-link" to="/"><Logo /></Link>
      <button className="mobile-menu" aria-label="Open navigation" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      <nav className={open ? "open" : ""}>
        {nav.map(([to, label]) => {
          const catConfig = NAV_CATEGORY_SECTIONS[to];
          return catConfig
            ? <CategoryNavigation
                key={to}
                to={to}
                label={label}
                section={catConfig.section}
                sectionLabel={catConfig.sectionLabel}
                allLabel={catConfig.allLabel}
                categories={navCategoriesByPath[to]}
              />
            : <NavLink key={to} to={to}>{label}</NavLink>;
        })}
        <Link className="login-link" to="/login">Admin Login</Link>
      </nav>
    </header>
    <div className={`nav-backdrop ${open ? "open" : ""}`} onClick={() => setOpen(false)} />
    <main key={location.pathname} className="route-fade">{children}</main>
    {!location.pathname.startsWith("/admin") && !["/login", "/contact"].includes(location.pathname) && !["/store", "/real-estate", "/motors"].some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`)) && <FooterLocations />}
    <WhatsAppButton />
    <footer>
      <div className="container footer-inner">
        <Reveal className="footer-brand" direction="up">
          <Link to="/"><Logo variant="onDark" /></Link>
          <p>Delivering quality, building trust, and driving the future across Bhutan.</p>
        </Reveal>
        <Reveal className="footer-explore" direction="up" delay={80}>
          <h4>Explore</h4>
          <Link to="/store">PDExpress Store</Link>
          <Link to="/real-estate">PD Express Real Estate</Link>
          <Link to="/motors">PD Motors</Link>
        </Reveal>
        <Reveal className="footer-info" direction="up" delay={140}>
          <h4>Information</h4>
          <Link to="/services">Our Services</Link>
          <Link to="/history">Company History</Link>
          <Link to="/terms">Terms & Conditions</Link>
          <Link to="/warranty">Warranty Policy</Link>
          <Link to="/delivery">Delivery Information</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </Reveal>
        <Reveal className="footer-connect" direction="up" delay={200}>
          <h4>Connect</h4>
          <div className="footer-socials">
            <a className="social-icon" href={SOCIAL.storeFb} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook size={18} /></a>
            <a className="social-icon" href={SOCIAL.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
            <a className="social-icon" href={SOCIAL.twitter} target="_blank" rel="noreferrer" aria-label="X (formerly Twitter)"><XIcon size={16} /></a>
            <a className="social-icon" href={SOCIAL.storeTikTok} target="_blank" rel="noreferrer" aria-label="TikTok"><Music2 size={18} /></a>
            <a className="social-icon" href={whatsAppLinkForBranch(footerBranch)} target="_blank" rel="noreferrer" aria-label="WhatsApp"><MessageCircle size={18} /></a>
          </div>
        </Reveal>
        <Reveal className="footer-bottom" direction="up" delay={240}>
          <span>© {new Date().getFullYear()} PD Express Bhutan.</span>
          <button type="button" className="footer-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Back to top <ArrowRight size={14} />
          </button>
        </Reveal>
      </div>
    </footer>
  </>;
}

export function SectionTitle({ eyebrow, title, text }) {
  return <div className="section-title"><span>{eyebrow}</span><h2>{title}</h2>{text && <p>{text}</p>}</div>;
}
export function Badge({ children }) { return <span className={`badge ${String(children).toLowerCase().replaceAll(" ", "-")}`}>{children}</span>; }

// New products are automatically marked as "New Arrival" for ten days from
// their original database upload time. No scheduled job or manual cleanup is needed.
const NEW_ARRIVAL_DAYS = 10;
const NEW_ARRIVAL_DURATION_MS = NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000;

export function isNewArrival(item, now = Date.now()) {
  const createdAt = Date.parse(item?.created_at || "");
  return Number.isFinite(createdAt) && now >= createdAt && now < createdAt + NEW_ARRIVAL_DURATION_MS;
}

function newArrivalDaysRemaining(item, now = Date.now()) {
  if (!isNewArrival(item, now)) return 0;
  const createdAt = Date.parse(item.created_at);
  return Math.max(1, Math.ceil((createdAt + NEW_ARRIVAL_DURATION_MS - now) / (24 * 60 * 60 * 1000)));
}


const APPLIANCE_BRANDS = ["Haier", "BPL", "Wybor", "Better", "PD Express", "Samsung", "Other"];
const COMMON_COLORS = ["White", "Black", "Silver", "Grey", "Red", "Blue", "Green", "Brown", "Gold", "Maroon", "Orange", "Yellow"];
const WASH_PROGRAM_OPTIONS = ["Quick wash", "Normal wash", "Heavy wash", "Delicate", "Wool", "Cotton", "Eco wash", "Rinse", "Spin", "Tub clean"];
// Each admin role only sees the statuses that make sense for its listings.
// Internal values stay snake_case everywhere; only the label is formatted for display.
const STATUS_OPTIONS_BY_ROLE = {
  store_admin: [
    ["draft", "Draft"], ["available", "Available"], ["reserved", "Reserved"],
    ["sold", "Sold"], ["coming_soon", "Coming soon"], ["out_of_stock", "Out of stock"]
  ],
  real_estate_admin: [
    ["draft", "Draft"], ["available", "Available"], ["reserved", "Reserved"],
    ["sold", "Sold"], ["rented", "Rented"], ["coming_soon", "Coming soon"]
  ],
  motors_admin: [
    ["draft", "Draft"], ["available", "Available"], ["reserved", "Reserved"],
    ["sold", "Sold"], ["coming_soon", "Coming soon"]
  ]
};
const PRODUCT_STOCK_LOCATIONS = ["Warehouse", "PD Express Store 1", "PD Express Store 2"];
const STOCK_MOVEMENT_TYPES = ["Opening Stock", "New Stock Received", "Sold", "Transferred to Store 2", "Damaged", "Returned", "Adjusted"];
const ENERGY_RATING_FIELD = { key: "Energy rating", label: "Energy rating", type: "stars", max: 5 };
const SPEC_FIELD_CONFIGS = {
  "Refrigerators": [
    { key: "Capacity (L)", label: "Capacity", placeholder: "e.g. 190", suffix: "Litres" },
    { key: "Door type", label: "Door type", type: "select", options: ["Single door", "Double door", "Triple door", "4 door", "Side-by-side door", "French door"] },
    { key: "Cooling type", label: "Cooling type", type: "select", options: ["Direct Cool", "Frost Free", "Other"] },
    { key: "Inverter compressor", label: "Inverter compressor", type: "select", options: ["Yes", "No"] },
    { key: "Convertible Features", label: "Convertible Features", type: "select", options: ["Convertible", "Magic convertible", "Non-convertible"] },
    { key: "WiFi", label: "WiFi", type: "select", options: ["Yes", "No"] },
    ENERGY_RATING_FIELD
  ],
  "Washing Machines": [
    { key: "Capacity (KG)", label: "Capacity", placeholder: "e.g. 6.5", suffix: "KG" },
    { key: "Machine type", label: "Machine type", type: "select", options: ["Fully Automatic", "Semi-Automatic", "Washer Dryer"] },
    { key: "Loading type", label: "Loading type", type: "select", options: ["Top Load", "Front Load"] },
    { key: "Motor type", label: "Motor type", type: "select", options: ["Inverter motor", "Direct drive motor", "Standard motor"] },
    { key: "Wash programmes", label: "Wash Program", type: "multi", options: WASH_PROGRAM_OPTIONS, placeholder: "Add another wash program, e.g. Baby care", description: "Select or add every wash program available for this washing machine." },
    { key: "Child lock", label: "Child Lock", type: "select", options: ["Yes", "No"] },
    { key: "Dryer function", label: "Dryer function", type: "select", options: ["Wash and spin", "Fully wash and dry"] },
    { key: "WiFi", label: "WiFi", type: "select", options: ["Yes", "No"] },
    { key: "AI Function", label: "AI Function", type: "select", options: ["Yes", "No"] },
    ENERGY_RATING_FIELD
  ],
  "Televisions & Displays": [
    { key: "Screen size", label: "Screen size", placeholder: "e.g. 43", suffix: "Inches" },
    { key: "Resolution", label: "Resolution", type: "select", options: ["HD Ready", "Full HD", "4K UHD", "8K", "Other"] },
    { key: "TV type", label: "Select TV", type: "select", options: ["Smart TV", "Android TV", "Google TV with voice control", "LED TV", "QLED TV", "OLED TV"] },
    { key: "Storage", label: "Storage", placeholder: "e.g. 8 GB" },
    { key: "Wi-Fi", label: "Wi-Fi", type: "select", options: ["Yes", "No"] },
    { key: "Bluetooth", label: "Bluetooth", type: "select", options: ["Yes", "No"] },
    { key: "Wall mount included", label: "Wall mount included", type: "select", options: ["Yes", "No"] },
    ENERGY_RATING_FIELD
  ],
  "Air Conditioners": [
    { key: "Tonnage", label: "Tonnage", placeholder: "e.g. 1.5 Ton" },
    { key: "Inverter type", label: "Inverter type", type: "select", options: ["Inverter", "Non-Inverter"] },
    { key: "Cooling mode", label: "Cooling mode", type: "select", options: ["Cooling Only", "Hot & Cold"] },
    { key: "Room size recommendation", label: "Recommended room size", placeholder: "e.g. 150–200 sq ft" },
    { key: "Refrigerant type", label: "Refrigerant type", placeholder: "e.g. R32" },
    ENERGY_RATING_FIELD
  ],
  "Kitchen Appliances": [
    { key: "Capacity (L)", label: "Capacity", placeholder: "e.g. 25", suffix: "Litres" },
    { key: "Wattage", label: "Wattage", placeholder: "e.g. 1500 W" },
    { key: "Appliance type", label: "Appliance type", type: "select", options: ["Microwave Oven", "OTG", "Air Fryer"] },
    { key: "Control type", label: "Control type", type: "select", options: ["Digital", "Manual", "Touch"] },
    ENERGY_RATING_FIELD
  ],
  "Cooling & Commercial": [
    { key: "Capacity", label: "Capacity", placeholder: "e.g. 300 L" },
    { key: "Door/top type", label: "Door / top type", type: "select", options: ["Glass Top", "Hard Top", "Single Door", "Double Door", "Single glass door", "Double glass door"] },
    { key: "Cooling type", label: "Cooling type", type: "multi", options: ["Freezer", "Freeze", "Normal cooling", "Chill"], placeholder: "Add another cooling type, e.g. Beverage cooling", description: "Select every cooling type this product comes in." },
    { key: "Shelves/Baskets", label: "Shelves / baskets", placeholder: "e.g. 3 baskets" },
    { key: "Convertible", label: "Convertible", type: "select", options: ["Yes", "No"] },
    ENERGY_RATING_FIELD
  ],
  "Water Appliances": [
    { key: "Functions", label: "Functions", type: "select", options: ["Hot / Cold", "Hot / Cold / Normal", "Cold Only"] },
    { key: "Storage cabinet", label: "Storage cabinet", type: "select", options: ["Yes", "No"] },
    ENERGY_RATING_FIELD
  ],
  "Other Appliances": [
    { key: "Main feature", label: "Main feature", placeholder: "Main customer benefit" },
    { key: "Size", label: "Size", placeholder: "e.g. Medium" },
    { key: "Compatibility", label: "Compatibility", placeholder: "Compatible model or appliance" },
    ENERGY_RATING_FIELD
  ]
};
const REMOVED_SPEC_KEYS_BY_CATEGORY = {
  "*": ["Brand new", "Dimension", "Dimensions"],
  "Washing Machines": ["Spin speed"],
  "Televisions & Displays": ["Operating system", "RAM", "HDMI", "HDMI ports", "USB", "USB ports"],
  "Air Conditioners": ["BTU"],
  "Kitchen Appliances": ["Cooking preset", "Cooking presets", "Presets", "Temperature range", "Timer"],
  "Cooling & Commercial": ["Temperature range", "Lock"],
  "Water Appliances": ["Loading type", "Child lock", "Heating capacity", "Cooling capacity"]
};
function parseJsonField(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return fallback; }
}
function specsFor(item) { return parseJsonField(item?.specifications_json || item?.specification_json, {}); }
function variantsFor(item) { return parseJsonField(item?.product_variants, []); }
function movementsFor(item) { return parseJsonField(item?.inventory_movements, []); }
function normalizeSpecKey(key) { return String(key || "").trim().toLowerCase(); }
function hiddenSpecKeysFor(category) {
  const common = REMOVED_SPEC_KEYS_BY_CATEGORY["*"] || [];
  const categorySpecific = REMOVED_SPEC_KEYS_BY_CATEGORY[category] || [];
  return new Set([...common, ...categorySpecific].map(normalizeSpecKey));
}
function isVisibleProductSpec(item, key) {
  return !hiddenSpecKeysFor(item?.category).has(normalizeSpecKey(key));
}
function normalizeListValue(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}
function formatSpecValue(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).join(", ");
  return String(value ?? "").trim();
}
export function productIsHiddenFromStore(item) {
  return item?.category === REMOVED_APPLIANCE_CATEGORY;
}
function specFieldConfigFor(category, key) {
  const target = normalizeSpecKey(key);
  return (SPEC_FIELD_CONFIGS[category] || []).find((field) => normalizeSpecKey(field.key) === target);
}
function cleanProductSpecs(item) {
  return Object.fromEntries(Object.entries(specsFor(item))
    .filter(([key, value]) => isVisibleProductSpec(item, key) && formatSpecValue(value) !== "")
    .map(([key, value]) => {
      const fieldConfig = specFieldConfigFor(item?.category, key);
      return [key, fieldConfig?.type === "multi" ? normalizeListValue(value) : value];
    }));
}

// One simple stock source for every product. Variants are no longer used for stock.
function productTotalStock(item) {
  const raw = item?.total_stock ?? item?.stock ?? item?.closing_stock ?? item?.available_stock ?? 0;
  return Math.max(0, Number(raw) || 0);
}
function productSoldQuantity(item) {
  return Math.max(0, Number(item?.sold_quantity ?? item?.sold ?? 0) || 0);
}
function hasStockTracking(item) {
  return ["total_stock", "stock", "closing_stock", "available_stock", "sold_quantity", "sold"].some(key => item?.[key] !== undefined && item?.[key] !== null && item?.[key] !== "");
}
function productAvailableStock(item) {
  return Math.max(0, productTotalStock(item) - productSoldQuantity(item));
}
function productIsOutOfStock(item) {
  // When stock fields exist, calculated stock is the source of truth, not an old saved status.
  if (hasStockTracking(item)) return productAvailableStock(item) <= 0;
  return normalizeStatus(item?.status) === "out_of_stock";
}
function productAvailabilityLabel(item) {
  // An explicit non-stock status (draft/reserved/sold/coming_soon) always wins over the
  // stock-derived Available/Out of Stock label - stock tracking should not hide it.
  const status = normalizeStatus(item?.status);
  if (status && !["available", "out_of_stock"].includes(status)) return titleStatus(status);
  if (hasStockTracking(item)) return productIsOutOfStock(item) ? "Out of Stock" : "Available";
  return titleStatus(item?.status);
}
function getMainSpec(item) {
  const specs = specsFor(item);
  const mainSpecKey = SUBCATEGORY_SPEC_KEY[item?.category];
  const mainSpecValue = mainSpecKey ? formatSpecValue(specs[mainSpecKey]) : "";
  const parts = [
    specs["Capacity (L)"],
    specs["Capacity (KG)"],
    specs["Screen size"],
    specs["Tonnage"],
    mainSpecValue || item?.subcategory
  ].map(formatSpecValue).filter(Boolean);
  return parts.slice(0, 2).join(" · ");
}
function stringifySpecs(item) {
  const specs = specsFor(item);
  const structured = Object.entries(specs)
    .filter(([key, value]) => isVisibleProductSpec(item, key) && formatSpecValue(value) !== "");
  return structured.map(([key, value]) => `${key}: ${formatSpecValue(value)}`).join("; ");
}

function enquiryPriceLine(item, kind) {
  if (kind === "vehicle" || kind === "product") {
    const { base, discount, final, afterGst } = kind === "vehicle" ? vehiclePricing(item) : productPricing(item);
    if (!base) return "Price: Price on request";
    return `Price: ${money(discount > 0 ? final : afterGst)}${discount > 0 ? ` (${discount}% off)` : ""}`;
  }
  return `Price: ${money(item.price)}`;
}

function buildEnquiryMessage(item, kind, title) {
  const kindLabel = kind === "product" ? "product" : kind === "vehicle" ? "vehicle" : "property";
  const lines = [`Hello PD Express, I am interested in this ${kindLabel}:`, "", `Name: ${title}`];

  if (kind === "product") {
    if (item.category) lines.push(`Category: ${item.category}${item.subcategory ? ` / ${item.subcategory}` : ""}`);
    if (item.brand) lines.push(`Brand: ${item.brand}`);
    if (item.model_number) lines.push(`Model: ${item.model_number}`);
    lines.push(enquiryPriceLine(item, kind));
    const structuredSpecs = stringifySpecs(item);
    if (structuredSpecs) lines.push(`Specifications: ${structuredSpecs}`);
    if (item.specifications) lines.push(`Extra notes: ${item.specifications}`);
    if (item.description) lines.push(`Description: ${item.description}`);
  } else if (kind === "vehicle") {
    const vehicleName = `${item.brand || ""} ${item.model || ""}`.trim();
    if (vehicleName) lines.push(`Vehicle: ${vehicleName}`);
    const year = item.manufacture_date ? new Date(`${item.manufacture_date}T00:00:00`).getFullYear() : item.year;
    if (year) lines.push(`Year: ${year}`);
    if (item.mileage) lines.push(`Mileage: ${Number(item.mileage).toLocaleString()} km`);
    if (item.fuel_type) lines.push(`Fuel type: ${item.fuel_type}`);
    if (item.vehicle_condition || item.product_condition) lines.push(`Condition: ${item.vehicle_condition || item.product_condition}`);
    if (item.warranty_period) lines.push(`Warranty: ${item.warranty_period}`);
    lines.push(enquiryPriceLine(item, kind));
    if (item.specifications) lines.push(`Specifications: ${item.specifications}`);
    if (item.description) lines.push(`Description: ${item.description}`);
  } else {
    if (item.property_type) lines.push(`Type: ${item.property_type}`);
    if (item.location) lines.push(`Location: ${item.location}`);
    if (item.area) lines.push(`Area: ${item.area}`);
    if (item.ownership_type) lines.push(`Ownership: ${item.ownership_type}`);
    if (item.registration_status) lines.push(`Registration: ${item.registration_status}`);
    if (item.road_access) lines.push(`Road access: ${item.road_access}`);
    if (item.water_connection) lines.push(`Water: ${item.water_connection}`);
    if (item.electricity_connection) lines.push(`Electricity: ${item.electricity_connection}`);
    if (item.property_condition) lines.push(`Condition: ${item.property_condition}`);
    lines.push(enquiryPriceLine(item, kind));
    if (item.description) lines.push(`Description: ${item.description}`);
  }

  lines.push("", "Could you please confirm availability and share more details?");
  return lines.join("\n");
}

function LoadMessage() {
  const { loading, error } = useData();
  if (loading) return <div className="empty"><Loader2 className="spin" /> Loading live listings…</div>;
  if (error) return <div className="empty">{error}</div>;
  return null;
}

function PhotoCount({ count, onClick }) {
  if (count <= 1) return null;
  return <button type="button" className="photo-count" onClick={onClick}><Camera size={14} /> {count} photos</button>;
}

function GalleryModal({ item, kind, onClose }) {
  const images = getImages(item);
  const allImages = images.length ? images : [imageFallback(kind)];
  const [index, setIndex] = useState(0);
  const title = item.name || item.title || `${item.brand || ""} ${item.model || ""}`;
  const previous = () => setIndex((index - 1 + allImages.length) % allImages.length);
  const next = () => setIndex((index + 1) % allImages.length);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return <div className="gallery-backdrop" onMouseDown={onClose}>
    <section className="gallery-modal" onMouseDown={(e) => e.stopPropagation()}>
      <button className="gallery-close" onClick={onClose} aria-label="Close gallery"><X /></button>
      <div className="gallery-image-wrap">
        {allImages.length > 1 && <button className="gallery-arrow left" onClick={previous}><ChevronLeft /></button>}
        <img src={allImages[index]} alt={`${title} ${index + 1}`} />
        {allImages.length > 1 && <button className="gallery-arrow right" onClick={next}><ChevronRight /></button>}
        <span className="gallery-number">{index + 1} / {allImages.length}</span>
      </div>
      <div className="gallery-details">
        <div>
          <div className="gallery-badges">
            <Badge>{kind === "product" ? productAvailabilityLabel(item) : titleStatus(item.status)}</Badge>
            {kind === "product" && isNewArrival(item) && <Badge>New Arrival</Badge>}
          </div>
          <h2>{title}</h2>
          <p>{kind === "product" ? item.category : kind === "property" ? `${item.location || ""} · ${item.area || ""}` : `${item.manufacture_date ? new Date(`${item.manufacture_date}T00:00:00`).getFullYear() : item.year || ""} · ${item.mileage || ""} km · ${item.fuel_type || ""}`}</p>
          {kind === "vehicle" ? <VehiclePrice item={item} /> : kind === "product" ? <ProductPrice item={item} /> : <strong>{money(item.price)}</strong>}
          <ListingDetails item={item} kind={kind} />
          {kind === "property" && <div className="gallery-location-action"><DirectionsButton url={propertyMapUrl(item)} label="View property location" /></div>}
        </div>
        <a className="btn primary" href={`${WHATSAPP_URL}?text=${encodeURIComponent(`Hello PD Express, I am interested in ${title}.`)}`} target="_blank" rel="noreferrer">Chat on WhatsApp <MessageCircle size={18} /></a>
      </div>
      {allImages.length > 1 && <div className="gallery-thumbs">
        {allImages.map((url, thumbIndex) => <button key={`${url}-${thumbIndex}`} className={thumbIndex === index ? "active" : ""} onClick={() => setIndex(thumbIndex)}>
          <img src={url} alt={`Thumbnail ${thumbIndex + 1}`} />
        </button>)}
      </div>}
    </section>
  </div>;
}


function ListingDetails({ item, kind }) {
  const fields = kind === "product"
    ? [
        ["Brand", item.brand], ["Model", item.model_number],
        ["Subcategory", item.subcategory], ["Colors", (item.colors || []).join(", ")], ["Specifications", stringifySpecs(item)], ["Extra notes", item.specifications], ["Description", item.description]
      ]
    : kind === "vehicle"
      ? [
        ["Condition", item.vehicle_condition || item.product_condition], ["Colors", (item.colors || []).join(", ")], ["Warranty", item.warranty_period],
        ["Warranty details", item.warranty_details], ["Key specifications", item.specifications],
        ["Description", item.description]
      ]
      : [
        ["Ownership type", item.ownership_type], ["Registration", item.registration_status],
        ["Road access", item.road_access], ["Water", item.water_connection],
        ["Electricity", item.electricity_connection], ["Condition", item.property_condition],
        ["Description", item.description]
      ];
  const visible = fields.filter(([, value]) => value);
  const energyRating = kind === "product" ? Number(specsFor(item)["Energy rating"] || 0) : 0;
  if (!visible.length && !energyRating) return null;
  return <div className="gallery-extra-details">{visible.map(([label, value]) => <p key={label}><b>{label}:</b> {value}</p>)}{energyRating > 0 && <p className="rating-detail"><b>Energy rating:</b> <StarRating value={energyRating} label="Energy rating" /></p>}</div>;
}

function ListingImage({ item, kind, onOpen }) {
  const images = getImages(item);
  const first = images[0] || imageFallback(kind);
  return <div className="listing-image">
    <button type="button" className="image-open" onClick={onOpen} aria-label="Open image gallery">
      <img src={first} alt={item.name || item.title || `${item.brand || ""} ${item.model || ""}`} />
    </button>
    <PhotoCount count={images.length} onClick={onOpen} />
  </div>;
}

function Enquire({ title }) {
  return <a className="card-enquire" href={`${WHATSAPP_URL}?text=${encodeURIComponent(`Hello PD Express, I am interested in ${title}.`)}`} target="_blank" rel="noreferrer">
    Ask about this listing <MessageCircle size={15} />
  </a>;
}

function StarRating({ value = 0, max = 5, interactive = false, onChange, label = "Rating" }) {
  const rating = Math.max(0, Math.min(max, Number(value) || 0));
  return <div className={`star-rating ${interactive ? "interactive" : ""}`} role={interactive ? "radiogroup" : "img"} aria-label={`${label}: ${rating} out of ${max}`}>
    {Array.from({ length: max }, (_, index) => {
      const active = index < rating;
      return interactive ? <button type="button" key={index} className={active ? "active" : ""} onClick={() => onChange?.(index + 1)} aria-label={`${index + 1} stars`}><Star size={20} fill={active ? "currentColor" : "none"} /></button> : <Star key={index} className={active ? "active" : ""} size={17} fill={active ? "currentColor" : "none"} />;
    })}
    {!interactive && rating > 0 && <span className="star-rating-number">{rating}/{max}</span>}
  </div>;
}

function FlipListingCard({ item, kind, onOpen }) {
  const title = item.name || item.title || `${item.brand || ""} ${item.model || ""}`.trim();
  const images = getImages(item);
  const first = images[0] || imageFallback(kind);
  const vehicleYear = item.manufacture_date ? new Date(`${item.manufacture_date}T00:00:00`).getFullYear() : item.year;
  const pricing = kind === "product" ? productPricing(item) : kind === "vehicle" ? vehiclePricing(item) : null;
  const discount = pricing?.base ? Number(pricing.discount || 0) : 0;
  const openDetails = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpen?.();
  };

  // One short, kind-specific fact beneath the title - not a full spec dump.
  const meta = kind === "product"
    ? (getMainSpec(item) || item.category || "")
    : kind === "property"
      ? [item.location, item.area].filter(Boolean).join(" · ")
      : [vehicleYear, item.mileage ? `${Number(item.mileage).toLocaleString()} km` : "", item.fuel_type].filter(Boolean).join(" · ");

  return <article
    className="shop-card"
    tabIndex="0"
    role="link"
    aria-label={`View details for ${title}`}
    onClick={openDetails}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") openDetails(event); }}
  >
    <div className="shop-card-media">
      <img src={first} alt={title} loading="lazy" onError={(event) => handleImageError(event, kind)} />
      {discount > 0 && <span className="shop-card-off">{discount}% OFF</span>}
      {kind === "product" && isNewArrival(item) && <span className="shop-card-new"><Sparkles size={12} /> New Arrival</span>}
      {images.length > 1 && <span className="shop-card-photos"><Camera size={13} /> {images.length}</span>}
    </div>
    <div className="shop-card-body">
      <h3 className="shop-card-title">{title}</h3>
      {meta && <p className="shop-card-meta">{kind === "property" && <MapPin size={13} />}{meta}</p>}
      <div className="shop-card-foot">
        <span className="shop-card-price">
          {kind === "property"
            ? (item.price ? money(item.price) : "Price on request")
            : pricing?.base ? money(pricing.final) : "Price on request"}
          {discount > 0 && <span className="shop-card-mrp">{money(pricing.afterGst)}</span>}
        </span>
        <Badge>{kind === "product" ? productAvailabilityLabel(item) : titleStatus(item.status)}</Badge>
      </div>
      <button type="button" className="shop-card-btn" onClick={openDetails} tabIndex="-1">View details</button>
    </div>
  </article>;
}

export function useDetailNavigation() {
  const navigate = useNavigate();
  return (kind, id) => navigate(`/listing/${kind}/${id}`);
}

export function ProductCard({ item }) {
  const goToDetail = useDetailNavigation();
  return <FlipListingCard item={item} kind="product" onOpen={() => goToDetail("product", item.id)} />;
}

export function PropertyCard({ item }) {
  const goToDetail = useDetailNavigation();
  return <FlipListingCard item={item} kind="property" onOpen={() => goToDetail("property", item.id)} />;
}

export function VehicleCard({ item }) {
  const goToDetail = useDetailNavigation();
  return <FlipListingCard item={item} kind="vehicle" onOpen={() => goToDetail("vehicle", item.id)} />;
}

function NewArrivals({ products, properties, vehicles }) {
  const goToDetail = useDetailNavigation();
  const all = [
    ...products.filter(x => !productIsHiddenFromStore(x) && isNewArrival(x)).map((x) => ({ ...x, kind: "product", source: "PDExpress Store" })),
    ...properties.filter(x => isNewArrival(x)).map((x) => ({ ...x, kind: "property", source: "Real Estate" })),
    ...vehicles.filter(x => isNewArrival(x)).map((x) => ({ ...x, kind: "vehicle", source: "PD Motors" })),
  ].sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0,3);
  if(!all.length) return <div className="coming-empty"><Sparkles size={24}/> No listings have been uploaded in the last {NEW_ARRIVAL_DAYS} days.</div>;
  return <div className="listing-grid">{all.map((item)=><FlipListingCard key={`${item.kind}-${item.id}`} item={item} kind={item.kind} onOpen={()=>goToDetail(item.kind, item.id)} />)}</div>;
}

function ListingDetailPage() {
  const { kind, id } = useParams();
  const navigate = useNavigate();
  const { products, properties, vehicles, branches, loading } = useData();
  const records = kind === "product" ? products.filter((item) => !productIsHiddenFromStore(item)) : kind === "property" ? properties : vehicles;
  const item = records.find((x) => String(x.id) === String(id));
  const branch = branches.find((b) => b.slug === BRANCH_SLUG_FOR_KIND[kind]);
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [id, kind]);
  if (loading) return <section className="container detail-page"><div className="empty"><Loader2 className="spin"/> Loading listing…</div></section>;
  if (!item) return <section className="container detail-page"><div className="detail-not-found"><h1>Listing not found</h1><p>This listing may have been removed or the link is no longer valid.</p><button className="btn primary" onClick={() => navigate(kind === "product" ? "/store" : kind === "property" ? "/real-estate" : "/motors")}>Back to listings</button></div></section>;

  const images = getImages(item);
  const allImages = images.length ? images : [imageFallback(kind)];
  const title = item.name || item.title || `${item.brand || ""} ${item.model || ""}`.trim();
  const previous = () => setIndex((index - 1 + allImages.length) % allImages.length);
  const next = () => setIndex((index + 1) % allImages.length);
  const returnPath = kind === "product" ? "/store" : kind === "property" ? "/real-estate" : "/motors";

  return <section className="container detail-page">
    <button className="detail-back" onClick={() => navigate(returnPath)}>← Back to listings</button>
    <div className="detail-page-shell">
      <div className="detail-gallery">
        <div className="detail-main-image">
          {allImages.length > 1 && <button className="detail-gallery-arrow left" onClick={previous} aria-label="Previous image"><ChevronLeft /></button>}
          <img key={index} src={allImages[index]} alt={`${title} ${index + 1}`} onError={(event) => handleImageError(event, kind)} />
          {allImages.length > 1 && <button className="detail-gallery-arrow right" onClick={next} aria-label="Next image"><ChevronRight /></button>}
          {allImages.length > 1 && <span className="detail-image-count">{index + 1} / {allImages.length}</span>}
        </div>
        {allImages.length > 1 && <div className="detail-thumbnails">{allImages.map((url, imageIndex) => <button key={`${url}-${imageIndex}`} className={index === imageIndex ? "active" : ""} onClick={() => setIndex(imageIndex)}><img src={url} alt={`${title} thumbnail ${imageIndex + 1}`} onError={(event) => handleImageError(event, kind)} /></button>)}</div>}
        {kind === "vehicle" && item.video_url && <div className="detail-video"><video src={item.video_url} controls playsInline className="detail-video-player">Your browser does not support embedded videos.</video></div>}
      </div>
      <aside className="detail-information">
        <div className="gallery-badges"><Badge>{kind === "product" ? productAvailabilityLabel(item) : titleStatus(item.status)}</Badge>{kind === "product" && isNewArrival(item) && <Badge>New Arrival</Badge>}</div>
        <span className="detail-category">{kind === "product" ? `${item.category || ""}${item.subcategory ? ` · ${item.subcategory}` : ""}` : kind === "property" ? item.property_type : item.brand}</span>
        <h1>{title}</h1>
        {kind === "product" ? <ProductPrice item={item} /> : kind === "vehicle" ? <VehiclePrice item={item} /> : <strong className="detail-price">{money(item.price)}</strong>}
        {kind === "product" && Number(specsFor(item)["Energy rating"] || 0) > 0 && <div className="detail-rating"><b>Energy rating</b><StarRating value={Number(specsFor(item)["Energy rating"])} label="Energy rating" /></div>}
        {kind === "product" && <div className="detail-stock"><span>Sold <b>{item.sold_quantity || 0}</b></span><span>Available <b>{productAvailableStock(item)}</b></span></div>}
        <ListingDetails item={item} kind={kind} />
        {kind === "property" && <DirectionsButton url={propertyMapUrl(item)} label="View property location" />}
        <a className="btn primary detail-enquire" href={whatsAppLinkForBranch(branch, buildEnquiryMessage(item, kind, title))} target="_blank" rel="noreferrer">Chat on WhatsApp <MessageCircle size={18}/></a>
      </aside>
    </div>
  </section>;
}


function ComingSoonSlider({ products, vehicles }) {
  const goToDetail = useDetailNavigation();
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  const upcoming = [
    ...products.filter(item => !productIsHiddenFromStore(item) && normalizeStatus(item.status) === "coming_soon").map(item => ({ ...item, source: "Store", kind: "product" })),
    ...vehicles.filter(item => normalizeStatus(item.status) === "coming_soon").map(item => ({ ...item, source: "PD Motors", kind: "vehicle" }))
  ];

  const onScroll = () => {
    const track = trackRef.current;
    const item = track?.querySelector(".coming-banner-item");
    if (!track || !item) return;
    const step = item.getBoundingClientRect().width + 22;
    setActive(Math.max(0, Math.min(upcoming.length - 1, Math.round(track.scrollLeft / step))));
  };

  if (!upcoming.length) {
    return <div className="coming-empty"><Sparkles size={20} /> No coming-soon listings have been added yet.</div>;
  }

  return <div className="coming-banner">
    <div className="coming-banner-track" ref={trackRef} onScroll={onScroll}>
      {upcoming.map(item => <UpcomingBanner key={`${item.source}-${item.id}`} item={item} onOpen={() => goToDetail(item.kind, item.id)} />)}
    </div>
    <SwipeDots count={upcoming.length} activeIndex={active} className="coming-swipe-dots" />
    {upcoming.length > 1 && <p className="mobile-swipe-note">Swipe left or right to view more listings.</p>}
  </div>;
}

function UpcomingBanner({ item, onOpen }) {
  const isStore = item.kind === "product";
  const title = item.name || item.title || `${item.brand || ""} ${item.model || ""}`.trim();
  const year = item.manufacture_date ? new Date(`${item.manufacture_date}T00:00:00`).getFullYear() : item.year;
  const detailText = isStore
    ? (item.category || "New product arriving soon")
    : `${year || ""}${year ? " · " : ""}${item.fuel_type || "New vehicle arriving soon"}`;
  const image = getImages(item)[0] || imageFallback(item.kind);

  return <button type="button" className={`coming-banner-item ${isStore ? "store-upcoming" : "motors-upcoming"}`} onClick={onOpen} aria-label={`View ${title}`}>
    <img src={image} alt={title} />
    <span className="coming-banner-scrim" />
    <span className="coming-banner-source">{isStore ? <ShoppingBag size={14} /> : <CarFront size={14} />}{item.source}</span>
    <span className="coming-banner-status">Coming soon</span>
    <span className="coming-banner-info">
      <span className="coming-banner-type">{isStore ? "STORE PRODUCT" : "PD MOTORS"}</span>
      <span className="coming-banner-title">{title}</span>
      <span className="coming-banner-detail">{detailText}</span>
      <span className="coming-banner-price">{money(item.price)}</span>
      <span className="coming-banner-cta">View details <ArrowRight size={15} /></span>
    </span>
  </button>;
}


function TypewriterTrustLine() {
  const phrase = "Trust for tomorrow.";
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let delay = deleting ? 54 : 92;

    if (!deleting && text === phrase) {
      delay = 1500;
    } else if (deleting && text === "") {
      delay = 420;
    }

    const timer = window.setTimeout(() => {
      if (!deleting && text === phrase) {
        setDeleting(true);
        return;
      }

      if (deleting && text === "") {
        setDeleting(false);
        return;
      }

      setText((current) => deleting ? current.slice(0, -1) : phrase.slice(0, current.length + 1));
    }, delay);

    return () => window.clearTimeout(timer);
  }, [text, deleting]);

  return <em className="hero-typewriter" aria-label={phrase}>
    <span aria-hidden="true">{text}</span><span className="hero-typewriter-caret" aria-hidden="true" />
  </em>;
}

// Home hero slideshow. Drop images named hero-slide-1.jpg … hero-slide-5.jpg
// into public/ (recommended 1920x1080 or wider). Missing files are skipped
// automatically; if none exist, the bundled homepage background is used.
const HERO_SLIDES = ["/hero-slide-1.jpg", "/hero-slide-2.jpg", "/hero-slide-3.jpg", "/hero-slide-4.jpg", "/hero-slide-5.jpg"];
const HERO_SLIDE_FALLBACK = "/background-for-homepage.webp";
const HERO_SLIDE_INTERVAL_MS = 5000;

function PublicHeroBackground() {
  const [slides, setSlides] = useState(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all(HERO_SLIDES.map((src) => new Promise((resolve) => {
      const probe = new window.Image();
      probe.onload = () => resolve(src);
      probe.onerror = () => resolve(null);
      probe.src = src;
    }))).then((loaded) => {
      if (cancelled) return;
      const available = loaded.filter(Boolean);
      setSlides(available.length ? available : [HERO_SLIDE_FALLBACK]);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!slides || slides.length < 2) return;
    const timer = window.setTimeout(() => setActive((current) => (current + 1) % slides.length), HERO_SLIDE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [slides, active]);

  const goTo = (index) => { if (slides) setActive((index + slides.length) % slides.length); };

  return <>
    <div className="static-hero-media" aria-hidden="true">
      {slides && <div className="hero-slide-track" style={{ transform: `translateX(-${active * 100}%)` }}>
        {slides.map((src) => <img className="hero-slide" key={src} src={src} alt="" />)}
      </div>}
      <div className="static-hero-overlay" />
    </div>
    {slides && slides.length > 1 && <div className="hero-slider-controls">
      <div className="hero-slider-dots">
        {slides.map((src, index) => <button type="button" key={src} className={index === active ? "active" : ""} onClick={() => goTo(index)} aria-label={`Go to slide ${index + 1}`} />)}
      </div>
      <div className="hero-slider-arrows">
        <button type="button" className="hero-slider-arrow" onClick={() => goTo(active - 1)} aria-label="Previous slide"><ChevronLeft size={20} /></button>
        <button type="button" className="hero-slider-arrow" onClick={() => goTo(active + 1)} aria-label="Next slide"><ChevronRight size={20} /></button>
      </div>
    </div>}
  </>;
}

const SERVICES = [
  {
    key: "real-estate",
    icon: <Building2 />,
    label: "REAL ESTATE",
    heading: "PDEXPRESS Real Estate",
    intro: "At PDEXPRESS Real Estate, we are committed to transforming land into valuable opportunities. Our goal is to make land development simple, transparent, and hassle-free for every landowner and buyer.",
    groups: [
      {
        title: "Our services include",
        items: [
          "Land development and planning",
          "Road construction and connectivity",
          "Land subdivision and plot planning",
          "Relocation of irrigation channels and utility services when required",
          "Assistance with all necessary approvals and documentation",
          "Land transaction support from start to finish",
          "Lhakhram processing, with completion targeted within 35 days (subject to government approval)",
        ],
      },
    ],
    outro: [
      "We believe that every piece of land has the potential to become a thriving community. With experienced planning, quality development, and reliable service, we help unlock that potential while ensuring a smooth and efficient process for our clients.",
      "At PDEXPRESS Real Estate, we don't just develop land—we create opportunities, connect communities, and build a better future.",
    ],
  },
  {
    key: "warranty-delivery",
    icon: <ShieldCheck />,
    label: "STORE",
    heading: "Warranty & Delivery",
    intro: "At PDEXPRESS Stores, we are committed to providing genuine products with reliable warranty support and dependable nationwide delivery.",
    groups: [
      {
        title: "Warranty",
        items: [
          "All products are covered by the official manufacturer's warranty.",
          "During the warranty period, defective parts covered under the warranty will be replaced free with genuine parts in accordance with the manufacturer's warranty policy.",
          "We provide prompt after-sales support to ensure customer satisfaction.",
        ],
      },
      {
        title: "Delivery",
        items: [
          "Free delivery to Thimphu, Paro, Wangdue Phodrang, Punakha, Chukha, Phuentsholing, and Tsirang.",
          "Delivery is available to all 20 Dzongkhags across Bhutan.",
          "For deliveries to other Dzongkhags outside our free delivery areas, a nominal delivery charge of Nu. 500 applies.",
        ],
      },
    ],
    outro: [
      "At PDEXPRESS Stores, we don't just sell products—we are committed to supporting our customers with trusted warranty service and reliable delivery across Bhutan.",
    ],
  },
];

function ServiceCard({ service, delay }) {
  let itemCount = 0;
  return <Reveal delay={delay}>
    <article className={`static-service-card static-service-card-${service.key}`}>
      <div className="static-service-media">
        <div className="static-service-icon">{service.icon}</div>
        <span className="static-card-label">{service.label}</span>
        <h3>{service.heading}</h3>
      </div>
      <div className="static-service-body">
        <p>{service.intro}</p>
        {service.groups.map((group) => <div className="static-service-group" key={group.title}>
          <h4>{group.title}</h4>
          <ul>{group.items.map((item) => { const i = itemCount++; return <li key={item} style={{ "--i": i }}>{item}</li>; })}</ul>
        </div>)}
        <div className="static-service-outro">{service.outro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
      </div>
    </article>
  </Reveal>;
}

function ServicesSection() {
  return <section className="static-services-section">
    <div className="static-services-glow static-services-glow-a" />
    <div className="static-services-glow static-services-glow-b" />
    <div className="container">
      <Reveal>
        <div className="static-intro-heading">
          <span className="eyebrow">OUR SERVICES</span>
          <h2>Support that goes beyond the sale.</h2>
          <p>Here's what PDEXPRESS Real Estate and PDEXPRESS Store commit to for every customer.</p>
        </div>
      </Reveal>
      <div className="static-services-grid">
        {SERVICES.map((service, index) => <ServiceCard key={service.key} service={service} delay={index * 120} />)}
      </div>
    </div>
  </section>;
}

function Home() {
  const { products, properties, vehicles } = useData();
  const visibleProducts = products.filter((item) => !productIsHiddenFromStore(item));
  const divisions = [
    {
      key: "store",
      label: "PDEXPRESS STORE",
      title: "Everyday products, made easier.",
      text: "Appliances, electronics, and essentials with live availability.",
      count: visibleProducts.length,
      to: "/store",
      icon: <ShoppingBag />
    },
    {
      key: "real",
      label: "REAL ESTATE",
      title: "A place for your next chapter.",
      text: "Land, homes, rentals, and commercial opportunities across Bhutan.",
      count: properties.length,
      to: "/real-estate",
      icon: <Building2 />
    },
    {
      key: "motors",
      label: "PD MOTORS",
      title: "Your next drive starts here.",
      text: "Vehicles with clear specifications and direct enquiry support.",
      count: vehicles.length,
      to: "/motors",
      icon: <CarFront />
    }
  ];

  return <>
    <section className="home-hero static-home-hero">
      <PublicHeroBackground />
      <div className="container static-hero-content">
        <div className="static-hero-copy">
          <span className="static-overline">PDEXPRESS BHUTAN · EST. 2017</span>
          <h1>Quality for today.<br /><TypewriterTrustLine /></h1>
          <p>Explore products, property opportunities, and vehicles from one trusted Bhutanese business group.</p>
          <div className="static-hero-actions">
            <Link className="btn primary" to="/store">Explore PD Express <ArrowRight size={18} /></Link>
            <a className="static-text-link" href="#divisions">Our three divisions <ArrowRight size={17} /></a>
          </div>
        </div>

        <div className="static-hero-side-note">
          <span>ONE TRUSTED NAME</span>
          <strong>PD Express Store<br />PD Express Real Estate<br />PD Express Motors</strong>
        </div>
      </div>
    </section>

    <section id="divisions" className="static-intro-section">
      <div className="container">
        <Reveal>
          <div className="static-intro-heading">
            <span className="eyebrow">EXPLORE PDEXPRESS</span>
            <h2>Three divisions.<br />One simple experience.</h2>
            <p>Everything is organised clearly so customers can find what they need without confusion.</p>
          </div>
        </Reveal>

        <div className="static-division-grid">
          {divisions.map((division, index) => (
            <Reveal key={division.key} delay={index * 100}>
              <Link className="static-division-card" to={division.to}>
                <div className="static-card-label"><span>{division.label}</span><ArrowRight size={19} /></div>
                <div className="static-card-icon">{division.icon}</div>
                <h3>{division.title}</h3>
                <p>{division.text}</p>
                <div className="static-card-count"><strong><CountUp value={division.count} /></strong><span>live listings</span></div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    <ServicesSection />

    <section className="static-coming-section">
      <div className="container">
        <Reveal>
          <div className="static-section-split">
            <div>
              <span className="eyebrow">COMING SOON</span>
              <h2>What is arriving next.</h2>
            </div>
            <p>Preview Store products and PD Motors vehicles that are coming soon.</p>
          </div>
        </Reveal>
        <Reveal delay={90}><ComingSoonSlider products={visibleProducts} vehicles={vehicles} /></Reveal>
      </div>
    </section>

    <section className="static-stats-section">
      <div className="container">
        <Reveal>
          <div className="static-stats-heading">
            <span className="eyebrow live-eyebrow"><span className="live-dot" />LIVE PDEXPRESS DATA</span>
            <h2>Updated by our branch teams.</h2>
          </div>
        </Reveal>
        <div className="static-stats-grid">
          <Reveal delay={0}><Link to="/store" className="static-stat"><span className="static-stat-icon"><ShoppingBag /></span><strong><CountUp value={visibleProducts.length} /></strong><span>Store listings</span></Link></Reveal>
          <Reveal delay={100}><Link to="/real-estate" className="static-stat"><span className="static-stat-icon"><House /></span><strong><CountUp value={properties.length} /></strong><span>Property listings</span></Link></Reveal>
          <Reveal delay={200}><Link to="/motors" className="static-stat"><span className="static-stat-icon"><CarFront /></span><strong><CountUp value={vehicles.length} /></strong><span>Vehicle listings</span></Link></Reveal>
          <Reveal delay={300}><div className="static-stat"><span className="static-stat-icon"><Users /></span><strong className="live-value"><span className="live-dot" />Live</strong><span>Admin-managed data</span></div></Reveal>
        </div>
      </div>
    </section>
  </>;
}

function FilterBar({ search, setSearch, options, value, setValue }) {
  return <div className="filters">
    <label className="search"><Search size={18} /><input placeholder="Search listings" value={search} onChange={e => setSearch(e.target.value)} /></label>
    {options && <select value={value} onChange={e => setValue(e.target.value)}>{options.map(x => <option key={x}>{x}</option>)}</select>}
  </div>;
}



function SwipeDots({ count, activeIndex = 0, className = "" }) {
  if (count < 2) return null;
  return <div className={`swipe-dots ${className}`} aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <span key={index} className={index === activeIndex ? "active" : ""} />
    ))}
  </div>;
}

// Plain responsive grid used everywhere public listing cards are shown -
// replaces the old horizontal slider so every matching card is visible,
// wrapping onto as many rows as needed.
export function ListingGrid({ children, className = "" }) {
  return <div className={`listing-results-grid ${className}`}>{children}</div>;
}

export function ListingGridSkeleton({ count = 6 }) {
  return <div className="listing-results-grid" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <div className="listing-skeleton-card" key={index}>
        <div className="listing-skeleton-media" />
        <div className="listing-skeleton-line long" />
        <div className="listing-skeleton-line short" />
        <div className="listing-skeleton-line medium" />
      </div>
    ))}
  </div>;
}

export function CategoryNotFound({ section, basePath, sectionLabel }) {
  return <div className="category-not-found">
    <p className="category-not-found-eyebrow">Category not found</p>
    <h2>We couldn't find that {sectionLabel.toLowerCase()} category.</h2>
    <p>It may have been renamed, removed, or the link is out of date.</p>
    <Link className="btn primary" to={basePath}>Browse all {sectionLabel}</Link>
  </div>;
}

function StatusRowGrid({ group, renderCard }) {
  return <section className={`status-row status-${group.key}`}>
    <div className="status-row-heading">
      <div>
        <span className="status-row-label">{group.label}</span>
        <p>{group.description}</p>
      </div>
      <span className="status-row-count">{group.items.length} {group.items.length === 1 ? "listing" : "listings"}</span>
    </div>

    <ListingGrid>
      {group.items.map((item, index) => (
        <div
          className="listing-grid-entry"
          style={{ "--entry-delay": `${Math.min(index * 55, 440)}ms` }}
          key={item.id}
        >
          {renderCard(item)}
        </div>
      ))}
    </ListingGrid>
  </section>;
}
function StatusRows({ items, type, renderCard }) {
  const groups = [
    { key: "available", label: "Available", description: "Listings currently available for enquiry." },
    { key: "reserved", label: "Reserved", description: "Listings currently reserved." },
    { key: "sold", label: "Sold", description: "Recently sold or no longer available." },
    { key: "rented", label: "Rented", description: "Properties currently rented out." },
    { key: "coming_soon", label: "Coming soon", description: "Listings that will be available soon." },
    { key: "out_of_stock", label: "Out of stock", description: "Listings temporarily unavailable." }
  ];

  const normalize = (status) => normalizeStatus(status);

  const grouped = groups
    .map(group => ({ ...group, items: items.filter(item => normalize(item.status) === group.key) }))
    .filter(group => group.items.length > 0);

  if (!grouped.length) return <div className="empty">No listings found.</div>;

  return <div className={`status-rows status-rows-${type}`}>
    {grouped.map((group) => (
      <StatusRowGrid key={group.key} group={group} renderCard={renderCard} />
    ))}
  </div>;
}

function BranchHero({ className, label, title, text, children }) {
  return <>
    <section className={`division-hero cinematic-division-hero ${className}`}>
      <div className="division-hero-media" />
      <div className="division-hero-overlay" />
      <div className="container division-hero-content">
        <div className="division-hero-copy">
          <span className="eyebrow light">{label}</span>
          <h1>{title}</h1>
          <p>{text}</p>
          <div className="hero-actions"><a className="btn primary" href="#listings">Explore listings <ArrowRight size={18} /></a><a className="btn ghost" href={WHATSAPP_URL} target="_blank" rel="noreferrer">Chat on WhatsApp <MessageCircle size={18} /></a></div>
        </div>
        <div className="division-hero-stamp"><span>PD</span><small>EXPRESS<br />BHUTAN</small></div>
      </div>
      <div className="division-hero-bottom"><span>SCROLL FOR LIVE LISTINGS</span><i /></div>
    </section>
    <section id="listings" className="container page-content">{children}</section>
  </>;
}

function Store() {
  const { products } = useData();
  const [q, setQ] = useState("");
  const visibleProducts = products.filter((item) => !productIsHiddenFromStore(item));
  const list = visibleProducts.filter(x => x.name.toLowerCase().includes(q.toLowerCase()));
  return <section className="container page-content listing-page">
    <Reveal><SectionTitle eyebrow="PDEXPRESS STORE" title="Find what you need." text="Search live products and open any listing to view its full photo gallery." /></Reveal>
    <Reveal delay={60}><FilterBar search={q} setSearch={setQ} /></Reveal>
    <StatusRows items={list} type="store" renderCard={(x) => <ProductCard key={x.id} item={x} />} /><LoadMessage />
  </section>;
}

function RealEstate() {
  const { properties } = useData(); const [q, setQ] = useState("");
  const list = properties.filter(x => `${x.title} ${x.location}`.toLowerCase().includes(q.toLowerCase()));
  return <section className="container page-content listing-page">
    <Reveal><SectionTitle eyebrow="PD EXPRESS REAL ESTATE" title="Explore your next opportunity." text="Open any listing to view all land, property, interior, or location photographs." /></Reveal>
    <Reveal delay={60}><FilterBar search={q} setSearch={setQ} /></Reveal>
    <StatusRows items={list} type="real-estate" renderCard={(x) => <PropertyCard key={x.id} item={x} />} /><LoadMessage />
  </section>;
}

function Motors() {
  const { vehicles } = useData(); const [q, setQ] = useState("");
  const list = vehicles.filter(x => `${x.brand} ${x.model}`.toLowerCase().includes(q.toLowerCase()));
  return <section className="container page-content listing-page">
    <Reveal><SectionTitle eyebrow="PD MOTORS" title="Find your next drive." text="Open any listing to inspect exterior, interior, dashboard, and other images." /></Reveal>
    <Reveal delay={60}><FilterBar search={q} setSearch={setQ} /></Reveal>
    <StatusRows items={list} type="motors" renderCard={(x) => <VehicleCard key={x.id} item={x} />} /><LoadMessage />
  </section>;
}

const ABOUT_TIMELINE = [
  {
    key: "founded",
    tag: "3 OCTOBER 2017",
    title: "Where it all began",
    icon: <Sparkles />,
    text: "Founded on 3rd October 2017, PDEXPRESS has grown into one of Bhutan's trusted names in retail, distribution, and customer service. With a strong commitment to quality, reliability, and innovation, we proudly serve customers across the Kingdom of Bhutan through our diverse business divisions: PDEXPRESS Stores, PDEXPRESS Motors, and PDEXPRESS Real Estate.",
  },
  {
    key: "mission",
    tag: "OUR MISSION",
    title: "World-class, closer to home",
    icon: <ShoppingBag />,
    text: "At PDEXPRESS, our mission is simple — to bring world-class products and services closer to Bhutanese families and businesses. From home appliances and consumer electronics to modern mobility solutions and real estate services, we strive to provide exceptional value, competitive pricing, and outstanding after-sales support.",
  },
  {
    key: "trust",
    tag: "TRUSTED & AUTHORIZED",
    title: "Genuine products, real service",
    icon: <ShieldCheck />,
    text: "As an authorized distributor of leading international brands, we are dedicated to delivering genuine products backed by professional service and comprehensive warranty coverage. Our growing network, experienced team, and customer-first approach have helped us earn the trust of thousands of satisfied customers throughout Bhutan.",
  },
  {
    key: "future",
    tag: "TODAY & BEYOND",
    title: "Always moving forward",
    icon: <RotateCcw />,
    text: "Today, PDEXPRESS continues to expand its vision by embracing new technologies, sustainable solutions, and innovative business opportunities that contribute to Bhutan's future development.",
  },
];

function AboutTimelineItem({ item, index }) {
  const side = index % 2 === 0 ? "left" : "right";
  return <Reveal direction={side} delay={index * 90} className={`about-timeline-item about-timeline-${side}`}>
    <div className="about-timeline-dot"><span>{item.icon}</span></div>
    <article className="about-timeline-card">
      <span className="about-timeline-tag">{item.tag}</span>
      <h3>{item.title}</h3>
      <p>{item.text}</p>
    </article>
  </Reveal>;
}

function About() {
  return <section className="about-page">
    <div className="container">
      <Reveal>
        <div className="static-intro-heading about-hero-heading">
          <span className="eyebrow">ABOUT PD EXPRESS</span>
          <h2>Delivering quality, building trust, driving the future.</h2>
        </div>
      </Reveal>
    </div>

    <div className="container">
      <div className="about-timeline">
        {ABOUT_TIMELINE.map((item, index) => <AboutTimelineItem key={item.key} item={item} index={index} />)}
      </div>
    </div>
  </section>;
}


const INFO_PAGES = {
  services: { eyebrow: "OUR SERVICES", title: "Three business divisions. One trusted name.", body: ["PDExpress Store provides carefully selected appliances, electronics, and essentials with transparent stock information.", "PD Express Real Estate helps customers explore land, homes, rentals, and commercial opportunities.", "PD Motors presents vehicles with clear specifications, condition details, images, and direct enquiry support."] },
  history: { eyebrow: "COMPANY HISTORY", title: "Built on trust since 2017.", body: ["Founded on 3rd October 2017, PD Express began with a commitment to make quality products and services more accessible across Bhutan.", "Today, PDExpress Store, PD Express Real Estate, and PD Motors support families and businesses through a shared commitment to clear information and helpful service."] },
  terms: { eyebrow: "TERMS & CONDITIONS", title: "Clear information for every enquiry.", body: ["Prices, availability, and listing details may change as stock or market conditions change. Customers should confirm final details directly with PD Express before making a commitment.", "Images are provided as a reference. Vehicle and property details should be verified with the relevant PD Express team."] },
  warranty: { eyebrow: "WARRANTY POLICY", title: "Warranty details are shown per listing.", body: ["Warranty coverage, duration, and exclusions vary by product or vehicle. Customers should review the warranty details shown on the listing and confirm the claim process with PD Express.", "Items marked with no warranty are sold without additional warranty coverage unless otherwise stated."] },
  delivery: { eyebrow: "DELIVERY INFORMATION", title: "Helpful delivery guidance.", body: ["Delivery availability, timing, and charges depend on the item, destination, and branch arrangements. Contact PD Express through WhatsApp to confirm delivery options.", "For large appliances and vehicles, delivery or collection arrangements are confirmed directly with the relevant team."] },
  privacy: { eyebrow: "PRIVACY POLICY", title: "Respectful handling of enquiries.", body: ["PD Express uses customer enquiry information only to respond to requests and provide relevant assistance.", "Contact details are handled responsibly and are not sold to third parties."] },
};

function InfoPage({ page }) {
  const info = INFO_PAGES[page];
  return <section className="container info-page"><SectionTitle eyebrow={info.eyebrow} title={info.title} />{info.body.map((paragraph,i)=><p className="lead" key={i}>{paragraph}</p>)}</section>;
}

function Contact() {
  const { contact } = useCustomerCareContact();
  const [msg, setMsg] = useState("");
  async function send(e) {
    e.preventDefault();
    const f = e.currentTarget;
    try {
      await emailjs.sendForm(import.meta.env.VITE_EMAILJS_SERVICE_ID, import.meta.env.VITE_EMAILJS_TEMPLATE_ID, f, import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
      f.reset(); setMsg("Your enquiry was sent successfully.");
    } catch { setMsg("Email could not be sent. Please use WhatsApp or check EmailJS setup."); }
  }
  return <section className="container contact-page"><div><span className="eyebrow">CONTACT US</span><h1>Let’s find what you need.</h1><p>Send an enquiry about a product, property, vehicle, or partnership.</p><a className="contact-whatsapp" href={whatsAppLinkForBranch(contact)} target="_blank" rel="noreferrer"><MessageCircle /> Message PD Express on WhatsApp <ArrowRight size={18} /></a></div>
    <form className="contact-form" onSubmit={send}><input name="from_name" placeholder="Your name" required /><input name="reply_to" type="email" placeholder="Email address" required /><input name="phone" placeholder="Phone / WhatsApp number" /><select name="enquiry_type"><option>General enquiry</option><option>PDExpress Store</option><option>PD Express Real Estate</option><option>PD Motors</option></select><textarea name="message" placeholder="How can we help?" rows="5" required /><button className="btn primary">Send enquiry <Send size={18} /></button>{msg && <p className="form-message success">{msg}</p>}</form>
  </section>;
}

function PasswordInput({ value, onChange, placeholder, required, autoComplete, className = "" }) {
  const [visible, setVisible] = useState(false);
  return <div className={`password-field ${className}`}>
    <input type={visible ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} required={required} autoComplete={autoComplete} />
    <button type="button" className="password-toggle" onClick={() => setVisible(v => !v)} aria-label={visible ? "Hide password" : "Show password"}>
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  </div>;
}

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState("login");
  const [sending, setSending] = useState(false);

  async function login(e) {
    e.preventDefault();
    if (!supabase) return setMsg("Add Supabase keys to .env first.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setMsg(error.message);
    nav("/dashboard");
  }

  async function sendReset(e) {
    e.preventDefault();
    if (!supabase) return setMsg("Add Supabase keys to .env first.");
    setSending(true);
    setMsg("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    setSending(false);
    setMsg(error ? error.message : "Password reset link sent. Check your email.");
  }

  if (mode === "forgot") {
    return <section className="login-page"><form className="login-box" onSubmit={sendReset}>
      <Link to="/"><Logo /></Link>
      <h1>Reset password</h1>
      <p>Enter your account email and we’ll send you a link to set a new password.</p>
      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required />
      <button className="btn primary full" disabled={sending}>{sending ? "Sending…" : "Send reset link"}</button>
      <button type="button" className="text-btn" onClick={() => { setMode("login"); setMsg(""); }}>Back to login</button>
      {msg && <p className={msg.includes("sent") ? "form-message success" : "form-message error"}>{msg}</p>}
    </form></section>;
  }

  return <section className="login-page"><form className="login-box" onSubmit={login}>
    <Link to="/"><Logo /></Link>
    <h1>Admin login</h1>
    <p>Use the account created for your branch. Your role controls what you can manage.</p>
    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required />
    <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required autoComplete="current-password" />
    <button type="button" className="text-btn login-forgot" onClick={() => { setMode("forgot"); setMsg(""); }}>Forgot password?</button>
    <button className="btn primary full">Login <ArrowRight size={18} /></button>
    {msg && <p className="form-message error">{msg}</p>}
  </form></section>;
}

function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => subscription.subscription.unsubscribe();
  }, []);

  async function save(e) {
    e.preventDefault();
    if (password.length < 6) return setMsg("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setMsg("Passwords do not match.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return setMsg(error.message);
    setMsg("Password updated. Redirecting to login…");
    setTimeout(async () => { await supabase.auth.signOut(); nav("/login"); }, 1500);
  }

  if (!supabase) return <section className="login-page"><div className="login-box"><h2>Supabase is not connected.</h2></div></section>;

  return <section className="login-page"><form className="login-box" onSubmit={save}>
    <Link to="/"><Logo /></Link>
    <h1>Set a new password</h1>
    {!ready && <p>Open this page using the password reset link sent to your email.</p>}
    {ready && <>
      <p>Choose a new password for your account.</p>
      <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" required autoComplete="new-password" />
      <PasswordInput value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required autoComplete="new-password" />
      <button className="btn primary full" disabled={saving}>{saving ? "Saving…" : "Update password"}</button>
    </>}
    {msg && <p className={msg.includes("updated") ? "form-message success" : "form-message error"}>{msg}</p>}
  </form></section>;
}

function useAdmin() {
  const [state, setState] = useState({ loading: true, user: null, profile: null, error: "" });
  useEffect(() => { (async () => {
    if (!supabase) return setState({ loading: false, error: "Supabase is not connected." });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return setState({ loading: false, error: "Please log in." });
    const { data: profile, error } = await supabase.from("users").select("*,branches(*)").eq("id", user.id).single();
    setState({ loading: false, user, profile, error: error?.message || "" });
  })(); }, []);
  return state;
}



function Dashboard() {
  const admin = useAdmin();
  const { products, properties, vehicles, branches, refresh } = useData();
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");

  if (admin.loading) return <div className="empty">Loading dashboard…</div>;
  if (admin.error) return <section className="login-page"><div className="login-box"><h2>{admin.error}</h2><Link className="btn primary" to="/login">Go to login</Link></div></section>;

  const rawRole = admin.profile.role;
  const isStoreRole = ["store_admin", "sales_staff", "warehouse_staff", "store_viewer", "accountant"].includes(rawRole);
  const role = isStoreRole ? "store_admin" : rawRole;
  const isSuper = role === "super_admin";
  const slug = isSuper ? null : (isStoreRole ? "store" : branchSlugFor[role]);
  const branch = branches.find((item) => item.slug === slug);
  const current = role === "store_admin" ? products : role === "real_estate_admin" ? properties : role === "motors_admin" ? vehicles : [...products, ...properties, ...vehicles];
  const canEditWhatsApp = isSuper || ["store_admin", "real_estate_admin", "motors_admin"].includes(rawRole);

  async function logout() { await supabase.auth.signOut(); location.href="/login"; }
  async function remove(item) {
    if(!confirm("Delete this listing?")) return;
    const table=role==="store_admin"?"products":role==="real_estate_admin"?"properties":"vehicles";
    const {error}=await supabase.from(table).delete().eq("id",item.id);
    setNotice(error?error.message:"Listing deleted."); refresh();
  }

  return <div className="dashboard"><aside>
    <Link to="/"><Logo /></Link><span className="admin-tag">{isSuper?"Super Admin":admin.profile.branches?.name||"Branch Admin"}</span>
    <button className={tab==="overview"?"active":""} onClick={()=>setTab("overview")}><BarChart3/>Overview</button>
    {!isSuper && <button className={tab==="manage"?"active":""} onClick={()=>{setEditing({});setTab("manage")}}><Package/>Products</button>}
    {role==="store_admin" && <button className={tab==="operations"?"active":""} onClick={()=>setTab("operations")}><ReceiptText/>Sales & inventory</button>}
    {role!=="store_admin" && <button className={tab==="reports"?"active":""} onClick={()=>setTab("reports")}><FileSpreadsheet/>{isSuper ? "Admin reports" : "Send report"}</button>}
    {isSuper && <button className={tab==="admins"?"active":""} onClick={()=>setTab("admins")}><ShieldCheck/>Admin users</button>}
    {isSuper && <button className={tab==="locations"?"active":""} onClick={()=>setTab("locations")}><MapPin/>Manage Locations</button>}
    {canEditWhatsApp && <button className={tab==="whatsapp"?"active":""} onClick={()=>setTab("whatsapp")}><MessageCircle/>WhatsApp</button>}
    <button onClick={logout}><LogOut/>Log out</button>
  </aside><section className="dashboard-main">
    {tab==="overview" && <Overview isSuper={isSuper} role={role} items={current} products={products} properties={properties} vehicles={vehicles} setTab={setTab}/>}
    {tab==="manage" && !isSuper && <Manage role={role} branch={branch} items={current} editing={editing} setEditing={setEditing} refresh={refresh} remove={remove} notice={notice} setNotice={setNotice}/>}
    {tab==="operations" && role==="store_admin" && <StoreOperations products={products} branch={branch} refreshProducts={refresh}/>}
    {tab==="reports" && <AdminReports isSuper={isSuper} branch={branch} />}
    {tab==="admins" && isSuper && <AdminUsers/>}
    {tab==="locations" && isSuper && <ManageLocations/>}
    {tab==="whatsapp" && canEditWhatsApp && <WhatsAppSettings isSuper={isSuper} branch={branch} branches={branches} refresh={refresh} />}
  </section></div>;
}


function Overview({ isSuper, role, items, products, properties, vehicles, setTab }) {
  const remaining=(x)=>Math.max(0,Number(x.total_stock||0)-Number(x.sold_quantity||0));
  const low=products.filter(x=>remaining(x)<=3);
  const available=items.filter(x=>normalizeStatus(x.status)==="available").length;
  const coming=items.filter(x=>normalizeStatus(x.status)==="coming_soon").length;
  const chartData=isSuper?[{name:"Store",value:products.length},{name:"Real Estate",value:properties.length},{name:"Motors",value:vehicles.length}]
    : role==="store_admin"?[{name:"Products",value:products.length},{name:"Available",value:products.filter(x=>remaining(x)>0).length},{name:"New",value:products.filter(x=>isNewArrival(x)).length}]
    :[{name:"Listings",value:items.length},{name:"Available",value:available},{name:"Coming",value:coming}];

  return <>
    <Reveal><div className="dash-head"><div><span className="eyebrow">ADMIN PORTAL</span><h1>{isSuper?"Business overview":"Branch dashboard"}</h1><p>Keep listings accurate, detailed, and ready for customers to explore.</p></div>{!isSuper&&<button className="btn primary" onClick={()=>setTab("manage")}><Plus size={18}/>Add listing</button>}</div></Reveal>
    <div className="dash-stats">{isSuper?<>
      <Reveal delay={0}><DashStat icon={Boxes} title="Total listings" value={products.length+properties.length+vehicles.length} note="All branches"/></Reveal>
      <Reveal delay={60}><DashStat icon={ShieldCheck} title="Available products" value={products.filter(x=>remaining(x)>0).length} note="Ready to sell"/></Reveal>
      <Reveal delay={120}><DashStat icon={Sparkles} title="New arrivals" value={[...products,...properties,...vehicles].filter(x=>isNewArrival(x)).length} note="Recently added"/></Reveal>
    </>:<>
      <Reveal delay={0}><DashStat icon={Boxes} title={role==="store_admin"?"Products":"Listings"} value={items.length} note="Live records"/></Reveal>
      <Reveal delay={60}><DashStat icon={ShieldCheck} title="Available" value={role==="store_admin"?items.filter(x=>remaining(x)>0).length:available} note="Customer visibility"/></Reveal>
      <Reveal delay={120}><DashStat icon={Bell} title="Coming soon" value={coming} note="Home slider"/></Reveal>
    </>}</div>
    <div className="dash-grid">
      <Reveal delay={90}><div className="panel chart">
        <h3>Listing overview</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid stroke="#eee8e1" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "rgba(232,79,32,.06)" }} contentStyle={{ borderRadius: 12, border: "1px solid #eee8e1", boxShadow: "0 12px 28px rgba(16,33,42,.12)" }} />
            <Bar dataKey="value" fill="#e84f20" radius={[8, 8, 0, 0]} maxBarSize={64} />
          </BarChart>
        </ResponsiveContainer>
      </div></Reveal>
      <Reveal delay={150}><div className="panel">
        <h3>Recent listing updates</h3>
        {items.length ? <div className="activity">{items.slice(0, 5).map(x => <p key={x.id}><b>{x.name || x.title || `${x.brand || ""} ${x.model || ""}`}</b><span><Badge>{titleStatus(x.status)}</Badge>{isNewArrival(x) && <Badge>New Arrival</Badge>}</span></p>)}</div> : <div className="empty">No listings yet.</div>}
      </div></Reveal>
    </div>
  </>;
}

function DashStat({ icon: Icon, title, value, note }) {
  return <div className="dash-stat">
    {Icon && <span className="dash-stat-icon"><Icon size={20} /></span>}
    <span className="dash-stat-title">{title}</span>
    <strong>{typeof value === "number" ? <CountUp value={value} /> : value}</strong>
    <small>{note}</small>
  </div>;
}

function ImageUrlManager({ images, onChange }) {
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const safeImages = images || [];
  const addImage = () => {
    const value = draft.trim();
    if (!value) return;
    if (safeImages.length >= 10) return;
    if (safeImages.includes(value)) return;
    onChange([...safeImages, value]);
    setDraft("");
  };
  const uploadFiles = async (event) => {
    const files = Array.from(event.target.files || []).slice(0, Math.max(0, 10 - safeImages.length));
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, "-").toLowerCase();
      const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
      if (!error) {
        const { data } = supabase.storage.from("product-images").getPublicUrl(path);
        if (data?.publicUrl) uploaded.push(data.publicUrl);
      }
    }
    if (uploaded.length) onChange([...safeImages, ...uploaded].slice(0, 10));
    setUploading(false);
    event.target.value = "";
  };
  const removeImage = (index) => onChange(safeImages.filter((_, i) => i !== index));
  const moveImage = (from, to) => {
    const next = [...safeImages];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  return <div className="image-manager field-full">
    <label><ImagePlus size={17} /> Images <span>Upload from device or paste URLs. Up to 10 images.</span></label>
    <div className="image-add-row"><input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addImage(); } }} placeholder="Paste a direct image URL" /><button type="button" className="btn soft" onClick={addImage} disabled={safeImages.length >= 10}><Plus size={17} /> Add URL</button><label className="btn soft"><Upload size={17}/> {uploading ? "Uploading…" : "Upload photos"}<input type="file" hidden multiple accept="image/*" onChange={uploadFiles}/></label></div>
    <small className="image-help">{safeImages.length}/10 images added. Drag-style ordering is handled with the arrow buttons. The first image is shown on the public card.</small>
    {!!safeImages.length && <div className="admin-image-grid">{safeImages.map((url, index) => <div className="admin-image-tile" key={`${url}-${index}`}><img src={url} alt={`Listing image ${index + 1}`} /><span>{index === 0 ? "Main photo" : `Photo ${index + 1}`}</span><div className="image-order"><button type="button" disabled={index===0} onClick={() => moveImage(index, index-1)}>↑</button><button type="button" disabled={index===safeImages.length-1} onClick={() => moveImage(index, index+1)}>↓</button></div><button type="button" onClick={() => removeImage(index)} aria-label="Remove image"><CircleX size={18} /></button></div>)}</div>}
  </div>;
}

const MAX_VIDEO_SIZE_MB = 100;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

// Mirrors ImageUrlManager's upload pattern (same "product-images" storage
// bucket, same products/-style path convention but under vehicles/) with
// added client-side type/size validation, since ImageUrlManager has none.
function VideoUrlManager({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileName = value ? decodeURIComponent(value.split("/").pop().split("?")[0]) : "";

  const uploadVideo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    const looksLikeVideo = ALLOWED_VIDEO_TYPES.includes(file.type) || /\.(mp4|mov|webm)$/i.test(file.name);
    if (!looksLikeVideo) { setError("Please choose an MP4, MOV, or WebM video file."); return; }
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) { setError(`Video is too large. Maximum size is ${MAX_VIDEO_SIZE_MB}MB.`); return; }
    setUploading(true);
    const safeName = file.name.replace(/[^a-z0-9.\-_]/gi, "-").toLowerCase();
    const path = `vehicles/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) {
      setError(uploadError.message || "Could not upload video. Please try again.");
    } else {
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      if (data?.publicUrl) onChange(data.publicUrl);
    }
    setUploading(false);
  };

  return <div className="video-manager field-full">
    <label><Film size={17} /> Vehicle Video (Optional) <span>MP4, MOV, or WebM, up to {MAX_VIDEO_SIZE_MB}MB.</span></label>
    {value ? (
      <div className="video-preview-row">
        <video src={value} controls className="video-preview" />
        <div className="video-preview-meta">
          <span className="video-filename">{fileName}</span>
          <div className="image-add-row">
            <label className="btn soft">{uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />} {uploading ? "Uploading…" : "Replace video"}<input type="file" hidden accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" onChange={uploadVideo} disabled={uploading} /></label>
            <button type="button" className="btn soft danger" onClick={() => { onChange(""); setError(""); }}><Trash2 size={16} /> Remove video</button>
          </div>
        </div>
      </div>
    ) : (
      <div className="image-add-row">
        <label className="btn soft">{uploading ? <Loader2 size={16} className="spin" /> : <Upload size={16} />} {uploading ? "Uploading…" : "Upload video"}<input type="file" hidden accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" onChange={uploadVideo} disabled={uploading} /></label>
      </div>
    )}
    {error && <p className="form-message error">{error}</p>}
  </div>;
}

function ColorPicker({ colors, onChange, itemLabel = "item" }) {
  const [draft, setDraft] = useState("");
  const safeColors = colors || [];
  const toggleColor = (color) => {
    if (safeColors.includes(color)) onChange(safeColors.filter((c) => c !== color));
    else onChange([...safeColors, color]);
  };
  const addCustomColor = () => {
    const value = draft.trim();
    if (!value || safeColors.includes(value)) return;
    onChange([...safeColors, value]);
    setDraft("");
  };
  const removeColor = (color) => onChange(safeColors.filter((c) => c !== color));
  return <div className="color-picker field-full">
    <label>Available colors <span>Select every color this {itemLabel} comes in.</span></label>
    <div className="color-chip-row">
      {COMMON_COLORS.map((color) => <button type="button" key={color} className={`color-chip ${safeColors.includes(color) ? "active" : ""}`} onClick={() => toggleColor(color)}>{color}</button>)}
    </div>
    {safeColors.some((c) => !COMMON_COLORS.includes(c)) && <div className="color-chip-row">
      {safeColors.filter((c) => !COMMON_COLORS.includes(c)).map((color) => <span className="color-chip active" key={color}>{color}<button type="button" onClick={() => removeColor(color)} aria-label={`Remove ${color}`}><CircleX size={14} /></button></span>)}
    </div>}
    <div className="image-add-row"><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomColor(); } }} placeholder="Add another color, e.g. Beige" /><button type="button" className="btn soft" onClick={addCustomColor}><Plus size={17} /> Add color</button></div>
  </div>;
}

function MultiOptionPicker({ label, description, options = [], value, onChange, placeholder = "Add another option" }) {
  const [draft, setDraft] = useState("");
  const selected = normalizeListValue(value);
  const toggleOption = (option) => {
    if (selected.includes(option)) onChange(selected.filter((item) => item !== option));
    else onChange([...selected, option]);
  };
  const addCustomOption = () => {
    const next = draft.trim();
    if (!next || selected.includes(next)) return;
    onChange([...selected, next]);
    setDraft("");
  };
  const removeOption = (option) => onChange(selected.filter((item) => item !== option));
  return <div className="color-picker field-full">
    <label>{label} <span>{description}</span></label>
    <div className="color-chip-row">
      {options.map((option) => <button type="button" key={option} className={`color-chip ${selected.includes(option) ? "active" : ""}`} onClick={() => toggleOption(option)}>{option}</button>)}
    </div>
    {selected.some((item) => !options.includes(item)) && <div className="color-chip-row">
      {selected.filter((item) => !options.includes(item)).map((item) => <span className="color-chip active" key={item}>{item}<button type="button" onClick={() => removeOption(item)} aria-label={`Remove ${item}`}><CircleX size={14} /></button></span>)}
    </div>}
    <div className="image-add-row"><input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomOption(); } }} placeholder={placeholder} /><button type="button" className="btn soft" onClick={addCustomOption}><Plus size={17} /> Add</button></div>
  </div>;
}



function ProductVariantEditor({ variants, onChange }) {
  const safe = Array.isArray(variants) ? variants : [];
  const add = () => onChange([...safe, { sku: "", model_number: "", colour: "", capacity_value: "", capacity_unit: "", selling_price: "", discount_percent: 0, stock: 0, barcode: "" }]);
  const update = (index, key, value) => onChange(safe.map((variant, i) => i === index ? { ...variant, [key]: value } : variant));
  const remove = (index) => onChange(safe.filter((_, i) => i !== index));
  return <div className="field-full variant-editor">
    <div className="section-mini-head"><div><strong>Product variants</strong><span>Use variants for different model numbers, colours, capacities, screen sizes, tonnage, prices, and stock.</span></div><button type="button" className="btn soft" onClick={add}><Plus size={16}/> Add variant</button></div>
    {!safe.length && <p className="admin-hint">Example: one parent product called “Haier 190L Refrigerator”, then variants for HRD-2102BRB Brown, HRD-2102BBR Black, and HRD-2102SMAA Silver.</p>}
    {safe.map((variant, index) => <div className="variant-row" key={index}>
      <input value={variant.sku || ""} onChange={e => update(index, "sku", e.target.value)} placeholder="SKU" />
      <input value={variant.model_number || ""} onChange={e => update(index, "model_number", e.target.value)} placeholder="Model" />
      <input value={variant.colour || ""} onChange={e => update(index, "colour", e.target.value)} placeholder="Colour" />
      <input value={variant.capacity_value || ""} onChange={e => update(index, "capacity_value", e.target.value)} placeholder="Capacity/Size" />
      <select value={variant.capacity_unit || ""} onChange={e => update(index, "capacity_unit", e.target.value)}><option value="">Unit</option><option>L</option><option>KG</option><option>Inch</option><option>Ton</option><option>BTU</option></select>
      <input type="number" min="0" value={variant.selling_price ?? ""} onChange={e => update(index, "selling_price", e.target.value)} placeholder="Price" />
      <input type="number" min="0" max="100" value={variant.discount_percent ?? 0} onChange={e => update(index, "discount_percent", e.target.value)} placeholder="Discount %" />
      <input type="number" min="0" value={variant.stock ?? 0} onChange={e => update(index, "stock", e.target.value)} placeholder="Stock" />
      <input value={variant.barcode || ""} onChange={e => update(index, "barcode", e.target.value)} placeholder="Barcode" />
      <button type="button" className="icon-action danger" onClick={() => remove(index)}><Trash2 size={17}/></button>
    </div>)}
  </div>;
}

function StockMovementEditor({ movements, onChange }) {
  const safe = Array.isArray(movements) ? movements : [];
  const add = () => onChange([{ movement_type: "Opening Stock", quantity: 0, location: "Warehouse", reason: "", remarks: "", created_at: new Date().toISOString() }, ...safe]);
  const update = (index, key, value) => onChange(safe.map((movement, i) => i === index ? { ...movement, [key]: value } : movement));
  const remove = (index) => onChange(safe.filter((_, i) => i !== index));
  return <div className="field-full movement-editor">
    <div className="section-mini-head"><div><strong>Stock movement history</strong><span>Track opening stock, stock received, sold, transfers, damage, returns, and adjustments.</span></div><button type="button" className="btn soft" onClick={add}><Plus size={16}/> Add movement</button></div>
    {safe.slice(0, 8).map((movement, index) => <div className="movement-row" key={index}>
      <select value={movement.movement_type || "Opening Stock"} onChange={e => update(index, "movement_type", e.target.value)}>{STOCK_MOVEMENT_TYPES.map(type => <option key={type}>{type}</option>)}</select>
      <input type="number" value={movement.quantity ?? 0} onChange={e => update(index, "quantity", e.target.value)} placeholder="Qty" />
      <select value={movement.location || "Warehouse"} onChange={e => update(index, "location", e.target.value)}>{PRODUCT_STOCK_LOCATIONS.map(location => <option key={location}>{location}</option>)}</select>
      <input value={movement.reason || ""} onChange={e => update(index, "reason", e.target.value)} placeholder="Reason" />
      <input value={movement.remarks || ""} onChange={e => update(index, "remarks", e.target.value)} placeholder="Internal remarks" />
      <button type="button" className="icon-action danger" onClick={() => remove(index)}><Trash2 size={17}/></button>
    </div>)}
  </div>;
}

function BulkStoreImport({ branch, refresh, setNotice }) {
  const [rows, setRows] = useState([]);
  async function onFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames.find(name => name.toLowerCase().includes("stock")) || workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
    const mapped = data.map((row) => {
      const keys = Object.keys(row);
      const pick = (...names) => {
        const key = keys.find(k => names.some(name => k.toLowerCase().includes(name)));
        return key ? row[key] : "";
      };
      return {
        name: String(pick("particular", "product", "item") || "").trim(),
        price: Number(pick("selling", "rate", "price") || 0),
        total_stock: Number(pick("closing", "stock", "qty") || 0),
        internal_remarks: String(pick("remark") || "").trim()
      };
    }).filter(row => row.name);
    setRows(mapped.slice(0, 200));
    setNotice(`${mapped.length} stock rows found. Review the preview, then import as draft products.`);
  }
  async function importRows() {
    if (!branch?.id || !rows.length) return;
    const payload = rows.map(row => ({ ...row, branch_id: branch.id, category: "Other Appliances", subcategory: "Other", brand: "Other", status: "draft", image_urls: [], specifications_json: {}, product_variants: [], inventory_movements: [{ movement_type: "Opening Stock", quantity: row.total_stock, location: "Warehouse", remarks: "Imported from Excel stock sheet", created_at: new Date().toISOString() }] }));
    const { error } = await supabase.from("products").insert(payload);
    setNotice(error ? error.message : `${payload.length} draft products imported. Add photos, warranty, and full specs before publishing.`);
    if (!error) { setRows([]); refresh(); }
  }
  return <div className="panel import-panel field-full">
    <div className="section-mini-head"><div><strong>Bulk Excel import</strong><span>Use the STOCK sheet only. Sales sheets should stay for reporting.</span></div><label className="btn soft"><Upload size={16}/> Choose Excel<input type="file" accept=".xlsx,.xls" hidden onChange={onFile}/></label></div>
    {!!rows.length && <><div className="import-preview"><strong>{rows.length} draft rows ready</strong><span>Preview shows the first 5 rows.</span></div><table><thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Remarks</th></tr></thead><tbody>{rows.slice(0,5).map((row, i)=><tr key={i}><td>{row.name}</td><td>{money(row.price)}</td><td>{row.total_stock}</td><td>{row.internal_remarks}</td></tr>)}</tbody></table><button type="button" className="btn primary" onClick={importRows}><FileSpreadsheet size={17}/> Import as draft products</button></>}
  </div>;
}

function StoreProductTypeChooser({ onPick }) {
  const items = [
    ["Refrigerators", "Add Refrigerator", "Single, double, triple, 4 door, side-by-side and French door"],
    ["Washing Machines", "Add Washing Machine", "Semi-auto, top load, front load and washer dryer"],
    ["Televisions & Displays", "Add Television & Display", "Smart TV, Android TV, Google voice, LED, QLED and OLED"],
    ["Air Conditioners", "Add Air Conditioner", "Inverter, non-inverter and hot & cold AC"],
    ["Kitchen Appliances", "Add Kitchen Appliance", "Microwave oven, OTG and air fryer"],
    ["Cooling & Commercial", "Add Cooling & Commercial", "Deep freezer, visi cooler and glass door cooling"],
    ["Water Appliances", "Add Water Appliance", "Water dispenser"],
    ["Other Appliances", "Add Other Appliance", "Stands, accessories and future categories"]
  ];
  return <section className="product-type-picker panel">
    <div className="product-type-picker-head"><div><span className="eyebrow">ADD A PRODUCT</span><h2>What are you adding today?</h2><p>Choose a product type. You will only see the fields that matter for that appliance.</p></div></div>
    <div className="product-type-grid">{items.map(([category,title,detail]) => <button key={category} type="button" className="product-type-card" onClick={() => onPick(category)}><strong>{title}</strong><span>{detail}</span><b>Open form →</b></button>)}</div>
  </section>;
}

const SUBCATEGORY_SPEC_KEY = {
  "Refrigerators": "Door type",
  "Washing Machines": "Machine type",
  "Televisions & Displays": "TV type",
  "Kitchen Appliances": "Appliance type",
  "Cooling & Commercial": "Cooling type"
};

function StoreAdminFields({ form, change, branch, refresh, setNotice, onBack }) {
  const category = form.category || "Refrigerators";
  const specs = specsFor(form);
  const fields = SPEC_FIELD_CONFIGS[category] || SPEC_FIELD_CONFIGS["Other Appliances"];
  const setSpec = (key, value) => {
    const nextSpecs = { ...specs, [key]: value };
    const nextFields = { specifications_json: nextSpecs };
    if (SUBCATEGORY_SPEC_KEY[category] === key) {
      nextFields.subcategory = Array.isArray(value) ? (value[0] || "") : value;
    }
    change(nextFields);
  };
  const movements = movementsFor(form);
  const renderSpecField = (field) => {
    if (field.type === "multi") {
      return <MultiOptionPicker key={field.key} label={field.label} description={field.description || `Select or add every ${field.label.toLowerCase()} option for this product.`} options={field.options} value={specs[field.key]} onChange={(value) => setSpec(field.key, value)} placeholder={field.placeholder || `Add another ${field.label.toLowerCase()}`} />;
    }
    return <label className="field-label" key={field.key}>{field.label}{field.type === "select" ? <select value={specs[field.key] || ""} onChange={e => setSpec(field.key, e.target.value)}><option value="">Select {field.label}</option>{field.options.map(option => <option key={option} value={option}>{option}</option>)}</select> : field.type === "stars" ? <div className="rating-picker"><StarRating value={specs[field.key] || 0} max={field.max || 5} interactive onChange={value => setSpec(field.key, value)} label={field.label}/><button type="button" className="rating-clear" onClick={() => setSpec(field.key, "")}>Clear</button></div> : <div className="suffix-input"><input type={field.type || "text"} value={specs[field.key] || ""} onChange={e => setSpec(field.key, e.target.value)} placeholder={field.placeholder || field.label}/>{field.suffix && <span>{field.suffix}</span>}</div>}</label>;
  };
  const step = (number, title, text) => <div className="form-step-title field-full"><span>{number}</span><div><strong>{title}</strong><small>{text}</small></div></div>;
  return <>
    <div className="store-form-header field-full"><div><span className="eyebrow">{form.id ? "EDIT PRODUCT" : "ADD PRODUCT"}</span><h2>{form.id ? form.name || "Edit product" : `Add ${category}`}</h2><p>Only the details relevant to this appliance are shown below.</p></div><button type="button" className="btn soft" onClick={onBack}>← Back to product types</button></div>
    <div className="new-arrival-notice field-full"><Sparkles size={20}/><div><strong>New Arrival runs automatically</strong><span>Every newly uploaded Store product gets this tag for {NEW_ARRIVAL_DAYS} days. It expires automatically, and editing the product does not restart the period.</span></div></div>
    {step(1, "Basic product details", "These details are visible to customers.")}
    <input required value={form.name || ""} onChange={e => change("name", e.target.value)} placeholder="Product name, e.g. Haier 190L Refrigerator"/>
    <select value={form.brand || "Haier"} onChange={e => change("brand", e.target.value)}>{APPLIANCE_BRANDS.map(brand => <option key={brand}>{brand}</option>)}</select>
    <input value={form.model_number || ""} onChange={e => change("model_number", e.target.value)} placeholder="Main model number"/>
    {step(2, `${category} specifications`, "Only fields that apply to this appliance are shown.")}
    <div className="category-specific-fields field-full">
      {fields.map(renderSpecField)}
    </div>
    <ColorPicker colors={form.colors} onChange={(value) => change("colors", value)} itemLabel="product" />
    <textarea className="field-full" rows="3" value={form.specifications || ""} onChange={e=>change("specifications",e.target.value)} placeholder="Extra specifications or customer-facing notes"/>
    {step(3, "Price, GST and stock", "Enter the basic price. The final customer price is calculated automatically after GST and discount.")}
    <label className="field-label">Basic price before GST (Nu.)<input required type="number" min="0" step="0.01" inputMode="decimal" value={form.base_price === undefined || form.base_price === null ? "" : form.base_price} onChange={e=>change("base_price", e.target.value)} placeholder="e.g. 13800"/></label>
    <label className="field-label">GST percentage<input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={form.gst_percent ?? 0} onChange={e=>change("gst_percent",e.target.value)} placeholder="e.g. 5"/></label>
    <label className="field-label">Discount percentage<input type="number" min="0" max="100" step="0.01" inputMode="decimal" value={form.discount_percent ?? 0} onChange={e=>change("discount_percent",e.target.value)} placeholder="Optional"/></label>
    <div className="motor-price-preview field-full"><span>Customer price preview</span><ProductPrice item={{...form, base_price: form.base_price ?? form.price}} /></div>
    <label className="field-label">Total stock received<input type="number" min="0" step="1" value={form.total_stock ?? 0} onChange={e=>change("total_stock",e.target.value)} placeholder="e.g. 10"/></label>
    <label className="field-label">Sold quantity<input type="number" min="0" step="1" value={form.sold_quantity ?? 0} onChange={e=>change("sold_quantity",e.target.value)} placeholder="e.g. 0"/></label>
    <p className="field-full stock-status-hint">Available stock: <b>{Math.max(0, Number(form.total_stock || 0) - Number(form.sold_quantity || 0))}</b>. When sold quantity reaches total stock, this product is automatically marked Out of Stock.</p>
    {step(4, "Photos and publish", "Add customer-facing photos, then choose whether to save as a draft or publish.")}

  </>;
}

function Manage({ role, branch, items, editing, setEditing, refresh, remove, notice, setNotice }) {
  const [qrProduct,setQrProduct]=useState(null);
  const [selectedStoreType, setSelectedStoreType] = useState(null);
  const [adminFilters, setAdminFilters] = useState({ q: "", category: "All", brand: "All", stock: "All" });
  const table=role==="store_admin"?"products":role==="real_estate_admin"?"properties":"vehicles";
  const blank=role==="store_admin"?{name:"",category:"Refrigerators",subcategory:"",brand:"Haier",model_number:"",price:"",base_price:"",gst_percent:0,discount_percent:0,total_stock:0,sold_quantity:0,image_urls:[],status:"available",description:"",specifications:"",specifications_json:{},product_variants:[],inventory_movements:[],featured:false,new_arrival:false,colors:[]}
    :role==="real_estate_admin"?{title:"",property_type:"",location:"",address:"",map_url:"",latitude:"",longitude:"",area:"",price:"",image_urls:[],status:"available",description:"",ownership_type:"",registration_status:"",road_access:"",water_connection:"",electricity_connection:"",property_condition:"",featured:false,new_arrival:false}
    :{brand:"",model:"",manufacture_date:"",year:"",mileage:"",fuel_type:"Petrol",transmission:"Automatic",base_price:"",gst_percent:0,discount_percent:0,price:"",image_urls:[],status:"available",specifications:"",colors:[],video_url:""};
  const form=editing&&Object.keys(editing).length?editing:blank;
  const change=(key,value)=>setEditing((current) => {
    const base = current && Object.keys(current).length ? current : blank;
    return key && typeof key === "object" ? { ...base, ...key } : { ...base, [key]: value };
  });
  async function save(e){e.preventDefault();if(!branch?.id)return setNotice("Your branch profile could not be found.");
    const payload={...form,branch_id:branch.id,image_urls:(form.image_urls||[]).filter(Boolean).slice(0,10)};delete payload.image_url;
    if(role==="store_admin"){
      payload.specifications_json = cleanProductSpecs(payload);
      payload.inventory_movements = movementsFor(payload).map(movement => ({...movement, quantity: Number(movement.quantity || 0)}));
      const base = Math.max(0, Number(payload.base_price ?? payload.price ?? 0));
      const gst = Math.max(0, Number(payload.gst_percent ?? 0));
      const discount = Math.max(0, Math.min(100, Number(payload.discount_percent ?? 0)));
      payload.base_price = base;
      payload.gst_percent = gst;
      payload.discount_percent = discount;
      payload.price = Math.round(base * (1 + gst / 100) * (1 - discount / 100));
      payload.total_stock = Math.max(0, Number(payload.total_stock || 0));
      payload.sold_quantity = Math.max(0, Math.min(payload.total_stock, Number(payload.sold_quantity || 0)));
      // When the admin leaves status as Available/Out of stock (including the default for a
      // new product), stock count decides which of the two applies. Any other explicitly
      // chosen status (Draft/Reserved/Sold/Coming soon) is respected as-is, new or edited.
      if (["available", "out_of_stock"].includes(normalizeStatus(payload.status) || "available")) {
        payload.status = payload.sold_quantity >= payload.total_stock ? "out_of_stock" : "available";
      }
      delete payload.warranty_period;
      delete payload.warranty_details;
      delete payload.delivery_installation;
      delete payload.product_condition;
      payload.colors=(payload.colors||[]).map(c=>String(c).trim()).filter(Boolean);
    }
    if(role==="real_estate_admin"){
      // Do not send empty strings to numeric database columns. This previously caused the “invalid input syntax for type numeric” error.
      ["latitude", "longitude"].forEach((key) => {
        if (payload[key] === "" || payload[key] === null || payload[key] === undefined) delete payload[key];
        else payload[key] = Number(payload[key]);
      });
      // These legacy fields are not part of the simplified Real Estate form.
      ["ownership_type", "registration_status", "road_access", "water_connection", "electricity_connection", "property_condition", "featured", "new_arrival"].forEach((key) => delete payload[key]);
      if (payload.price === "" || payload.price === null || payload.price === undefined) payload.price = null;
      else payload.price = Number(payload.price);
      ["title", "property_type", "location", "area", "address", "map_url", "description"].forEach((key) => {
        if (typeof payload[key] === "string") payload[key] = payload[key].trim();
      });
    }
    if(role==="motors_admin"){
      const base=Number(payload.base_price ?? payload.price ?? 0);
      const gst=Math.max(0,Number(payload.gst_percent ?? 0));
      const discount=Math.max(0,Math.min(100,Number(payload.discount_percent ?? 0)));
      payload.base_price=base;
      payload.gst_percent=gst;
      payload.discount_percent=discount;
      payload.price=Math.round(base*(1+gst/100)*(1-discount/100));
      if(payload.manufacture_date) payload.year=new Date(`${payload.manufacture_date}T00:00:00`).getFullYear();
      payload.colors=(payload.colors||[]).map(c=>String(c).trim()).filter(Boolean);
    }
    for(const key of ["price","base_price","gst_percent","discount_percent","total_stock","sold_quantity","year","mileage"])if(payload[key]!==undefined&&payload[key]!=="")payload[key]=Number(payload[key]);
    const request=form.id?supabase.from(table).update(payload).eq("id",form.id):supabase.from(table).insert(payload);
    const {error}=await request;setNotice(error?error.message:"Saved. Your listing is live.");if(!error){setEditing(null);refresh();}
  }
  // specifications_json only exists on the products table - attaching it to
  // the editing state for real_estate_admin/motors_admin items causes Supabase
  // to reject the save with "Could not find the 'specifications_json' column"
  // on properties/vehicles, since that key would be spread into the update
  // payload regardless of role.
  const editItem=(item)=>{ setEditing({...item,image_urls:getImages(item),...(role==="store_admin"?{specifications_json:specsFor(item)}:{})}); if(role==="store_admin") setSelectedStoreType(item.category || "Other Appliances"); window.scrollTo({top:0,behavior:"smooth"}); };
  const duplicateItem=(item)=>{const copy={...item,id:undefined,name:`${item.name || "Product"} copy`,created_at:undefined,image_urls:getImages(item),...(role==="store_admin"?{specifications_json:specsFor(item)}:{})};setEditing(copy);if(role==="store_admin")setSelectedStoreType(copy.category || "Other Appliances");window.scrollTo({top:0,behavior:"smooth"});};
  const categories=["All",...Object.keys(APPLIANCE_CATEGORIES)];
  const brands=["All",...APPLIANCE_BRANDS];
  const filteredItems=items.filter(item=>{
    const search=role==="store_admin"?`${item.name||""} ${item.brand||""} ${item.model_number||""}`.toLowerCase()
      :role==="real_estate_admin"?`${item.title||""} ${item.property_type||""} ${item.location||""}`.toLowerCase()
      :`${item.brand||""} ${item.model||""}`.toLowerCase();
    const stock=productAvailableStock(item);
    const matchesSearch=!adminFilters.q || search.includes(adminFilters.q.toLowerCase());
    const matchesCategory=role!=="store_admin" || adminFilters.category==="All" || item.category===adminFilters.category;
    const matchesBrand=role!=="store_admin" || adminFilters.brand==="All" || item.brand===adminFilters.brand;
    const matchesStatus=adminFilters.stock==="All"
      || (adminFilters.stock==="Out of stock" ? (role==="store_admin" ? stock<=0 : normalizeStatus(item.status)==="out_of_stock")
        : adminFilters.stock==="New arrival" ? isNewArrival(item)
        : normalizeStatus(item.status)===normalizeStatus(adminFilters.stock));
    return matchesSearch && matchesCategory && matchesBrand && matchesStatus;
  });
  const showStoreForm = role !== "store_admin" || !!form.id || !!selectedStoreType;
  const pickStoreType = (category) => { setSelectedStoreType(category); setEditing({ ...blank, category, subcategory: "" }); window.scrollTo({top:0,behavior:"smooth"}); };
  const backToStoreTypes = () => { setSelectedStoreType(null); setEditing(null); setNotice(""); };
  return <><div className="dash-head"><div><span className="eyebrow">MANAGE LISTINGS</span><h1>{role==="store_admin" ? (showStoreForm ? (form.id ? "Edit product" : "Add a product") : "Add store products") : (form.id?"Edit listing":"Add a new listing")}</h1><p>{role==="store_admin"?"Choose an appliance type first. Each form stays focused on only the details you need.":"Add quality details, condition information, and Home-page labels."}</p></div></div>
  {role==="store_admin" && !showStoreForm ? <StoreProductTypeChooser onPick={pickStoreType}/> : <form className="admin-form panel" onSubmit={save}>
  {role==="store_admin"&&<StoreAdminFields form={form} change={change} branch={branch} refresh={refresh} setNotice={setNotice} onBack={backToStoreTypes}/>} 
  {role==="real_estate_admin"&&<>
    <input value={form.title||""} onChange={e=>change("title",e.target.value)} placeholder="Listing title" required/>
    <select value={form.property_type||"Land"} onChange={e=>change("property_type",e.target.value)}><option value="Land">Land</option><option value="House">House</option><option value="Apartment">Apartment</option><option value="Commercial Space">Commercial Space</option><option value="Commercial Land">Commercial Land</option><option value="Office Space">Office Space</option><option value="Farm Land">Farm Land</option><option value="Rental Property">Rental Property</option><option value="Other">Other</option></select>
    <input value={form.location||""} onChange={e=>change("location",e.target.value)} placeholder="Location / Area" />
    <input value={form.area||""} onChange={e=>change("area",e.target.value)} placeholder="Land area / Bedrooms / Floor area" />
    <input type="number" value={form.price??""} onChange={e=>change("price",e.target.value)} placeholder="Price in Nu." />
    <input className="field-full" value={form.address||""} onChange={e=>change("address",e.target.value)} placeholder="Full property address" />
    <input className="field-full" type="url" value={form.map_url||""} onChange={e=>change("map_url",e.target.value)} placeholder="Google Maps link (optional)" />
  </>}
  {role==="motors_admin"&&<>
    <input required value={form.brand||""} onChange={e=>change("brand",e.target.value)} placeholder="Brand"/><input required value={form.model||""} onChange={e=>change("model",e.target.value)} placeholder="Model"/>
    <label className="date-field">Manufacturing year <input type="date" value={form.manufacture_date||""} onChange={e=>change("manufacture_date",e.target.value)} required /></label>
    <input type="number" value={form.mileage??""} onChange={e=>change("mileage",e.target.value)} placeholder="Mileage (km)"/><select value={form.fuel_type||"Petrol"} onChange={e=>change("fuel_type",e.target.value)}><option>Petrol</option><option>Diesel</option><option>Electric</option><option>Hybrid</option><option>Plug-in Hybrid</option></select>
    <select value={form.transmission||"Automatic"} onChange={e=>change("transmission",e.target.value)}><option>Automatic</option><option>Manual</option><option>CVT</option><option>AMT</option></select>
    <input type="number" min="0" value={form.base_price??form.price??""} onChange={e=>change("base_price",e.target.value)} placeholder="Basic price in Nu."/><input type="number" min="0" max="100" step="0.01" value={form.gst_percent??0} onChange={e=>change("gst_percent",e.target.value)} placeholder="GST percentage"/><input type="number" min="0" max="100" step="0.01" value={form.discount_percent??0} onChange={e=>change("discount_percent",e.target.value)} placeholder="Discount percentage"/>
    <div className="motor-price-preview field-full"><span>Price preview</span><VehiclePrice item={{...form,base_price:form.base_price??form.price}} /></div>
    <ColorPicker colors={form.colors} onChange={(value) => change("colors", value)} itemLabel="vehicle" />
  </>}
  {role==="real_estate_admin"&&<textarea className="field-full" rows="3" value={form.description||""} onChange={e=>change("description",e.target.value)} placeholder="Description"/>}
  {role==="motors_admin"&&<textarea className="field-full" rows="3" value={form.specifications||""} onChange={e=>change("specifications",e.target.value)} placeholder="Key specifications"/>}
  <ImageUrlManager images={form.image_urls||[]} onChange={value=>change("image_urls",value)}/>
  {role==="motors_admin"&&<VideoUrlManager value={form.video_url||""} onChange={value=>change("video_url",value)}/>}
  <select value={form.status||"available"} onChange={e=>change("status",e.target.value)}>{STATUS_OPTIONS_BY_ROLE[role].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>
  <button className="btn primary"><Save size={18}/>Save listing</button>{notice&&<p className={notice.toLowerCase().includes("saved")||notice.toLowerCase().includes("import")?"form-message success":"form-message error"}>{notice}</p>}
  </form>}
  <div className="panel admin-filters">
    <input value={adminFilters.q} onChange={e=>setAdminFilters({...adminFilters,q:e.target.value})} placeholder={role==="store_admin"?"Search by name or model number":role==="real_estate_admin"?"Search by title or location":"Search by brand or model"}/>
    {role==="store_admin"&&<select value={adminFilters.category} onChange={e=>setAdminFilters({...adminFilters,category:e.target.value})}>{categories.map(x=><option key={x}>{x}</option>)}</select>}
    {role==="store_admin"&&<select value={adminFilters.brand} onChange={e=>setAdminFilters({...adminFilters,brand:e.target.value})}>{brands.map(x=><option key={x}>{x}</option>)}</select>}
    <select value={adminFilters.stock} onChange={e=>setAdminFilters({...adminFilters,stock:e.target.value})}>
      <option>All</option>
      {role==="store_admin"&&<option>Out of stock</option>}
      <option>New arrival</option>
      {STATUS_OPTIONS_BY_ROLE[role].filter(([value])=>value!=="out_of_stock").map(([value,label])=><option key={value} value={value}>{label}</option>)}
    </select>
  </div>
  <div className="panel"><div className="panel-head"><h3>{role==="store_admin"?"Inventory products":"Your saved listings"}</h3></div><table><thead><tr>{role==="store_admin"?<><th>Product</th><th>Brand</th><th>Model</th><th>Main spec</th><th>Price</th><th>Stock</th><th>New Arrival</th><th>Status</th><th></th></>:<><th>Listing</th><th>New Arrival</th><th>Status</th><th></th></>}</tr></thead><tbody>{filteredItems.map(item=>{const daysRemaining=newArrivalDaysRemaining(item);const stock=productAvailableStock(item);return role==="store_admin"?<tr key={item.id}><td><b>{item.name}</b><br/><span className="muted-cell">{item.category}{item.subcategory?` · ${item.subcategory}`:""}</span></td><td>{item.brand}</td><td>{item.model_number || "—"}</td><td>{getMainSpec(item) || "—"}</td><td><ProductPrice item={item} compact /></td><td><b>{stock}</b></td><td>{daysRemaining?<span className="arrival-expiry">New · {daysRemaining} {daysRemaining===1?"day":"days"} left</span>:<span className="muted-cell">No active tag</span>}</td><td><Badge>{productAvailabilityLabel(item)}</Badge></td><td><button className="icon-action" title="Duplicate product" onClick={()=>duplicateItem(item)}><FileText size={17}/></button><button className="icon-action" title="Print QR" onClick={()=>setQrProduct(item)}><QrCode size={17}/></button><button className="icon-action" onClick={()=>editItem(item)}><Edit3 size={17}/></button><button className="icon-action danger" onClick={()=>remove(item)}><Trash2 size={17}/></button></td></tr>:<tr key={item.id}><td>{item.name||item.title||`${item.brand} ${item.model}`}</td><td>{daysRemaining?<span className="arrival-expiry">New · {daysRemaining} {daysRemaining===1?"day":"days"} left</span>:<span className="muted-cell">No active tag</span>}</td><td><Badge>{productAvailabilityLabel(item)}</Badge></td><td>{role==="store_admin"&&<button className="icon-action" onClick={()=>setQrProduct(item)}><QrCode size={17}/></button>}<button className="icon-action" onClick={()=>editItem(item)}><Edit3 size={17}/></button><button className="icon-action danger" onClick={()=>remove(item)}><Trash2 size={17}/></button></td></tr>})}</tbody></table></div>{qrProduct&&<QRModal product={qrProduct} onClose={()=>setQrProduct(null)}/>}</>;
}


function StoreOperations({ products, branch, refreshProducts }) {
  const [tab, setTab] = useState("sales");
  const [message, setMessage] = useState("");
  const [records, setRecords] = useState({ sales: [] });
  const [editingId, setEditingId] = useState(null);
  const [editSale, setEditSale] = useState({});
  const [sale, setSale] = useState({ product_id: "", quantity: 1, sale_date: new Date().toISOString().slice(0,10), bill_number: "", customer_name: "", customer_phone: "", customer_address: "", basic_price: "", gst_percent: 5, discount_percent: 0, payment_method: "Bank Transfer", bank_reference: "", cash_amount: "", paid_amount: "", remarks: "" });
  const selectedSaleProduct = products.find(x => x.id === sale.product_id);
  const saleBase = Number(sale.basic_price || selectedSaleProduct?.base_price || selectedSaleProduct?.price || 0);
  const saleGst = Math.round(saleBase * Math.max(0, Number(sale.gst_percent || 0)) / 100);
  const saleSubtotal = saleBase + saleGst;
  const saleDiscount = Math.round(saleSubtotal * Math.max(0, Number(sale.discount_percent || 0)) / 100);
  const saleUnitFinal = Math.max(0, saleSubtotal - saleDiscount);
  const unitsBuying = Math.max(1, Number(sale.quantity || 1));
  const saleFinal = saleUnitFinal * unitsBuying;
  const calculatedPaid = sale.payment_method === "Cash" ? Number(sale.cash_amount || 0) : Number(sale.paid_amount || 0);
  const saleBalance = Math.max(0, saleFinal - calculatedPaid);

  async function loadRecords() {
    if (!supabase) return;
    const salesRes = await supabase.from("store_sales").select("*,store_sale_items(*)").order("sale_date", { ascending: false }).limit(100);
    setRecords({ sales: salesRes.data || [] });
  }
  useEffect(() => { loadRecords(); }, []);

  function chooseSaleProduct(id) {
    const p = products.find(x => x.id === id);
    setSale(v => ({ ...v, product_id: id, basic_price: p ? (p.base_price ?? p.price ?? "") : "", gst_percent: p?.gst_percent ?? 5, discount_percent: p?.discount_percent ?? 0 }));
  }
  function changePaymentMethod(method) {
    setSale(v => ({ ...v, payment_method: method, bank_reference: method === "Cash" ? "" : v.bank_reference, cash_amount: method === "Cash" ? String(saleFinal || "") : v.cash_amount, paid_amount: method === "Cash" ? "" : v.paid_amount }));
  }
  async function saveSale(e) {
    e.preventDefault();
    if (!sale.product_id || !sale.customer_name || !sale.customer_phone || !sale.quantity) return setMessage("Complete product, customer, phone, and number of items.");
    const p = products.find(x => x.id === sale.product_id);
    const qty = Math.max(1, Number(sale.quantity));
    const available = productAvailableStock(p);
    if (qty > available) return setMessage(`Only ${available} unit(s) are available.`);
    let customerId = null;
    const customer = { full_name: sale.customer_name, phone: sale.customer_phone, address: sale.customer_address || null };
    const customerResult = await supabase.from("store_customers").upsert(customer, { onConflict: "phone" }).select().single();
    if (!customerResult.error) customerId = customerResult.data?.id || null;
    const paid = calculatedPaid;
    const payload = { branch_id: branch?.id || null, customer_id: customerId, sale_date: sale.sale_date, bill_number: sale.bill_number || null, basic_amount: saleBase * qty, gst_percent: Number(sale.gst_percent || 0), gst_amount: saleGst * qty, discount_percent: Number(sale.discount_percent || 0), discount_amount: saleDiscount * qty, total_amount: saleFinal, payment_method: sale.payment_method, bank_reference: sale.bank_reference || null, cash_amount: Number(sale.cash_amount || 0), paid_amount: paid, customer_name: sale.customer_name, customer_phone: sale.customer_phone, payment_status: paid >= saleFinal ? "Paid" : "Pending", remarks: sale.remarks || null };
    const saleResult = await supabase.from("store_sales").insert(payload).select().single();
    if (saleResult.error) return setMessage(saleResult.error.message);
    await supabase.from("store_sale_items").insert({ sale_id: saleResult.data.id, product_id: p.id, product_name: p.name, model_number: p.model_number || null, quantity: qty, basic_unit_price: saleBase, gst_percent: Number(sale.gst_percent || 0), gst_unit_amount: saleGst, discount_percent: Number(sale.discount_percent || 0), discount_unit_amount: saleDiscount, final_unit_price: saleUnitFinal, line_total: saleUnitFinal * qty });
    const updatedSold = Math.min(productTotalStock(p), Math.max(0, productSoldQuantity(p) + qty));
    await supabase.from("products").update({ sold_quantity: updatedSold, status: updatedSold >= productTotalStock(p) ? "out_of_stock" : "available" }).eq("id", p.id);
    setMessage("Sale saved and stock updated.");
    setSale({ product_id:"", quantity:1, sale_date:new Date().toISOString().slice(0,10), bill_number:"", customer_name:"", customer_phone:"", customer_address:"", basic_price:"", gst_percent:5, discount_percent:0, payment_method:"Bank Transfer", bank_reference:"", cash_amount:"", paid_amount:"", remarks:"" });
    refreshProducts(); loadRecords();
  }
  function beginEdit(s) { setEditingId(s.id); setEditSale({ ...s, paid_amount: Number(s.paid_amount || 0), total_amount: Number(s.total_amount || 0), customer_address: s.customer_address || "" }); }
  async function saveReportUpdate() {
    const total = Number(editSale.total_amount || 0), paid = Number(editSale.paid_amount || 0);
    const update = { customer_name: editSale.customer_name, customer_phone: editSale.customer_phone, bill_number: editSale.bill_number || null, payment_method: editSale.payment_method, bank_reference: editSale.bank_reference || null, paid_amount: paid, cash_amount: editSale.payment_method === "Cash" ? paid : Number(editSale.cash_amount || 0), payment_status: paid >= total ? "Paid" : "Pending", remarks: editSale.remarks || null };
    const { error } = await supabase.from("store_sales").update(update).eq("id", editingId);
    if (error) return setMessage(error.message);
    if (editSale.customer_phone) await supabase.from("store_customers").upsert({ full_name: editSale.customer_name, phone: editSale.customer_phone, address: editSale.customer_address || null }, { onConflict: "phone" });
    setMessage("Report record updated."); setEditingId(null); loadRecords();
  }
  const salesTotal = records.sales.reduce((sum,x)=>sum+Number(x.total_amount||0),0);
  const pendingTotal = records.sales.reduce((sum,x)=>sum+Math.max(0,Number(x.total_amount||0)-Number(x.paid_amount||0)),0);
  function exportSales() { const ws=XLSX.utils.json_to_sheet(records.sales.map(s=>({Date:s.sale_date,Bill:s.bill_number,Customer:s.customer_name||"",Phone:s.customer_phone||"",Items:(s.store_sale_items||[]).map(i=>`${i.product_name} × ${i.quantity}`).join("; "),Total:s.total_amount,Paid:s.paid_amount,Balance:Math.max(0,Number(s.total_amount||0)-Number(s.paid_amount||0)),Payment:s.payment_method,Status:s.payment_status}))); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Sales Report"); XLSX.writeFile(wb,"pdexpress-sales-report.xlsx"); }
  return <section className="store-operations"><div className="dash-head"><div><span className="eyebrow">STORE SALES</span><h1>Sales and payment records</h1><p>Create sales from products already uploaded. The report keeps each customer, item, payment and balance in one place.</p></div></div>
    <div className="operation-tabs"><button className={tab==="sales"?"active":""} onClick={()=>setTab("sales")}><ReceiptText size={17}/>New sale</button><button className={tab==="reports"?"active":""} onClick={()=>setTab("reports")}><BarChart3 size={17}/>Reports</button></div>
    {message && <p className={message.toLowerCase().includes("could not") || message.toLowerCase().includes("error") ? "form-message error" : "form-message success"}>{message}</p>}
    {tab==="sales" && <form className="panel sales-form" onSubmit={saveSale}><div className="panel-title"><ReceiptText size={20}/><h2>Create sale and invoice record</h2></div><div className="admin-form"><label className="field-label">Sale date<input type="date" value={sale.sale_date} onChange={e=>setSale({...sale,sale_date:e.target.value})}/></label><input value={sale.bill_number} onChange={e=>setSale({...sale,bill_number:e.target.value})} placeholder="Bill number"/><input required value={sale.customer_name} onChange={e=>setSale({...sale,customer_name:e.target.value})} placeholder="Customer name"/><input required value={sale.customer_phone} onChange={e=>setSale({...sale,customer_phone:e.target.value})} placeholder="Customer contact number"/><input className="field-full" value={sale.customer_address} onChange={e=>setSale({...sale,customer_address:e.target.value})} placeholder="Customer address"/><select className="field-full" required value={sale.product_id} onChange={e=>chooseSaleProduct(e.target.value)}><option value="">Choose product</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} · {p.model_number||"No model"} · {productAvailableStock(p)} available</option>)}</select><label className="field-label">How many of this product is the customer buying?<input required type="number" min="1" max={selectedSaleProduct ? productAvailableStock(selectedSaleProduct) : undefined} value={sale.quantity} onChange={e=>setSale({...sale,quantity:e.target.value})}/></label><label className="field-label">Basic unit price before GST<input required type="number" min="0" value={sale.basic_price} onChange={e=>setSale({...sale,basic_price:e.target.value})}/></label><label className="field-label">GST %<input type="number" min="0" max="100" step="0.01" value={sale.gst_percent} onChange={e=>setSale({...sale,gst_percent:e.target.value})}/></label><label className="field-label">Discount %<input type="number" min="0" max="100" step="0.01" value={sale.discount_percent} onChange={e=>setSale({...sale,discount_percent:e.target.value})}/></label><select value={sale.payment_method} onChange={e=>changePaymentMethod(e.target.value)}>{["Bank Transfer","Cash","Mixed Payment","Credit / Pending Payment","Other"].map(x=><option key={x}>{x}</option>)}</select>{sale.payment_method!=="Cash"&&<input value={sale.bank_reference} onChange={e=>setSale({...sale,bank_reference:e.target.value})} placeholder="Journal / RRN / transfer number"/>}{sale.payment_method!=="Bank Transfer"&&<label className="field-label">Cash received<input type="number" min="0" value={sale.cash_amount} onChange={e=>setSale({...sale,cash_amount:e.target.value})}/></label>} {sale.payment_method!=="Cash"&&<label className="field-label">Amount paid now<input type="number" min="0" value={sale.paid_amount} onChange={e=>setSale({...sale,paid_amount:e.target.value})}/></label>}<textarea className="field-full" value={sale.remarks} onChange={e=>setSale({...sale,remarks:e.target.value})} placeholder="Optional remarks"/><div className="sale-total-preview field-full"><span>One item: {money(saleBase)} + GST {money(saleGst)} − discount {money(saleDiscount)} = {money(saleUnitFinal)}</span><span>Customer is buying: <b>{unitsBuying} item(s)</b></span><strong>Total customer needs to pay: {money(saleFinal)}</strong><strong>Paid now: {money(calculatedPaid)} · Balance: {money(saleBalance)}</strong></div></div><button className="btn primary"><Save size={18}/>Save sale and update stock</button></form>}
    {tab==="reports" && <><div className="reports-page"><div className="report-summary"><DashStat title="Recorded sales" value={records.sales.length} note="All saved invoices"/><DashStat title="Sales value" value={money(salesTotal)} note="GST inclusive"/><DashStat title="Outstanding balance" value={money(pendingTotal)} note="Amounts still unpaid"/></div></div><div className="panel"><div className="panel-head"><h3>Customer sales and payment report</h3><div className="report-actions"><button className="btn soft" onClick={exportSales}><FileSpreadsheet size={17}/>Export Excel</button></div></div><table><thead><tr><th>Date / Bill</th><th>Customer</th><th>Items bought</th><th>Total to pay</th><th>Paid</th><th>Balance</th><th>Payment / Status</th><th>Update</th></tr></thead><tbody>{records.sales.map(s=>{const balance=Math.max(0,Number(s.total_amount||0)-Number(s.paid_amount||0));const editing=editingId===s.id;return <tr key={s.id}><td>{s.sale_date}<br/><span className="muted-cell">{editing?<input value={editSale.bill_number||""} onChange={e=>setEditSale({...editSale,bill_number:e.target.value})}/>:s.bill_number||"—"}</span></td><td>{editing?<><input value={editSale.customer_name||""} onChange={e=>setEditSale({...editSale,customer_name:e.target.value})}/><input value={editSale.customer_phone||""} onChange={e=>setEditSale({...editSale,customer_phone:e.target.value})}/><input value={editSale.customer_address||""} onChange={e=>setEditSale({...editSale,customer_address:e.target.value})} placeholder="Address"/></>:<>{s.customer_name||"Customer"}<br/><span className="muted-cell">{s.customer_phone||"—"}</span></>}</td><td>{(s.store_sale_items||[]).map(i=><div key={i.id}>{i.product_name} × <b>{i.quantity}</b>{i.model_number?` (${i.model_number})`:""}</div>)}</td><td>{money(s.total_amount)}</td><td>{editing?<input type="number" min="0" value={editSale.paid_amount??0} onChange={e=>setEditSale({...editSale,paid_amount:e.target.value})}/>:money(s.paid_amount)}</td><td>{editing?money(Math.max(0,Number(editSale.total_amount||0)-Number(editSale.paid_amount||0))):money(balance)}</td><td>{editing?<><select value={editSale.payment_method||"Cash"} onChange={e=>setEditSale({...editSale,payment_method:e.target.value})}>{["Cash","Bank Transfer","Mixed Payment","Credit / Pending Payment","Other"].map(x=><option key={x}>{x}</option>)}</select>{editSale.payment_method!=="Cash"&&<input value={editSale.bank_reference||""} onChange={e=>setEditSale({...editSale,bank_reference:e.target.value})} placeholder="Journal/RRN"/>}</>:<>{s.payment_method}<br/><Badge>{balance===0?"Paid":"Pending"}</Badge></>}</td><td>{editing?<><button className="btn primary" type="button" onClick={saveReportUpdate}>Save</button><button className="btn soft" type="button" onClick={()=>setEditingId(null)}>Cancel</button></>:<><button className="icon-action" title="Update sale record" onClick={()=>beginEdit(s)}><Edit3 size={17}/></button></>}</td></tr>})}</tbody></table></div></>}</section>;
}

function QRModal({ product, onClose }) {
  const value = `${window.location.origin}/store?product=${product.id}`;
  return <div className="gallery-backdrop" onMouseDown={onClose}>
    <div className="qr-modal" onMouseDown={(event) => event.stopPropagation()}>
      <button className="gallery-close" onClick={onClose}><X /></button>
      <span className="eyebrow">PRODUCT QR CODE</span>
      <h2>{product.name}</h2>
      <div className="qr-box"><QRCodeSVG value={value} size={230} includeMargin /></div>
      <p>Scan to open this product page. Print this code for a shelf label or product tag.</p>
      <button className="btn primary" onClick={() => window.print()}><QrCode size={18} /> Print QR code</button>
    </div>
  </div>;
}

function formatReportDate(value) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  return isNaN(parsed) ? value : parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function AdminReports({ isSuper, branch }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportsError, setReportsError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ title: "", report_type: "Weekly update", reporting_period: "", summary: "" });
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [storeSales, setStoreSales] = useState([]);
  const [storeSalesLoading, setStoreSalesLoading] = useState(false);
  const [storeSalesError, setStoreSalesError] = useState("");

  async function loadReports() {
    if (!supabase) return;
    setLoading(true);
    setReportsError("");
    const query = isSuper
      ? supabase.from("branch_reports").select("*,branches(name,slug)").order("created_at", { ascending: false })
      : supabase.from("branch_reports").select("*").eq("branch_id", branch?.id || "00000000-0000-0000-0000-000000000000").order("created_at", { ascending: false });
    const { data, error } = await query;
    if (error) {
      console.error("[AdminReports] branch_reports query failed:", error);
      setReportsError(error.message);
      setReports([]);
    } else {
      setReports(data || []);
    }
    setLoading(false);
  }
  useEffect(() => { loadReports(); }, [isSuper, branch?.id]);

  async function loadStoreSalesForSuperAdmin() {
    if (!isSuper || !supabase) return;
    setStoreSalesLoading(true);
    setStoreSalesError("");
    const { data, error } = await supabase
      .from("store_sales")
      .select("*,store_sale_items(*)")
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[AdminReports] store_sales query failed:", error);
      setStoreSalesError(error.message);
      setStoreSales([]);
    } else {
      setStoreSales(data || []);
    }
    setStoreSalesLoading(false);
  }
  // Loaded eagerly (not lazily on card click) so the "Store Admin" count badge
  // above is accurate the moment this page opens, not just after it's clicked.
  useEffect(() => { if (isSuper) loadStoreSalesForSuperAdmin(); }, [isSuper]);

  async function deleteReport(id) {
    if (!window.confirm("Delete this submitted report? This cannot be undone.")) return;
    const { error } = await supabase.from("branch_reports").delete().eq("id", id);
    setMessage(error ? error.message : "Report deleted.");
    if (!error) loadReports();
  }

  function exportStoreSalesForSuperAdmin() {
    if (!storeSales.length) return setMessage("There are no Store Admin sales to export yet.");
    const rows = storeSales.map(s => ({
      Date: s.sale_date || "", Bill: s.bill_number || "", Customer: s.customer_name || "", Phone: s.customer_phone || "",
      Items: (s.store_sale_items || []).map(i => `${i.product_name} × ${i.quantity}${i.model_number ? ` (${i.model_number})` : ""}`).join("; "),
      "Total to pay": Number(s.total_amount || 0), Paid: Number(s.paid_amount || 0),
      Balance: Math.max(0, Number(s.total_amount || 0) - Number(s.paid_amount || 0)),
      Payment: s.payment_method || "", Status: s.payment_status || (Number(s.paid_amount || 0) >= Number(s.total_amount || 0) ? "Paid" : "Pending")
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{wch:14},{wch:12},{wch:24},{wch:16},{wch:52},{wch:16},{wch:16},{wch:16},{wch:20},{wch:14}];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Store Sales Report");
    XLSX.writeFile(wb, "pdexpress-store-sales-report.xlsx");
  }

  async function submitReport(e) {
    e.preventDefault();
    if (!branch?.id) return setMessage("Your branch profile could not be found.");
    const { data: auth } = await supabase.auth.getUser();
    const payload = { ...form, branch_id: branch.id, submitted_by: auth?.user?.id, title: form.title.trim(), summary: form.summary.trim() };
    const { error } = await supabase.from("branch_reports").insert(payload);
    if (error) return setMessage(error.message);
    setForm({ title: "", report_type: "Weekly update", reporting_period: "", summary: "" });
    setMessage("Report sent to Super Admin.");
    loadReports();
  }
  async function markReviewed(id) {
    const { error } = await supabase.from("branch_reports").update({ status: "reviewed", reviewed_at: new Date().toISOString() }).eq("id", id);
    setMessage(error ? error.message : "Report marked as reviewed.");
    if (!error) loadReports();
  }

  function reportGroup(r) {
    const slug = (r.branches?.slug || "").toLowerCase();
    if (slug === "real-estate") return "Real Estate Admin";
    if (slug === "motors") return "Motors Admin";
    if (slug === "store") return "Store Admin";
    // Fallback for a branch slug this page doesn't recognize yet (or a missing
    // branches join) so a report never silently vanishes from every group.
    const label = `${slug} ${r.branches?.name || ""} ${r.report_type || ""}`.toLowerCase();
    if (label.includes("real") || label.includes("estate") || label.includes("property")) return "Real Estate Admin";
    if (label.includes("motor") || label.includes("vehicle") || label.includes("car")) return "Motors Admin";
    return "Store Admin";
  }
  function exportBranchReports(group, list) {
    if (!list.length) return setMessage(`There are no ${group.toLowerCase()} reports to export yet.`);
    const rows = list.map(r => ({
      Branch: r.branches?.name || group,
      Report: r.title || "Untitled report",
      Type: r.report_type || "—",
      Report_Date: formatReportDate(r.reporting_period),
      Submitted: r.created_at ? new Date(r.created_at).toLocaleString() : "—",
      Status: r.status === "reviewed" ? "Reviewed" : "New",
      Summary: r.summary || ""
    }));
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [{wch:22},{wch:34},{wch:24},{wch:20},{wch:24},{wch:14},{wch:70}];
    XLSX.utils.book_append_sheet(workbook, sheet, group.replace(" Admin", ""));
    XLSX.writeFile(workbook, `pdexpress-${group.toLowerCase().replaceAll(" ", "-")}-reports.xlsx`);
  }
  if (isSuper) {
    const groups = ["Store Admin", "Real Estate Admin", "Motors Admin"];
    const selectedReports = selectedGroup ? reports.filter(r => reportGroup(r) === selectedGroup) : [];
    return <section className="reports-page"><div className="dash-head"><div><span className="eyebrow">SUPER ADMIN</span><h1>Reports from branch admins</h1><p>Choose one admin section below. Only that branch's reports will appear on this page.</p></div></div>
      <div className="report-group-buttons">{groups.map(group => { const count = group === "Store Admin" ? storeSales.length : reports.filter(r=>reportGroup(r)===group).length; const countLabel = group === "Store Admin" ? `${count} live sale record(s)` : `${count} report(s)`; const newCount = group === "Store Admin" ? 0 : reports.filter(r => reportGroup(r) === group && r.status !== "reviewed").length; return <button key={group} className={`report-group-button ${selectedGroup===group ? "active" : ""}`} onClick={()=>setSelectedGroup(group)}>{newCount > 0 && <span className="report-group-badge" aria-label={`${newCount} new report${newCount > 1 ? "s" : ""}`}>{newCount > 99 ? "99+" : newCount}</span>}<FileSpreadsheet size={25}/><span>View reports from</span><strong>{group}</strong><small>{countLabel}</small></button>; })}</div>
      {selectedGroup === "Store Admin" && <div className="panel report-group-panel"><div className="panel-head"><div><h3>Store Admin sales and payment report</h3><span className="muted-cell">Live sales data shown in the same sales-table format used by Store Admin.</span></div><div className="report-actions"><button className="btn soft" onClick={exportStoreSalesForSuperAdmin} disabled={!storeSales.length}><FileSpreadsheet size={16}/>Export Excel</button><button className="btn soft" onClick={loadStoreSalesForSuperAdmin}><RotateCcw size={16}/>Refresh</button></div></div>{storeSalesLoading ? <p>Loading Store Admin sales…</p> : storeSalesError ? <p className="form-message error">Could not load Store Admin sales: {storeSalesError}</p> : storeSales.length ? <table><thead><tr><th>Date / Bill</th><th>Customer</th><th>Items bought</th><th>Total to pay</th><th>Paid</th><th>Balance</th><th>Payment / Status</th></tr></thead><tbody>{storeSales.map(s=>{const balance=Math.max(0,Number(s.total_amount||0)-Number(s.paid_amount||0));return <tr key={s.id}><td>{s.sale_date || "—"}<br/><span className="muted-cell">{s.bill_number || "—"}</span></td><td>{s.customer_name || "Customer"}<br/><span className="muted-cell">{s.customer_phone || "—"}</span></td><td>{(s.store_sale_items||[]).map(i=><div key={i.id}>{i.product_name} × <b>{i.quantity}</b>{i.model_number?` (${i.model_number})`:""}</div>)}</td><td>{money(s.total_amount)}</td><td>{money(s.paid_amount)}</td><td>{money(balance)}</td><td>{s.payment_method || "—"}<br/><Badge>{balance===0?"Paid":"Pending"}</Badge></td></tr>})}</tbody></table> : <p>No Store Admin sales have been recorded yet.</p>}<p className="muted-cell store-live-note">This is a live view of Store Admin sales. Store Admin does not need to submit separate reports.</p></div>}
      {selectedGroup && selectedGroup !== "Store Admin" && <div className="panel report-group-panel"><div className="panel-head"><div><h3>{selectedGroup} reports</h3><span className="muted-cell">Only reports sent by {selectedGroup.toLowerCase()} are shown below.</span></div><div className="report-actions"><button className="btn soft" onClick={()=>exportBranchReports(selectedGroup,selectedReports)} disabled={!selectedReports.length}><FileSpreadsheet size={16}/>Export Excel</button><button className="btn soft" onClick={loadReports}><RotateCcw size={16}/>Refresh</button></div></div>{loading ? <p>Loading reports…</p> : reportsError ? <p className="form-message error">Could not load {selectedGroup} reports: {reportsError}</p> : selectedReports.length ? <table><thead><tr><th>Report</th><th>Type</th><th>Summary</th><th>Report date</th><th>Status</th><th>Actions</th></tr></thead><tbody>{selectedReports.map(r=><tr key={r.id}><td><b>{r.title}</b></td><td>{r.report_type}</td><td className="report-summary-cell muted-cell">{r.summary}</td><td>{formatReportDate(r.reporting_period)}</td><td><Badge>{r.status === "reviewed" ? "Reviewed" : "New"}</Badge></td><td className="table-actions">{r.status !== "reviewed" && <button className="btn soft" onClick={()=>markReviewed(r.id)}>Mark reviewed</button>}<button className="btn soft danger" onClick={()=>deleteReport(r.id)}><Trash2 size={16}/>Delete</button></td></tr>)}</tbody></table> : <p>No {selectedGroup.toLowerCase()} reports have been submitted yet.</p>}</div>}
      {!selectedGroup && <div className="panel report-empty-choice"><h3>Select an admin report group</h3><p>Click one of the three buttons above to view and export Store, Real Estate, or Motors reports.</p></div>}
      {message && <p className={message.toLowerCase().includes("error") ? "form-message error" : "form-message success"}>{message}</p>}</section>;
  }

  return <section className="reports-page"><div className="dash-head"><div><span className="eyebrow">BRANCH REPORT</span><h1>Send a report to Super Admin</h1><p>Share sales updates, property progress, stock issues, or any branch matter that needs attention.</p></div></div>
    <form className="panel operation-form" onSubmit={submitReport}><div className="panel-title"><FileSpreadsheet size={21}/><h2>New report</h2></div><input required placeholder="Report title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><select value={form.report_type} onChange={e=>setForm({...form,report_type:e.target.value})}><option>Daily update</option><option>Weekly update</option><option>Monthly report</option><option>Issue / support request</option><option>Other</option></select><label>Report date<input type="date" required value={form.reporting_period} onChange={e=>setForm({...form,reporting_period:e.target.value})}/></label><textarea required rows="6" placeholder="Write the report details for Super Admin" value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})}/><button className="btn primary"><Send size={18}/>Send report</button>{message && <p className={message.includes("sent") ? "form-message success" : "form-message error"}>{message}</p>}</form>
    <div className="panel"><div className="panel-head"><h3>Your submitted reports</h3><button className="btn soft" onClick={loadReports}><RotateCcw size={16}/>Refresh</button></div>{loading ? <p>Loading reports…</p> : reportsError ? <p className="form-message error">Could not load your reports: {reportsError}</p> : reports.length ? <table><thead><tr><th>Report</th><th>Report date</th><th>Submitted</th><th>Status</th></tr></thead><tbody>{reports.map(r=><tr key={r.id}><td><b>{r.title}</b><br/><span className="muted-cell">{r.report_type}</span></td><td>{formatReportDate(r.reporting_period)}</td><td>{new Date(r.created_at).toLocaleString()}</td><td><Badge>{r.status === "reviewed" ? "Reviewed" : "Sent"}</Badge></td></tr>)}</tbody></table> : <p>You have not sent any reports yet.</p>}</div></section>;
}

function ExportReports({ products, properties, vehicles }) {
  const palette = {
    "PDExpress Store": { header: "E95525", light: "FDE9E2" },
    "Real Estate": { header: "187A5B", light: "E4F4EC" },
    "PD Motors": { header: "2A5AA8", light: "E8EFFC" },
  };

  const statusStyle = (status) => {
    const key = normalizeStatus(status);
    if (key === "available" || key === "in_stock") return { fill: "DDF3E6", font: "087B47" };
    if (key === "reserved") return { fill: "E8EDFF", font: "4E5FB9" };
    if (key === "sold" || key === "out_of_stock") return { fill: "FDE5E1", font: "BE3C20" };
    if (key === "rented") return { fill: "F1E8FF", font: "6B3FA0" };
    if (key === "coming_soon") return { fill: "FFF1C9", font: "9A6500" };
    return { fill: "EEF1F3", font: "53646E" };
  };

  function branchRows() {
    return {
      "PDExpress Store": products.map((x) => ({
        Listing: x.name,
        Category: x.category || "",
        Status: titleStatus(x.status),
        "Price (Nu.)": Number(x.price || 0),
        "Total Stock": Number(x.total_stock || 0),
        "Sold": Number(x.sold_quantity || 0),
        "Available": Math.max(0, Number(x.total_stock || 0) - Number(x.sold_quantity || 0)),
      })),
      "Real Estate": properties.map((x) => ({
        Listing: x.title,
        Type: x.property_type || "",
        Status: titleStatus(x.status),
        "Price (Nu.)": Number(x.price || 0),
        Location: x.location || "",
        Area: x.area || "",
      })),
      "PD Motors": vehicles.map((x) => ({
        Listing: `${x.brand || ""} ${x.model || ""}`.trim(),
        Fuel: x.fuel_type || "",
        Status: titleStatus(x.status),
        "Price (Nu.)": Number(x.price || 0),
        Year: x.year || "",
        "Mileage (km)": x.mileage || "",
      })),
    };
  }

  function makeSheet(title, rows, branchColor) {
    const headings = Object.keys(rows[0] || { Listing: "", Status: "", "Price (Nu.)": "" });
    const sheet = XLSX.utils.json_to_sheet(rows, { header: headings });
    sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
    sheet["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(headings.length - 1)}${Math.max(1, rows.length + 1)}` };
    sheet["!cols"] = headings.map((heading) => ({ wch: Math.max(14, Math.min(34, heading === "Listing" ? 32 : heading.length + 5)) }));
    headings.forEach((heading, colIndex) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: colIndex })];
      if (cell) cell.s = {
        fill: { fgColor: { rgb: branchColor } },
        font: { color: { rgb: "FFFFFF" }, bold: true },
        alignment: { horizontal: "center", vertical: "center" },
      };
    });
    rows.forEach((row, rowIndex) => {
      headings.forEach((heading, colIndex) => {
        const address = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
        const cell = sheet[address];
        if (!cell) return;
        cell.s = {
          fill: { fgColor: { rgb: rowIndex % 2 === 0 ? "FFFFFF" : "F7F8F8" } },
          alignment: { vertical: "center" },
        };
        if (heading === "Price (Nu.)") {
          cell.z = '#,##0';
          cell.s.alignment = { horizontal: "right", vertical: "center" };
        }
        if (heading === "Status") {
          const style = statusStyle(row.Status);
          cell.s = {
            fill: { fgColor: { rgb: style.fill } },
            font: { color: { rgb: style.font }, bold: true },
            alignment: { horizontal: "center", vertical: "center" },
          };
        }
      });
    });
    return sheet;
  }

  function exportExcel() {
    const workbook = XLSX.utils.book_new();
    const groups = branchRows();
    const summaryRows = Object.entries(groups).map(([branch, rows]) => ({
      Branch: branch,
      "Number of listings": rows.length,
      Available: rows.filter((row) => normalizeStatus(row.Status) === "available").length,
      Reserved: rows.filter((row) => normalizeStatus(row.Status) === "reserved").length,
      Sold: rows.filter((row) => normalizeStatus(row.Status) === "sold").length,
      "Coming soon": rows.filter((row) => normalizeStatus(row.Status) === "coming_soon").length,
    }));
    const summary = XLSX.utils.json_to_sheet(summaryRows);
    summary["!cols"] = [{ wch: 24 }, { wch: 20 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 15 }];
    Object.keys(summaryRows[0]).forEach((heading, index) => {
      const cell = summary[XLSX.utils.encode_cell({ r: 0, c: index })];
      cell.s = { fill: { fgColor: { rgb: "10212A" } }, font: { color: { rgb: "FFFFFF" }, bold: true }, alignment: { horizontal: "center" } };
    });
    summaryRows.forEach((row, r) => {
      const color = palette[row.Branch].light;
      Object.keys(row).forEach((_, c) => {
        const cell = summary[XLSX.utils.encode_cell({ r: r + 1, c })];
        cell.s = { fill: { fgColor: { rgb: color } }, alignment: { vertical: "center" } };
      });
    });
    XLSX.utils.book_append_sheet(workbook, summary, "Summary");
    Object.entries(groups).forEach(([branch, rows]) => {
      XLSX.utils.book_append_sheet(workbook, makeSheet(branch, rows, palette[branch].header), branch.replace("PDExpress ", "").replace("PD ", ""));
    });
    XLSX.writeFile(workbook, `pdexpress-styled-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportPdf() {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const groups = branchRows();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(16, 33, 42);
    doc.rect(0, 0, pageWidth, 70, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(21);
    doc.text("PD Express Bhutan", 38, 31);
    doc.setFontSize(11);
    doc.text("Business Listings & Inventory Report", 38, 51);
    doc.setTextColor(16, 33, 42);
    doc.setFontSize(9);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 38, 91);

    let startY = 108;
    Object.entries(groups).forEach(([branch, rows], groupIndex) => {
      if (groupIndex > 0) {
        doc.addPage();
        startY = 44;
      }
      const branchColor = palette[branch].header;
      doc.setFillColor(parseInt(branchColor.slice(0, 2), 16), parseInt(branchColor.slice(2, 4), 16), parseInt(branchColor.slice(4, 6), 16));
      doc.roundedRect(38, startY, pageWidth - 76, 28, 7, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text(branch, 50, startY + 19);
      doc.setTextColor(16, 33, 42);

      const isStore = branch === "PDExpress Store";
      const head = isStore
        ? [["Product", "Category", "Status", "Price (Nu.)", "Stock", "Sold", "Available"]]
        : branch === "Real Estate"
          ? [["Listing", "Type", "Status", "Price (Nu.)", "Location", "Area"]]
          : [["Vehicle", "Fuel", "Status", "Price (Nu.)", "Year", "Mileage (km)"]];
      const body = rows.map((row) => Object.values(row).map((value) => typeof value === "number" ? value.toLocaleString() : value));
      autoTable(doc, {
        startY: startY + 38,
        head,
        body,
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 7, textColor: [40, 53, 60], lineColor: [225, 230, 232], lineWidth: 0.4 },
        headStyles: { fillColor: [16, 33, 42], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [247, 249, 249] },
        didParseCell: (data) => {
          if (data.section === "body") {
            const statusIndex = head[0].indexOf("Status");
            if (data.column.index === statusIndex) {
              const style = statusStyle(data.cell.raw);
              data.cell.styles.fillColor = hexToRgb(style.fill);
              data.cell.styles.textColor = hexToRgb(style.font);
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.halign = "center";
            }
          }
        },
        margin: { left: 38, right: 38 },
      });
      const finalY = doc.lastAutoTable.finalY + 24;
      doc.setTextColor(102, 122, 134);
      doc.setFontSize(8);
      doc.text(`${rows.length} listing(s) in this section`, 40, finalY);
      doc.setTextColor(16, 33, 42);
    });
    doc.save(`pdexpress-styled-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return <div className="reports-page">
    <div className="dash-head"><div><span className="eyebrow">SUPER ADMIN REPORTS</span><h1>Export clear, presentation-ready reports</h1><p>Each branch receives its own colour and each listing status is colour-coded in both exports.</p></div></div>
    <div className="report-summary">
      <DashStat title="Store products" value={products.length} note="Orange report section" />
      <DashStat title="Properties" value={properties.length} note="Green report section" />
      <DashStat title="Vehicles" value={vehicles.length} note="Blue report section" />
      <DashStat title="Total records" value={products.length + properties.length + vehicles.length} note="Across all branches" />
    </div>
    <div className="panel export-panel"><FileSpreadsheet size={36} /><h2>Styled Excel and PDF export</h2><p><b>PDF:</b> separate pages for Store, Real Estate, and Motors. <b>Excel:</b> a Summary tab plus separate colour-coded tabs for each branch.</p><div className="report-legend"><span className="legend-store">Store</span><span className="legend-real">Real Estate</span><span className="legend-motors">PD Motors</span><span className="legend-available">Available</span><span className="legend-reserved">Reserved</span><span className="legend-sold">Sold / Out of stock</span><span className="legend-coming">Coming soon</span></div><div className="hero-actions"><button className="btn primary" onClick={exportExcel}><FileSpreadsheet size={18} /> Export styled Excel</button><button className="btn dark" onClick={exportPdf}><FileText size={18} /> Export styled PDF</button></div></div>
  </div>;
}

function hexToRgb(hex) {
  const clean = String(hex).replace("#", "");
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}




function HeroMediaManager() {
  const { heroMedia, loading, refreshHeroMedia } = useHeroMedia();
  const [videoFile, setVideoFile] = useState(null);
  const [posterFile, setPosterFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVideoUrl(heroMedia.video_url || "");
    setPosterUrl(heroMedia.poster_url || "");
  }, [heroMedia.video_url, heroMedia.poster_url]);

  async function uploadFile(file, kind) {
    if (!file) return kind === "video" ? videoUrl : posterUrl;
    if (kind === "video" && !file.type.startsWith("video/")) throw new Error("Choose an MP4 or another video file.");
    if (kind === "poster" && !file.type.startsWith("image/")) throw new Error("Choose an image file for the poster.");
    const extension = file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg");
    const fileName = `${kind}-${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from("hero-media").upload(fileName, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
    if (error) throw error;
    return supabase.storage.from("hero-media").getPublicUrl(fileName).data.publicUrl;
  }

  async function saveHeroMedia(event) {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setMessage("");
    try {
      const finalVideo = await uploadFile(videoFile, "video");
      const finalPoster = await uploadFile(posterFile, "poster");
      const updatedAt = new Date().toISOString();
      const publicConfig = {
        video_url: finalVideo || "",
        poster_url: finalPoster || "",
        updated_at: updatedAt,
        version: updatedAt
      };

      const { error: configError } = await supabase.storage
        .from("hero-media")
        .upload(
          "home-hero.json",
          new Blob([JSON.stringify(publicConfig)], { type: "application/json" }),
          { upsert: true, contentType: "application/json", cacheControl: "0" }
        );
      if (configError) throw configError;

      const { error } = await supabase.from("site_media").upsert({
        media_key: "home_hero",
        video_url: finalVideo || null,
        poster_url: finalPoster || null,
        updated_at: updatedAt,
      });
      if (error) throw error;
      await refreshHeroMedia();
      setVideoFile(null);
      setPosterFile(null);
      setMessage("Hero media updated. The public Home page will now use the uploaded media.");
    } catch (error) {
      setMessage(error.message || "Could not update hero media.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="hero-media-admin">
    <div className="dash-head"><div><span className="eyebrow">SUPER ADMIN</span><h1>Home hero media</h1><p>Update the public Home page video or poster image without editing project files.</p></div></div>
    <div className="hero-media-grid">
      <form className="panel hero-media-form" onSubmit={saveHeroMedia}>
        <div className="panel-title"><Film size={22}/><h2>Upload hero video</h2></div>
        <p>Recommended: MP4, 8–20 seconds, 1920 × 1080, under 25 MB, muted looping visual.</p>
        <input type="file" accept="video/mp4,video/webm" onChange={(e)=>setVideoFile(e.target.files?.[0] || null)} />
        <label>Or use an external video URL<input type="url" value={videoUrl} onChange={(e)=>setVideoUrl(e.target.value)} placeholder="https://.../hero-video.mp4" /></label>
        <div className="panel-title"><Image size={22}/><h2>Upload poster image</h2></div>
        <p>This displays while the video is loading or where videos cannot play.</p>
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e)=>setPosterFile(e.target.files?.[0] || null)} />
        <label>Or use an external poster URL<input type="url" value={posterUrl} onChange={(e)=>setPosterUrl(e.target.value)} placeholder="https://.../hero-poster.jpg" /></label>
        <button className="btn primary" disabled={saving}>{saving ? "Uploading…" : "Save hero media"} <Upload size={18}/></button>
        {message && <p className={message.startsWith("Hero media") ? "form-message success" : "form-message error"}>{message}</p>}
      </form>
      <section className="panel hero-media-preview"><div className="panel-title"><Image size={22}/><h2>Current preview</h2></div>{loading ? <p>Loading current media…</p> : <div className="hero-preview-frame">{heroMedia.video_url ? <video src={heroMedia.video_url} poster={heroMedia.poster_url || undefined} controls muted /> : heroMedia.poster_url ? <img src={heroMedia.poster_url} alt="Current home hero poster" /> : <div className="hero-preview-empty">No hero media uploaded yet.<br/>The animated default hero will remain active.</div>}</div>}<small>Only Super Admin can replace these files.</small></section>
    </div>
  </div>;
}

function AdminUsers() {
  const { branches } = useData();
  const [admins, setAdmins] = useState([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "store_admin" });

  async function call(action, payload = {}) {
    const { data, error } = await supabase.functions.invoke("manage-admin", { body: { action, ...payload } });
    if (error) throw new Error(data?.error || error.message || "Request failed.");
    if (data?.error) throw new Error(data.error);
    return data;
  }
  async function load() {
    try { const data = await call("list"); setAdmins(data.admins || []); }
    catch (error) { setMessage(error.message); }
  }
  useEffect(() => { load(); }, []);
  async function createAdmin(event) {
    event.preventDefault();
    try { const data = await call("create", form); setMessage(data.message || "Admin created."); setForm({ full_name: "", email: "", password: "", role: "store_admin" }); load(); }
    catch (error) { setMessage(error.message); }
  }
  async function changeRole(userId, role) {
    try { const data = await call("update", { user_id: userId, role }); setMessage(data.message || "Admin updated."); load(); }
    catch (error) { setMessage(error.message); }
  }
  async function deleteAdmin(userId, name) {
    if (!confirm(`Delete ${name}? This removes their login account.`)) return;
    try { const data = await call("delete", { user_id: userId }); setMessage(data.message || "Admin deleted."); load(); }
    catch (error) { setMessage(error.message); }
  }
  return <div className="admin-users-page">
    <div className="dash-head"><div><span className="eyebrow">SUPER ADMIN</span><h1>Manage branch admins</h1><p>Create Store, Real Estate, and Motors admin accounts. Assign or remove access securely.</p></div></div>
    <div className="operations-grid">
      <form className="panel operation-form" onSubmit={createAdmin}><div className="panel-title"><Users size={21} /><h2>Create branch admin</h2></div><input required placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /><input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><PasswordInput required placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="store_admin">Store Admin</option><option value="real_estate_admin">Real Estate Admin</option><option value="motors_admin">Motors Admin</option></select><button className="btn primary">Create admin</button></form>
      <div className="panel"><div className="panel-title"><ShieldCheck size={21} /><h2>Role permissions</h2></div><p><b>Store Admin:</b> products, stock, listing details, and Home-page labels.</p><p><b>Real Estate Admin:</b> property listings only.</p><p><b>Motors Admin:</b> vehicle listings only.</p><p><b>Super Admin:</b> company reports and all admins.</p></div>
    </div>
    {message && <p className={/(created|updated|deleted)/i.test(message) ? "form-message success" : "form-message error"}>{message}</p>}
    <div className="panel"><div className="panel-title"><Users size={21} /><h2>Existing admin accounts</h2></div><table><thead><tr><th>Name</th><th>Email</th><th>Branch</th><th>Role</th><th></th></tr></thead><tbody>{admins.map((admin) => <tr key={admin.id}><td>{admin.full_name}</td><td>{admin.email}</td><td>{admin.branch_name || "All branches"}</td><td>{admin.role === "super_admin" ? <Badge>Super Admin</Badge> : <select value={admin.role} onChange={(e) => changeRole(admin.id, e.target.value)}><option value="store_admin">Store Admin</option><option value="real_estate_admin">Real Estate Admin</option><option value="motors_admin">Motors Admin</option></select>}</td><td>{admin.role !== "super_admin" && <button className="icon-action danger" onClick={() => deleteAdmin(admin.id, admin.full_name)}><Trash2 size={17} /></button>}</td></tr>)}</tbody></table></div>
  </div>;
}

const EMPTY_LOCATION_FORM = {
  name: "",
  business_type: "PDExpress Store",
  address: "",
  description: "",
  map_url: "",
  map_embed_url: "",
  latitude: "",
  longitude: "",
  display_order: 0,
  is_active: true,
  is_coming_soon: false,
};

function ManageLocations() {
  const { locations, refresh } = useData();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_LOCATION_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("store_locations").select("*").order("display_order", { ascending: true });
    if (error) setMessage(error.message);
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function startAdd() {
    setEditingId("new");
    setForm({ ...EMPTY_LOCATION_FORM, display_order: rows.length ? Math.max(...rows.map((r) => r.display_order || 0)) + 1 : 1 });
    setMessage("");
  }
  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      name: row.name || "",
      business_type: row.business_type || "PDExpress Store",
      address: row.address || "",
      description: row.description || "",
      map_url: row.map_url || "",
      map_embed_url: row.map_embed_url || "",
      latitude: row.latitude ?? "",
      longitude: row.longitude ?? "",
      display_order: row.display_order ?? 0,
      is_active: !!row.is_active,
      is_coming_soon: !!row.is_coming_soon,
    });
    setMessage("");
  }
  function cancelEdit() { setEditingId(null); setForm(EMPTY_LOCATION_FORM); }
  function change(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function save(event) {
    event.preventDefault();
    if (!form.name.trim()) { setMessage("Location name is required."); return; }
    setSaving(true);
    setMessage("");
    const payload = {
      name: form.name.trim(),
      business_type: form.business_type.trim() || "PDExpress Store",
      address: form.address.trim(),
      description: form.description.trim(),
      map_url: form.map_url.trim(),
      map_embed_url: form.map_embed_url.trim(),
      latitude: form.latitude === "" ? null : Number(form.latitude),
      longitude: form.longitude === "" ? null : Number(form.longitude),
      display_order: Number(form.display_order) || 0,
      is_active: !!form.is_active,
      is_coming_soon: !!form.is_coming_soon,
    };
    const query = editingId === "new"
      ? supabase.from("store_locations").insert(payload)
      : supabase.from("store_locations").update(payload).eq("id", editingId);
    const { error } = await query;
    setSaving(false);
    if (error) { setMessage(error.message); return; }
    setMessage(editingId === "new" ? "Location added." : "Location updated.");
    cancelEdit();
    load();
    refresh();
  }

  async function removeLocation(row) {
    if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("store_locations").delete().eq("id", row.id);
    if (error) setMessage(error.message);
    else { setMessage("Location deleted."); load(); refresh(); }
  }

  async function toggleActive(row) {
    const { error } = await supabase.from("store_locations").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) setMessage(error.message);
    else { load(); refresh(); }
  }

  async function move(row, direction) {
    const sorted = [...rows].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const index = sorted.findIndex((r) => r.id === row.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    const other = sorted[swapIndex];
    const a = row.display_order || 0;
    const b = other.display_order || 0;
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("store_locations").update({ display_order: b }).eq("id", row.id),
      supabase.from("store_locations").update({ display_order: a }).eq("id", other.id),
    ]);
    if (e1 || e2) setMessage((e1 || e2).message);
    else { load(); refresh(); }
  }

  const previewUrl = miniMapEmbedUrl(form);

  return <div className="manage-locations-page">
    <div className="dash-head"><div><span className="eyebrow">SUPER ADMIN</span><h1>Manage Locations</h1><p>Control the store, showroom, and branch locations shown in the "Visit Us" section on the public website — no code changes needed.</p></div>
      {editingId === null && <button className="btn primary" onClick={startAdd}><Plus size={18} />Add location</button>}
    </div>

    {message && <p className={/(added|updated|deleted)/i.test(message) ? "form-message success" : "form-message error"}>{message}</p>}

    {editingId !== null && <form className="panel operation-form" onSubmit={save}>
      <div className="panel-title"><MapPin size={21} /><h2>{editingId === "new" ? "Add location" : "Edit location"}</h2></div>
      <label>Location name<input required placeholder="e.g. PDExpress Store — Hongkong Market" value={form.name} onChange={(e) => change("name", e.target.value)} /></label>
      <label>Business type<input list="location-business-types" placeholder="e.g. PDExpress Store" value={form.business_type} onChange={(e) => change("business_type", e.target.value)} />
        <datalist id="location-business-types">{LOCATION_BUSINESS_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
      </label>
      <label>Full address<textarea rows={2} placeholder="Street, area, city" value={form.address} onChange={(e) => change("address", e.target.value)} /></label>
      <label>Short description<textarea rows={2} placeholder="Optional short description shown on the card" value={form.description} onChange={(e) => change("description", e.target.value)} /></label>
      <label>Google Maps link<input placeholder="https://maps.app.goo.gl/..." value={form.map_url} onChange={(e) => change("map_url", e.target.value)} /></label>
      <label>Google Maps embed link (optional)<input placeholder="https://www.google.com/maps?...&output=embed" value={form.map_embed_url} onChange={(e) => change("map_embed_url", e.target.value)} /></label>
      <div className="form-row-split">
        <label>Latitude (optional)<input type="number" step="any" placeholder="e.g. 27.4728" value={form.latitude} onChange={(e) => change("latitude", e.target.value)} /></label>
        <label>Longitude (optional)<input type="number" step="any" placeholder="e.g. 89.6390" value={form.longitude} onChange={(e) => change("longitude", e.target.value)} /></label>
      </div>
      <label>Display order<input type="number" value={form.display_order} onChange={(e) => change("display_order", e.target.value)} /></label>
      <label className="location-toggle"><input type="checkbox" checked={form.is_active} onChange={(e) => change("is_active", e.target.checked)} /> Active (visible on the public website)</label>
      <label className="location-toggle"><input type="checkbox" checked={form.is_coming_soon} onChange={(e) => change("is_coming_soon", e.target.checked)} /> Mark as "Coming Soon" (shows a placeholder instead of a map)</label>

      <div className="location-preview-label"><Eye size={15} /> Map preview</div>
      {previewUrl ? (
        <iframe className="mini-map-frame" src={previewUrl} title="Map preview" loading="lazy" referrerPolicy="no-referrer-when-downgrade" tabIndex="-1" />
      ) : (
        <div className="mini-map-pending">
          <MapPin size={23} />
          <strong>{form.is_coming_soon ? "Showroom coming soon" : "No map to preview yet"}</strong>
          <span>{form.is_coming_soon ? "Coming-soon locations always show this placeholder." : "Add a Google Maps link, embed link, or coordinates to preview the map."}</span>
        </div>
      )}

      <div className="form-actions">
        <button className="btn primary" disabled={saving}>{saving ? "Saving…" : "Save location"}</button>
        <button type="button" className="btn ghost" onClick={cancelEdit}>Cancel</button>
      </div>
    </form>}

    <div className="panel">
      <div className="panel-title"><MapPin size={21} /><h2>All locations</h2></div>
      {loading ? <p className="empty">Loading…</p> : !rows.length ? <p className="empty">No locations yet. Add one above.</p> : (
        <table><thead><tr><th>Order</th><th>Name</th><th>Business type</th><th>Status</th><th></th></tr></thead>
          <tbody>{[...rows].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)).map((row, i, arr) => (
            <tr key={row.id}>
              <td className="location-order-cell">
                <button className="icon-action" disabled={i === 0} onClick={() => move(row, "up")}><ChevronUp size={16} /></button>
                <button className="icon-action" disabled={i === arr.length - 1} onClick={() => move(row, "down")}><ChevronDown size={16} /></button>
              </td>
              <td>{row.name}{row.is_coming_soon && <Badge>Coming soon</Badge>}</td>
              <td>{row.business_type}</td>
              <td>{row.is_active ? <Badge>Active</Badge> : <Badge>Draft</Badge>}</td>
              <td className="location-actions-cell">
                <button className="icon-action" title={row.is_active ? "Hide from website" : "Show on website"} onClick={() => toggleActive(row)}>{row.is_active ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                <button className="icon-action" title="Edit" onClick={() => startEdit(row)}><Edit3 size={16} /></button>
                <button className="icon-action danger" title="Delete" onClick={() => removeLocation(row)}><Trash2 size={16} /></button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  </div>;
}

function WhatsAppSettingsForm({ branch, refresh }) {
  const [form, setForm] = useState({ whatsapp_number: branch.whatsapp_number || "", whatsapp_link: branch.whatsapp_link || "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const { data, error } = await supabase.from("branches").update({
      whatsapp_number: form.whatsapp_number.trim(),
      whatsapp_link: form.whatsapp_link.trim(),
    }).eq("id", branch.id).select();
    setSaving(false);
    if (error) setMessage(error.message);
    else if (!data || !data.length) setMessage("Nothing was saved — you may not have permission to edit this branch.");
    else { setMessage("WhatsApp settings saved."); refresh(); }
  }

  return <form className="panel operation-form" onSubmit={save}>
    <div className="panel-title"><MessageCircle size={21} /><h2>{branch.name}</h2></div>
    <label>WhatsApp number (country code, digits only)<input placeholder="e.g. 97577889446" value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} /></label>
    <label>WhatsApp link (used only if number is blank)<input placeholder="https://wa.me/message/..." value={form.whatsapp_link} onChange={(e) => setForm({ ...form, whatsapp_link: e.target.value })} /></label>
    <button className="btn primary" disabled={saving}>{saving ? "Saving…" : "Save WhatsApp settings"}</button>
    {message && <p className={message === "WhatsApp settings saved." ? "form-message success" : "form-message error"}>{message}</p>}
  </form>;
}

function CustomerCareWhatsAppForm({ contact, refresh }) {
  const [form, setForm] = useState({ whatsapp_number: contact.whatsapp_number || "", whatsapp_link: contact.whatsapp_link || "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const { data, error } = await supabase.from("site_contact").update({
      whatsapp_number: form.whatsapp_number.trim(),
      whatsapp_link: form.whatsapp_link.trim(),
      updated_at: new Date().toISOString(),
    }).eq("contact_key", "customer_care").select();
    setSaving(false);
    if (error) setMessage(error.message);
    else if (!data || !data.length) setMessage("Nothing was saved — you may not have permission to edit this.");
    else { setMessage("Customer care WhatsApp saved."); refresh(); }
  }

  return <form className="panel operation-form" onSubmit={save}>
    <div className="panel-title"><MessageCircle size={21} /><h2>Customer Care (site-wide)</h2></div>
    <label>WhatsApp number (country code, digits only)<input placeholder="e.g. 97577889446" value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} /></label>
    <label>WhatsApp link (used only if number is blank)<input placeholder="https://wa.me/message/..." value={form.whatsapp_link} onChange={(e) => setForm({ ...form, whatsapp_link: e.target.value })} /></label>
    <button className="btn primary" disabled={saving}>{saving ? "Saving…" : "Save customer care WhatsApp"}</button>
    {message && <p className={message.includes("saved") ? "form-message success" : "form-message error"}>{message}</p>}
  </form>;
}

function WhatsAppSettings({ isSuper, branch, branches, refresh }) {
  const list = isSuper ? branches : (branch ? [branch] : []);
  const { contact, refreshContact } = useCustomerCareContact();
  return <div className="whatsapp-settings-page">
    <div className="dash-head"><div><span className="eyebrow">CONTACT SETTINGS</span><h1>WhatsApp enquiries</h1><p>The Customer Care number is used by the floating WhatsApp button and the Contact page. Each branch's number or link is used only when a customer taps "Chat on WhatsApp" on one of that branch's listings.</p></div></div>
    <div className="operations-grid">
      {isSuper && <CustomerCareWhatsAppForm contact={contact} refresh={refreshContact} />}
      {list.map((b) => <WhatsAppSettingsForm key={b.id} branch={b} refresh={refresh} />)}
    </div>
  </div>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [pathname]);
  return null;
}

function App() {
  return <BrowserRouter><ScrollToTop /><DataProvider><Routes><Route path="/dashboard" element={<Dashboard />} /><Route path="*" element={<Layout><Routes><Route path="/" element={<Home />} /><Route path="/store" element={<Store />} /><Route path="/store/category/:categorySlug" element={<CategoryListingsPage section="store" />} /><Route path="/real-estate" element={<RealEstate />} /><Route path="/real-estate/category/:categorySlug" element={<CategoryListingsPage section="real-estate" />} /><Route path="/motors" element={<Motors />} /><Route path="/motors/category/:categorySlug" element={<CategoryListingsPage section="motors" />} /><Route path="/listing/:kind/:id" element={<ListingDetailPage />} /><Route path="/about" element={<About />} /><Route path="/services" element={<InfoPage page="services" />} /><Route path="/history" element={<InfoPage page="history" />} /><Route path="/terms" element={<InfoPage page="terms" />} /><Route path="/warranty" element={<InfoPage page="warranty" />} /><Route path="/delivery" element={<InfoPage page="delivery" />} /><Route path="/privacy" element={<InfoPage page="privacy" />} /><Route path="/contact" element={<Contact />} /><Route path="/login" element={<Login />} /><Route path="/reset-password" element={<ResetPassword />} /></Routes></Layout>} /></Routes></DataProvider></BrowserRouter>;
}
createRoot(document.getElementById("root")).render(<App />);
