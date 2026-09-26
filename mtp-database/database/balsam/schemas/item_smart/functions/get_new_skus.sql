--liquibase formatted sql
--changeset dodda.gowtham@impactanalytics.co:get_new_skus stripComments:false runOnChange:true splitStatements:false context:query_updated labels:itemsmart_initial_commit_1
--comment: initial changeset for get_new_skus_1
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.get_new_skus(where_clause text, meta_filter jsonb);
CREATE OR REPLACE FUNCTION item_smart.get_new_skus(where_clause text, meta_filter jsonb)
RETURNS TABLE(
    hierarchy_code               integer,
    style                        text,
    level                        smallint,
    product_code                 text,
    sku                          text,
    article                      integer,
    product_name                 text,
    product_description          text,
    obs_bh_product_name          text,
    l0_name                      text,
    l1_name                      text,
    l2_name                      text,
    l3_name                      text,
    l4_name                      text,
    l5_name                      text,
    l0_id                        integer,
    l1_id                        integer,
    l2_id                        integer,
    l3_id                        integer,
    l4_id                        integer,
    l5_id                        integer,
    launch_date                  date,
    created_at                   timestamp with time zone,
    updated_at                   timestamp with time zone,
    exit_date                    date,
    created_by                   integer,
    updated_by                   integer,
    fk_skuproductid              text,
    fk_productid                 integer,
    pk_skuproductid              integer,
    price                        numeric,
    cost                         numeric,
    original_price               numeric,
    cost_first_product_value     text,
    cost_first_product_unit      text,       -- <-- casted to text
    cost_fully_loaded_ship_value text,
    cost_fully_loaded_ship_unit  text,       -- <-- casted to text
    std_ship_cost_value          text,
    std_ship_cost_unit           text,       -- <-- casted to text
    active                       boolean,
    clearance                    boolean,
    is_deleted                   boolean,
    product_status               text,
    brand                        text,
    product_type                 text,
    item_type                    text,
    entity_type                  text,
    lifecycle                    text,
    pillar_category              text,
    color                        text,
    size                         text,       -- size_sml as size
    shape_of_decor               text,
    light_type                   text,
    light_color                  text,
    material                     text,
    season                       text,
    holiday                      text,
    year                         double precision,
    mapped_product_code          text,
    mapped_product_code_description text,
    is_mapped                    boolean,
    is_cadence_generated         boolean,
    sku_status                   text,       -- materialized here
    size_set_pack                text,
    print_catalog                text,
    drop_ship                    text,
    vendor                       text,
    vendor_label                 text,
    country_of_origin            text
)
LANGUAGE plpgsql
AS $function$
DECLARE
    _final_sql           text;
    _meta_sql            text := '';
    _inner_where_sql     text := '';
BEGIN
    -- Build meta filter if provided (kept as-is to preserve existing behavior)
    IF meta_filter IS NOT NULL THEN
        _meta_sql := global.form_table_query(meta_filter);
    END IF;

    -- Sanitize where_clause: accept with or without leading WHERE
    IF where_clause IS NOT NULL AND btrim(where_clause) <> '' THEN
        _inner_where_sql := 'WHERE ' || regexp_replace(where_clause, '^\s*WHERE\s+', '', 'i') || ' AND ';
    ELSE
        _inner_where_sql := 'WHERE ';
    END IF;

    -- Build SELECT with explicit casts for fragile columns
    _final_sql := format($SQL$
        SELECT * FROM (
            SELECT
                -- 1..69  (keep order in sync with RETURNS TABLE)
                hierarchy_code,
                style::text                AS style,
                level,
                product_code::text         AS product_code,
                sku::text                  AS sku,
                article,
                product_name::text         AS product_name,
                product_description::text  AS product_description,
                obs_bh_product_name::text  AS obs_bh_product_name,
                l0_name::text              AS l0_name,
                l1_name::text              AS l1_name,
                l2_name::text              AS l2_name,
                l3_name::text              AS l3_name,
                l4_name::text              AS l4_name,
                l5_name::text              AS l5_name,
                l0_id,
                l1_id,
                l2_id,
                l3_id,
                l4_id,
                l5_id,
                launch_date,
                created_at,
                updated_at,
                exit_date,
                created_by,
                updated_by,
                fk_skuproductid::text      AS fk_skuproductid,
                fk_productid,
                pk_skuproductid,
                price,
                cost,
                original_price,
                cost_first_product_value::text     AS cost_first_product_value,
                cost_first_product_unit::text      AS cost_first_product_unit,       -- FIX
                cost_fully_loaded_ship_value::text AS cost_fully_loaded_ship_value,
                cost_fully_loaded_ship_unit::text  AS cost_fully_loaded_ship_unit,   -- FIX
                std_ship_cost_value::text          AS std_ship_cost_value,
                std_ship_cost_unit::text           AS std_ship_cost_unit,            -- FIX
                active,
                clearance,
                is_deleted,
                product_status::text        AS product_status,
                brand::text                 AS brand,
                product_type::text          AS product_type,
                item_type::text             AS item_type,
                entity_type::text           AS entity_type,
                lifecycle::text             AS lifecycle,
                pillar_category::text       AS pillar_category,
                color::text                 AS color,
                size_sml::text              AS size,
                shape_of_decor::text        AS shape_of_decor,
                light_type::text            AS light_type,
                light_color::text           AS light_color,
                material::text              AS material,
                season::text                AS season,
                holiday::text               AS holiday,
                year,
                mapped_product_code::text           AS mapped_product_code,
                mapped_product_code_description::text AS mapped_product_code_description,
                is_mapped,
                is_cadence_generated,
                CASE
                    WHEN is_cadence_generated = true AND is_mapped = true THEN 'Copied to WP'
                    WHEN (is_cadence_generated = false OR is_cadence_generated IS NULL)
                         AND (is_mapped = false OR is_mapped IS NULL) THEN 'Unmapped'
                    WHEN (is_cadence_generated = false OR is_cadence_generated IS NULL)
                         AND is_mapped = true THEN 'Mapped'
                END::text AS sku_status,
                size_set_pack::text         AS size_set_pack,
                print_catalog::text         AS print_catalog,
                drop_ship::text             AS drop_ship,
                vendor::text                AS vendor,
                vendor_label::text          AS vendor_label,
                country_of_origin::text     AS country_of_origin
            FROM item_smart.new_skus
            %s product_type::text in ('NA','Hard Kit','Regular')
            ORDER BY updated_at DESC
        ) AS x
        %s
    $SQL$, _inner_where_sql, COALESCE(_meta_sql, ''));

    RAISE NOTICE 'Executing query: %', _final_sql;

    RETURN QUERY EXECUTE _final_sql;
END;
$function$;