import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, Plus, Minus } from "lucide-react";
import { useIsPhone } from "../main.jsx";

// Category dropdown attached directly to a site-header nav link (PDExpress
// Store / Real Estate / PD Motors). Desktop: hovering or clicking the nav
// link opens a white dropdown panel underneath it, listing "All X" plus
// every category, each a real link to its dedicated category page. Mobile:
// rendered inside the hamburger nav as an expandable row - tapping the
// label still navigates, a separate chevron/plus toggle expands the
// category list inline. Category data is passed in from the shared
// categoryConfig source (Store/Real Estate static lists, Motors derived
// live from vehicle brands) - nothing is duplicated here.
export default function CategoryNavigation({ to, label, section, categories, allLabel, sectionLabel }) {
  const [open, setOpen] = useState(false);
  const isPhone = useIsPhone();
  const wrapRef = useRef(null);
  const location = useLocation();
  const closeTimer = useRef(null);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  if (!categories || !categories.length) {
    return <NavLink to={to}>{label}</NavLink>;
  }

  const panelId = `nav-category-panel-${section}`;
  const categoryPrefix = `${to}/category/`;
  const activeSlug = location.pathname.startsWith(categoryPrefix)
    ? location.pathname.slice(categoryPrefix.length).split("/")[0]
    : null;
  const isAllActive = location.pathname === to;

  const handleMouseEnter = () => {
    if (isPhone) return;
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpen(true);
  };
  const handleMouseLeave = () => {
    if (isPhone) return;
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };
  const handleBlur = (event) => {
    if (isPhone) return;
    if (!wrapRef.current || !wrapRef.current.contains(event.relatedTarget)) setOpen(false);
  };

  const panelRows = (
    <>
      {allLabel && (
        <Link
          to={to}
          className={`category-nav-row category-nav-row-all ${isAllActive ? "is-active" : ""}`}
          role={isPhone ? undefined : "menuitem"}
          aria-current={isAllActive ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          <span>{allLabel}</span>
          {!isPhone && <ChevronRight size={16} className="category-nav-row-icon" aria-hidden="true" />}
        </Link>
      )}
      {categories.map((category) => {
        const isActive = category.slug === activeSlug;
        return (
          <Link
            key={category.slug}
            to={`${to}/category/${category.slug}`}
            className={`category-nav-row ${isActive ? "is-active" : ""}`}
            role={isPhone ? undefined : "menuitem"}
            aria-current={isActive ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            <span>{category.label}</span>
            {!isPhone && <ChevronRight size={16} className="category-nav-row-icon" aria-hidden="true" />}
          </Link>
        );
      })}
    </>
  );

  if (isPhone) {
    return (
      <div className="nav-category-item nav-category-mobile-row" ref={wrapRef}>
        <div className="nav-category-mobile-head">
          <NavLink to={to} className="nav-category-link">{label}</NavLink>
          <button
            type="button"
            className="nav-category-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={`${open ? "Collapse" : "Expand"} ${sectionLabel} categories`}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <Minus size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
          </button>
        </div>
        <div id={panelId} className={`nav-category-mobile-panel ${open ? "is-open" : ""}`}>
          {panelRows}
        </div>
      </div>
    );
  }

  return (
    <div
      className="nav-category-item"
      ref={wrapRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onBlur={handleBlur}
    >
      <NavLink
        to={to}
        className="nav-category-link"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(false)}
        onFocus={handleMouseEnter}
      >
        {label}
        <ChevronDown size={15} className={`nav-category-chevron ${open ? "is-open" : ""}`} aria-hidden="true" />
      </NavLink>
      <div id={panelId} className={`nav-category-panel ${open ? "is-open" : ""}`} role="menu">
        {panelRows}
      </div>
    </div>
  );
}
