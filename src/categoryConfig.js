// Single source of truth for public category navigation across
// PDExpress Store, PD Express Real Estate, and PD Motors.
//
// This file has no dependency on main.jsx (avoids circular imports).
// main.jsx imports APPLIANCE_CATEGORIES/REMOVED_APPLIANCE_CATEGORY from
// here so admin code and public category pages always agree.

export const APPLIANCE_CATEGORIES = {
  "Refrigerators": ["Single door", "Double door", "Triple door", "4 door", "Side-by-side door", "French door", "Mini Fridge", "Frost Free"],
  "Washing Machines": ["Semi-Automatic", "Top Load Automatic", "Front Load Automatic", "Washer Dryer"],
  "Televisions & Displays": ["Smart TV", "Android TV", "Google TV with voice control", "LED TV", "QLED TV", "OLED TV", "Interactive Panel"],
  "Air Conditioners": ["Inverter AC", "Non-Inverter AC", "Hot & Cold AC"],
  "Kitchen Appliances": ["Microwave Oven", "OTG", "Air Fryer"],
  "Cooling & Commercial": ["Deep Freezer", "Visi Cooler"],
  "Water Appliances": ["Water Dispenser"],
  "Other Appliances": ["Stands", "Accessories", "Other"]
};

export const REMOVED_APPLIANCE_CATEGORY = "Air Coolers";

// Mirrors the real_estate_admin form's inline <select> options (main.jsx).
// The admin form itself is intentionally left untouched, so this list is
// kept in sync by hand if that form's options ever change.
export const REAL_ESTATE_PROPERTY_TYPES = [
  "Land", "House", "Apartment", "Commercial Space", "Commercial Land",
  "Office Space", "Farm Land", "Rental Property", "Other"
];

// Motors has no category/type field in the schema or admin form - brand is
// the only existing taxonomy, so it's derived live from vehicle data rather
// than kept as a static list here.

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SECTION_DESCRIPTIONS = {
  store: (label) => `Browse available ${label.toLowerCase()} and open any listing to view full details and photos.`,
  "real-estate": (label) => `Browse available ${label.toLowerCase()} listings and open any property to view full details and photos.`,
  motors: (label) => `Browse available ${label} vehicles and open any listing to view full details and photos.`,
};

function buildCategoryList(section, values) {
  return values.map((value) => ({
    value,
    label: value,
    slug: slugify(value),
    description: SECTION_DESCRIPTIONS[section](value),
  }));
}

export function getStoreCategories() {
  return buildCategoryList("store", Object.keys(APPLIANCE_CATEGORIES));
}

export function getRealEstateCategories() {
  return buildCategoryList("real-estate", REAL_ESTATE_PROPERTY_TYPES);
}

export function getMotorsCategories(vehicles) {
  const brands = [...new Set((vehicles || []).map((v) => v.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return buildCategoryList("motors", brands);
}

export function resolveCategoryBySlug(categories, slug) {
  return (categories || []).find((c) => c.slug === slug) || null;
}
