--liquibase formatted sql
--changeset shashwat.yadav:dc_to_dc_available_units runOnChange:true stripComments:false splitStatements:false context:VS-730 labels:VS-730
--comment: Creating function for dc_to_dc_available_units that accepts list of articles
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_to_dc_available_units(varchar);

CREATE OR REPLACE FUNCTION inventory_smart.dc_to_dc_available_units(p_articles_str varchar default '')
RETURNS TABLE (
    l0_name varchar,
    article varchar,
    product_code varchar,
    pack_type_id varchar,
    size varchar,
    oh numeric,
    it bigint,
    oo bigint,
    channel varchar,
    dc_code int4,
    units_in_pack int4,
    type text
)
LANGUAGE plpgsql
AS $function$
declare 
    _pa_query text;
    _sa_query text;
    _pa_sa_query text;
    _query_meta_filters text;
    _query_combine text;
_sql text;
BEGIN
_sql := $$
    WITH store_attributes AS (
        SELECT saf.store_code, saf.channel
        FROM global.store_attributes_filter saf
        WHERE UPPER(store_category::text) = 'DC' AND is_deleted = false
    ),

    ecom_aggregated AS (
        SELECT 
            lir.product_code, 
            'S073' AS store_code, 
            SUM(lir.oh) AS oh, 
            SUM(lir.wip) AS wip
        FROM inventory_smart.latest_inventory_raw lir
        JOIN global.product_attributes_filter paf USING(product_code)
        WHERE lir.store_code IN ('S099', 'S096', 'S087')
        AND paf.article = ANY(string_to_array($$ || quote_literal(p_articles_str) || $$, ','))
        GROUP BY lir.product_code
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
        JOIN global.product_attributes_filter paf ON lir.product_code = paf.product_code
        LEFT JOIN ecom_aggregated ecom ON lir.product_code = ecom.product_code AND lir.store_code = ecom.store_code
        JOIN store_attributes sa ON lir.store_code = sa.store_code
        WHERE EXISTS (SELECT 1 FROM ecom_aggregated ecom WHERE ecom.product_code = lir.product_code)
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
        JOIN global.product_attributes_filter paf ON lid.product_code = paf.product_code
        JOIN store_attributes sa ON lid.store_code = sa.store_code
        WHERE paf.article = ANY(string_to_array($$ || quote_literal(p_articles_str) || $$, ','))
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
            psm.product_code AS new_product_code,
            psm.old_product_code
        FROM inventory_smart.product_supersession_mapping psm
        JOIN global.product_attributes_filter paf ON psm.product_code = paf.product_code
        WHERE CURRENT_DATE BETWEEN psm.start_date AND psm.end_date
        AND paf.article = ANY(string_to_array($$ || quote_literal(p_articles_str) || $$, ','))
        GROUP BY psm.product_code, psm.old_product_code
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
        ON fb.product_code = paf.product_code$$;
raise notice '_sql: %', _sql;
return query execute _sql;
END;
$function$;