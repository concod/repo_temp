--liquibase formatted sql
--changeset dodda.gowtham@impactanalytics.co:all_skus_view stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial creation of all_skus view

DROP VIEW IF EXISTS item_smart.all_skus;

CREATE OR REPLACE VIEW item_smart.all_skus AS
SELECT 
    -- Core Identifiers
    ns.hierarchy_code,
    ns.product_code::text,
    ns.product_name,
    ns.product_description,
    ns.sku,  -- SKU field
    ns.item::text,

    -- Hierarchy
    ns.l0_name::text,  -- Brand
    ns.l1_name::text,  -- Department
    ns.l2_name::text,  -- Sub-Department
    ns.l3_name::text,  -- Class
    ns.l4_name::text,  -- Family
    ns.l5_name::text,  -- Parent

    -- Physical Attributes
    ns.color,
    ns.size_sml as size,  -- Size
    ns.shape_of_decor as shape,  -- Shape
    ns.light_type,  -- Light Type
    ns.size_set_pack::text as size_set_pack,  -- Set/Each
    ns.print_catalog::text as print_catalog,  -- Catalog
    ns.drop_ship::text as drop_ship,  -- Dropship
    ns.vendor_label as vendor,  -- Vendor

    -- Dates
    ns.launch_date as entry_date,  -- Entry_date
    ns.exit_date,  -- Exit_date
    ns.created_at,
    ns.updated_at,

    -- User Info
    ns.created_by,
    ns.updated_by,

    -- Product Meta
    ns.product_type,
    ns.l0_name::text as brand,  -- Brand (using l0_name)
    ns.price,
    ns.cost,

    -- Mapping Info
    ns.is_mapped,
    ns.is_cadence_generated,
    ns.mapped_product_code::text as mapped_sku,  -- Mapped Sku
    ns.mapped_product_code_description::text as mapped_product_description,  -- Mapped Product Description

    -- Additional Info
    ns.country_of_origin,
    ns.lifecycle,
    'new_skus' as source_table
FROM item_smart.new_skus ns

UNION ALL

SELECT 
    -- Core Identifiers
    pi.hierarchy_code,
    pi.product_code::text,
    pi.product_name::text,
    pi.product_description::text,
    pi.item::text as sku,  -- SKU field (item field in placeholders_info)
    pi.item::text,

    -- Hierarchy
    pi.l0_name::text,  -- Brand
    pi.l1_name::text,  -- Department
    pi.l2_name::text,  -- Sub-Department
    pi.l3_name::text,  -- Class
    pi.l4_name::text,  -- Family
    pi.l5_name::text,  -- Parent

    -- Physical Attributes
    pi.color::text,
    pi.size::text,  -- Size
    pi.tree_shape::text as shape,  -- Shape
    pi.light_type::text,  -- Light Type
    pi.size_set_pack::text,  -- Set/Each
    pi.print_catalog::text,  -- Catalog
    pi.drop_ship::text,  -- Dropship
    pi.vendor::text,  -- Vendor

    -- Dates
    pi.entry_date,  -- Entry_date
    pi.exit_date,  -- Exit_date
    pi.created_at,
    pi.updated_at,

    -- User Info
    pi.created_by,
    pi.updated_by,

    -- Product Meta
    pi.product_type::text,
    pi.l0_name::text as brand,  -- Brand (using l0_name)
    pi.price,
    pi.cost,

    -- Mapping Info
    pi.is_mapped,
    pi.is_cadence_generated,
    pi.mapped_product_code::text as mapped_sku,  -- Mapped Sku
    pi.mapped_product_code_description::text as mapped_product_description,  -- Mapped Product Description

    -- Additional Info
    pi.country_of_origin::text,
    pi.lifecycle::text,
    'placeholders_info' as source_table
FROM item_smart.placeholders_info pi;

-- Add comment to the view
COMMENT ON VIEW item_smart.all_skus IS 'Unified view combining all required columns from new_skus and placeholders_info tables including SKU, Product Description, Brand, Department, Sub-Department, Class, Family, Parent, Color, Size, Shape, Light Type, Set/Each, Catalog, Dropship, Vendor, Entry_date, Exit_date, Mapped Sku, and Mapped Product Description'; 