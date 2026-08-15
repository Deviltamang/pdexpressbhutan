-- Simplified Real Estate Admin form
-- No columns are deleted to protect existing property data.
-- The app simply stops showing or saving:
-- latitude, longitude, ownership_type, registration_status,
-- road_access, water_connection, electricity_connection,
-- property_condition, featured, and new_arrival for real-estate entries.

notify pgrst, 'reload schema';
