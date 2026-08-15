import React, { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import {
  useData, productIsHiddenFromStore, normalizeStatus, titleStatus,
  productPricing, vehiclePricing, ProductCard, PropertyCard, VehicleCard,
  Reveal, SectionTitle, ListingGrid, ListingGridSkeleton, CategoryNotFound,
} from "../main.jsx";
import { getStoreCategories, getRealEstateCategories, getMotorsCategories, resolveCategoryBySlug } from "../categoryConfig.js";

const SORT_OPTIONS = [
  ["newest", "Newest first"],
  ["oldest", "Oldest first"],
  ["price-low", "Price: Low to High"],
  ["price-high", "Price: High to Low"],
  ["alphabetical", "Alphabetical (A-Z)"],
];

const SECTION_SETUP = {
  store: {
    sectionLabel: "Store",
    eyebrow: "PDEXPRESS STORE",
    basePath: "/store",
    allLabel: "All Products",
    dataKey: "products",
    getCategories: (data) => getStoreCategories(),
    itemMatchesCategory: (item, value) => item.category === value,
    isVisible: (item) => !productIsHiddenFromStore(item),
    titleOf: (item) => item.name || "",
    searchText: (item) => `${item.name || ""} ${item.brand || ""} ${item.model_number || ""} ${item.category || ""}`,
    priceOf: (item) => productPricing(item).final || 0,
    renderCard: (item) => <ProductCard key={item.id} item={item} />,
  },
  "real-estate": {
    sectionLabel: "Real Estate",
    eyebrow: "PD EXPRESS REAL ESTATE",
    basePath: "/real-estate",
    allLabel: "All Properties",
    dataKey: "properties",
    getCategories: (data) => getRealEstateCategories(),
    itemMatchesCategory: (item, value) => item.property_type === value,
    isVisible: () => true,
    titleOf: (item) => item.title || "",
    searchText: (item) => `${item.title || ""} ${item.location || ""} ${item.address || ""}`,
    priceOf: (item) => Number(item.price) || 0,
    renderCard: (item) => <PropertyCard key={item.id} item={item} />,
  },
  motors: {
    sectionLabel: "Motors",
    eyebrow: "PD MOTORS",
    basePath: "/motors",
    allLabel: "All Vehicles",
    dataKey: "vehicles",
    getCategories: (data) => getMotorsCategories(data.vehicles),
    itemMatchesCategory: (item, value) => item.brand === value,
    isVisible: () => true,
    titleOf: (item) => `${item.brand || ""} ${item.model || ""}`.trim(),
    searchText: (item) => `${item.brand || ""} ${item.model || ""}`,
    priceOf: (item) => vehiclePricing(item).final || 0,
    renderCard: (item) => <VehicleCard key={item.id} item={item} />,
  },
};

export default function CategoryListingsPage({ section }) {
  const setup = SECTION_SETUP[section];
  const { categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const data = useData();

  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const status = searchParams.get("status") || "All";

  const categories = useMemo(() => setup.getCategories(data), [setup, data]);
  const category = resolveCategoryBySlug(categories, categorySlug);

  const items = data[setup.dataKey] || [];

  const categoryItems = useMemo(() => {
    if (!category) return [];
    return items.filter((item) => setup.isVisible(item) && setup.itemMatchesCategory(item, category.value));
  }, [items, category, setup]);

  const statusOptions = useMemo(() => {
    const present = new Set(categoryItems.map((item) => normalizeStatus(item.status)).filter((s) => s !== "draft"));
    return ["All", ...[...present].sort()];
  }, [categoryItems]);

  const setSearch = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("search", value); else next.delete("search");
    setSearchParams(next, { replace: true });
  };
  const setSort = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "newest") next.set("sort", value); else next.delete("sort");
    setSearchParams(next, { replace: true });
  };
  const setStatus = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "All") next.set("status", value); else next.delete("status");
    setSearchParams(next, { replace: true });
  };

  const visibleItems = useMemo(() => {
    let list = categoryItems.filter((item) => normalizeStatus(item.status) !== "draft");
    if (status !== "All") list = list.filter((item) => normalizeStatus(item.status) === status);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((item) => setup.searchText(item).toLowerCase().includes(q));
    }
    const sorted = [...list];
    if (sort === "oldest") sorted.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    else if (sort === "price-low") sorted.sort((a, b) => setup.priceOf(a) - setup.priceOf(b));
    else if (sort === "price-high") sorted.sort((a, b) => setup.priceOf(b) - setup.priceOf(a));
    else if (sort === "alphabetical") sorted.sort((a, b) => setup.titleOf(a).localeCompare(setup.titleOf(b)));
    else sorted.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return sorted;
  }, [categoryItems, status, search, sort, setup]);

  if (!data.loading && !category) {
    return <section className="container page-content listing-page">
      <Breadcrumb section={section} setup={setup} categoryLabel={null} />
      <CategoryNotFound section={section} basePath={setup.basePath} sectionLabel={setup.sectionLabel} />
    </section>;
  }

  return <section className="container page-content listing-page category-listings-page">
    <Reveal><SectionTitle eyebrow={setup.eyebrow} title={category ? category.label : "Loading category…"} text={category ? category.description : ""} /></Reveal>
    <Reveal delay={40}>
      <Breadcrumb section={section} setup={setup} categoryLabel={category?.label} />
    </Reveal>

    <Reveal delay={80}>
      <div className="category-toolbar">
        <label className="search">
          <Search size={18} />
          <input placeholder={`Search ${setup.sectionLabel.toLowerCase()} listings`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div className="category-status-chips" role="group" aria-label="Filter by status">
          {statusOptions.map((s) => (
            <button
              type="button"
              key={s}
              className={`category-status-chip ${status === s ? "is-active" : ""}`}
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
            >
              {s === "All" ? "All" : titleStatus(s)}
            </button>
          ))}
        </div>
        <select className="category-sort-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort listings">
          {SORT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
    </Reveal>

    {data.loading ? (
      <ListingGridSkeleton count={8} />
    ) : data.error ? (
      <div className="empty">{data.error}</div>
    ) : visibleItems.length ? (
      <ListingGrid>
        {visibleItems.map((item) => setup.renderCard(item))}
      </ListingGrid>
    ) : (
      <div className="empty">No active listings are currently available in {category?.label} right now.</div>
    )}
  </section>;
}

function Breadcrumb({ section, setup, categoryLabel }) {
  return <nav className="category-breadcrumb" aria-label="Breadcrumb">
    <Link to="/">Home</Link>
    <ChevronRight size={14} aria-hidden="true" />
    <Link to={setup.basePath}>{setup.sectionLabel}</Link>
    {categoryLabel && <>
      <ChevronRight size={14} aria-hidden="true" />
      <span aria-current="page">{categoryLabel}</span>
    </>}
  </nav>;
}
