--liquibase formatted sql
--changeset kamuju.mahaveer:dc_to_dc_available_units_v1 runOnChange:true stripComments:false splitStatements:false context:VS-730 labels:VS-730
--comment: Updated Query for dc_to_dc_available_units
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.dc_to_dc_available_units;
CREATE OR REPLACE VIEW inventory_smart.dc_to_dc_available_units
AS WITH store_attributes AS (
    SELECT store_code, channel
    FROM global.store_attributes_filter
    WHERE UPPER(store_category::text) = 'DC' AND is_deleted = false
),

ecom_aggregated AS (
    SELECT 
        product_code, 
        'S073' AS store_code, 
        SUM(oh) AS oh, 
        SUM(wip) AS wip
    FROM inventory_smart.latest_inventory_raw
    WHERE store_code IN ('S099', 'S096', 'S087')
    GROUP BY product_code
),

latest_raw_adjusted AS (
    SELECT 
        lir.product_code,
        lir.store_code,
        lir.oh - COALESCE(ecom.oh, 0) AS oh,
        lir.oo,
        lir.it,
        lir.wip - COALESCE(ecom.wip, 0) AS wip,
        sa.channel
    FROM inventory_smart.latest_inventory_raw lir
    LEFT JOIN ecom_aggregated ecom ON lir.product_code = ecom.product_code AND lir.store_code = ecom.store_code
    JOIN store_attributes sa ON lir.store_code = sa.store_code
),

latest_delta_base AS (
    SELECT 
        lid.product_code,
        lid.store_code,
        lid.oh,
        lid.oo,
        lid.it,
        lid.wip,
        sa.channel
    FROM inventory_smart.latest_inventory_delta lid
    JOIN store_attributes sa ON lid.store_code = sa.store_code
),

latest_delta_adjusted AS (
    SELECT 
        ldb.product_code,
        ldb.store_code,
        ldb.oh - COALESCE(lir.wip, 0) AS oh,
        COALESCE(lir.oo, 0) AS oo,
        COALESCE(lir.it, 0) AS it,
        COALESCE(lir.wip, 0) AS wip,
        ldb.channel
    FROM latest_delta_base ldb
    LEFT JOIN inventory_smart.latest_inventory_raw lir 
        ON ldb.product_code = lir.product_code AND ldb.store_code = lir.store_code
),

raw_exclusive AS (
    SELECT 
        r.product_code,
        r.store_code,
        r.oh,
        r.oo,
        r.it,
        r.wip,
        r.channel
    FROM latest_raw_adjusted r
    WHERE NOT EXISTS (
        SELECT 1
        FROM latest_delta_adjusted d
        WHERE d.product_code = r.product_code AND d.store_code = r.store_code
    )
),

inventory_base_temp AS (
    SELECT * FROM latest_delta_adjusted
    UNION ALL
    SELECT * FROM raw_exclusive
),

s073_agg AS (
    SELECT 
        product_code, 
        'S073' AS store_code, 
        SUM(oh) AS oh, 
        SUM(wip) AS wip
    FROM inventory_base_temp
    WHERE store_code IN ('S099', 'S096', 'S087', 'S073')
    GROUP BY product_code
),

inventory_base AS (
    SELECT 
        ibt.product_code,
        ibt.store_code,
        CASE WHEN ibt.store_code = 'S073' THEN COALESCE(s.oh, ibt.oh) ELSE ibt.oh END AS oh,
        ibt.oo,
        ibt.it,
        CASE WHEN ibt.store_code = 'S073' THEN COALESCE(s.wip, ibt.wip) ELSE ibt.wip END AS wip,
        ibt.channel
    FROM inventory_base_temp ibt
    LEFT JOIN s073_agg s ON ibt.product_code = s.product_code AND ibt.store_code = s.store_code
),

mapping_table AS (
    SELECT 
        product_code AS new_product_code,
        old_product_code
    FROM inventory_smart.product_supersession_mapping
    WHERE CURRENT_DATE BETWEEN start_date AND end_date
),

final_base AS (
    SELECT 
        COALESCE(m.new_product_code, ib.product_code) AS product_code,
        ib.store_code,
        ib.channel,
        SUM(ib.it) AS it,
        SUM(ib.oh) AS oh,
        SUM(ib.oo) AS oo,
        SUM(ib.wip) AS wip
    FROM inventory_base ib
    LEFT JOIN mapping_table m ON ib.product_code = m.old_product_code
    GROUP BY COALESCE(m.new_product_code, ib.product_code), ib.store_code, ib.channel
	UNION
    SELECT 
        a.product_code,
        a.store_code,
        a.channel,
        SUM(COALESCE(a.it, 0)) AS it,
        SUM(COALESCE(a.oh, 0)) AS oh,
        SUM(COALESCE(a.oo, 0)) AS oo,
        SUM(COALESCE(a.wip, 0)) AS wip
    FROM inventory_base a
    JOIN mapping_table m ON a.product_code::text = m.old_product_code::text
    GROUP BY a.product_code, a.store_code, a.channel
)

SELECT 
    paf.l0_name,
    paf.article,
    paf.product_code,
    paf.product_code AS pack_type_id,
    paf.size,
    fb.oh,
    fb.it,
    fb.oo,
    fb.channel,
    dc.dc_code,
    1 AS units_in_pack,
    'E' AS type
FROM final_base fb
JOIN global.distribution_centres dc 
    ON fb.store_code = dc.linked_store_code
JOIN global.product_attributes_filter paf 
    ON fb.product_code = paf.product_code;
