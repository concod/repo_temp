--liquibase formatted sql
--changeset liquibase:po_finalize_query runOnChange:true stripComments:false splitStatements:false context:MTP-92981_1 labels:MTP-92981_1
--comment: MTP-92981 inventory_smart.po_finalize_query reverted to global version
--rollback: SELECT 1
-- Drop the existing procedure if it exists
DROP FUNCTION IF EXISTS inventory_smart.po_finalize_query(VARCHAR);


CREATE OR REPLACE FUNCTION inventory_smart.po_finalize_query(p_allocation_code character varying)
 RETURNS TABLE(result_json jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_json_output JSONB := '[]'::jsonb;
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_execution_time NUMERIC(10, 3);
    v_log_id INTEGER;
    v_article_clean VARCHAR(1000);
    v_sku_count INTEGER := 0;
    v_delivery_date DATE;
    v_statistical_delivery_date DATE;
    rec RECORD;
    char_row RECORD;
    v_eastern_today           date;
    v_shipping_date_default   date;
    v_delivery_date_default   date;
BEGIN
    v_start_time := clock_timestamp();
    INSERT INTO global.supersession_function_logs (allocation_code, start_time, status)
    VALUES (p_allocation_code, v_start_time, 'RUNNING')
    RETURNING id INTO v_log_id;
    UPDATE global.supersession_function_logs
    SET error_message =
        ' plan_count=' || (SELECT COUNT(*)::text FROM inventory_smart.plan_master
                          WHERE plan_code = p_allocation_code AND status = 3 AND is_deleted = false)
        || ' flat_count=' || (SELECT COUNT(*)::text FROM inventory_smart.create_allocation_result_flat_gurobi
                              WHERE allocation_code = p_allocation_code)
    WHERE id = v_log_id;
    DROP TABLE IF EXISTS po_allocation_unpacked;
    DROP TABLE IF EXISTS po_allocation_with_po_master;
    DROP TABLE IF EXISTS po_allocation_with_site;
    DROP TABLE IF EXISTS po_allocation_aggregated;
    DROP TABLE IF EXISTS character_mapping;
    -- 1) Base allocation rows (only PO keys from pack_dc_allocation)
    CREATE TEMP TABLE po_allocation_unpacked AS
    WITH plan_master AS (
        SELECT plan_code, updated_by, status
        FROM inventory_smart.plan_master pm
        WHERE status = 3 AND is_deleted = false AND plan_code = p_allocation_code
    ),
    allocations_calc_base_ranked AS (
        SELECT p.*, ROW_NUMBER() OVER (PARTITION BY allocation_code, article, store, retail_size_cd, dc_codes ORDER BY updated_at DESC) AS rnk
        FROM inventory_smart.create_allocation_result_flat_gurobi p
        WHERE allocation_code IN (SELECT plan_code FROM plan_master)
    ),
    allocations_calc_base AS (
        SELECT * FROM allocations_calc_base_ranked WHERE rnk = 1
    ),
    unpacked_po AS (
        SELECT DISTINCT
            carfg.allocation_code,
            carfg.store AS store_code,
            dc.po_code_key AS po_code,
            pa.pack_type AS product_code,
            NULLIF(regexp_replace(pq.packs_allocated_qty::text, '[""]', '', 'g'), '')::integer AS allocated_qty
        FROM allocations_calc_base carfg,
             jsonb_each(carfg.pack_dc_allocation) AS dc(po_code_key, details),
             LATERAL jsonb_array_elements_text(details -> 'packs_allocated') WITH ORDINALITY AS pa(pack_type, idx),
             LATERAL jsonb_array_elements(details -> 'packs_allocated_qty') WITH ORDINALITY AS pq(packs_allocated_qty, idx2)
        WHERE pa.idx = pq.idx2
          AND NULLIF(regexp_replace(pq.packs_allocated_qty::text, '[""]', '', 'g'), '')::integer > 0
          AND dc.po_code_key IN (SELECT po_code::text FROM inventory_smart.po_master)
    )
    SELECT * FROM unpacked_po;
    UPDATE global.supersession_function_logs
    SET error_message = COALESCE(error_message, '') || ' unpacked=' || (SELECT COUNT(*)::text FROM po_allocation_unpacked)
    WHERE id = v_log_id;
    -- 2) Join to po_master and product class (for Fragrance exclusion)
    CREATE TEMP TABLE po_allocation_with_po_master AS
    SELECT
        u.store_code,
        u.po_code,
        u.product_code,
        u.allocated_qty,
        pm.item AS contract_item,
        pm.vendor_id,
        pm.purchase_group,
        pm.requirement_date,
        pm.document_date,
        pm.validity_period_start,
        COALESCE(LOWER(TRIM(prod.product_class)), '') AS product_class
    FROM po_allocation_unpacked u
    JOIN inventory_smart.po_master pm ON pm.po_code::text = u.po_code AND pm.product_code = u.product_code
    LEFT JOIN (
        SELECT DISTINCT product_code,
               CASE WHEN l3_name ILIKE '%fragrance%' THEN 'fragrance' ELSE '' END AS product_class
        FROM global.product_attributes_filter
        WHERE product_code IS NOT NULL
    ) prod ON prod.product_code = u.product_code;
    UPDATE global.supersession_function_logs
    SET error_message = COALESCE(error_message, '') || ' with_po_master=' || (SELECT COUNT(*)::text FROM po_allocation_with_po_master)
    WHERE id = v_log_id;
    -- 3) Map store_code -> Site (ASC or SAP), with exclusions and l1_name
    CREATE TEMP TABLE po_allocation_with_site AS
    SELECT
        m.*,
        CASE
            WHEN m.store_code IN ('C120', 'C169', 'C107', 'C114') THEN COALESCE(saf.sap_site_id, m.store_code)
            WHEN m.product_class = 'fragrance' THEN COALESCE(saf.sap_site_id, m.store_code)
            ELSE COALESCE(sam.asc_id, saf.sap_site_id, m.store_code)
        END AS site_id,
        CASE
            WHEN m.product_code LIKE '%-Outlet-Store' THEN 'Outlet-Store'
            ELSE 'Retail-Store'
        END AS l1_name
    FROM po_allocation_with_po_master m
    LEFT JOIN global.store_attributes_filter saf ON saf.store_code = m.store_code
    LEFT JOIN inventory_smart.store_asc_mapping sam ON sam.sap_site_id = saf.sap_site_id;
    UPDATE global.supersession_function_logs
    SET error_message = COALESCE(error_message, '') || ' with_site=' || (SELECT COUNT(*)::text FROM po_allocation_with_site)
    WHERE id = v_log_id;
       -- 4) Aggregate by ASC/site (sum Scheduled Quantity per site/product/PO)
    CREATE TEMP TABLE po_allocation_aggregated AS
    SELECT
        site_id,
        store_code,
        po_code,
        product_code,
        contract_item,
        vendor_id,
        purchase_group,
        requirement_date,
        document_date,
        validity_period_start,
        l1_name,
        SUM(allocated_qty)::integer AS allocated_qty
    FROM po_allocation_with_site
    WHERE COALESCE(TRIM(site_id::text), '') <> ''
    GROUP BY site_id, store_code, po_code, product_code, contract_item, vendor_id, purchase_group,
             requirement_date, document_date, validity_period_start, l1_name;
    UPDATE global.supersession_function_logs
    SET error_message = COALESCE(error_message, '') || ' aggregated=' || (SELECT COUNT(*)::text FROM po_allocation_aggregated)
    WHERE id = v_log_id;

    CREATE TEMP TABLE character_mapping AS
    SELECT special_character, replace_character FROM global.special_characters_mapping;

    CREATE TEMP TABLE _po_for_insert AS
    SELECT * FROM po_allocation_aggregated;

    FOR char_row IN SELECT special_character, replace_character FROM character_mapping LOOP
        UPDATE _po_for_insert SET product_code = REPLACE(product_code, char_row.special_character, char_row.replace_character);
    END LOOP;

    -- 5) Insert into final_allocations_results (use cleaned _po_for_insert)
    INSERT INTO inventory_smart.final_allocations_results (
        allocation_code,
        original_product_code,
        supersession_product_code,
        brand,
        inner_pack_units,
        ticket_type,
        store_code,
        dc_code,
        updated_by,
        created_at,
        quantity,
        allocation_type,
        po_asn_id
    )
    SELECT
        p_allocation_code,
        a.product_code,
        a.product_code,
        NULL,
        NULL,
        NULL,
        a.site_id::varchar,
        a.po_code::varchar,
        (SELECT COALESCE(NULLIF(pm.updated_by, 0), pm.created_by) FROM inventory_smart.plan_master pm
         WHERE pm.plan_code = p_allocation_code AND pm.status IN (1, 3) AND pm.is_deleted = false
         LIMIT 1),
        CURRENT_DATE,
        a.allocated_qty,
        'PO',
        a.po_code::varchar
    FROM _po_for_insert a
    ON CONFLICT (allocation_code, store_code, dc_code, supersession_product_code, created_at)
    DO UPDATE SET
        quantity = EXCLUDED.quantity,
        updated_by = EXCLUDED.updated_by,
        po_asn_id = EXCLUDED.po_asn_id;

    DROP TABLE IF EXISTS _po_for_insert;
    v_eastern_today         := (CURRENT_TIMESTAMP AT TIME ZONE 'America/New_York')::date;
    v_shipping_date_default := v_eastern_today + 1;
    v_delivery_date_default := v_eastern_today + 14;

    -- 6) Build JSON from aggregated rows (still use po_allocation_aggregated)
    FOR rec IN
        SELECT site_id, po_code, product_code, contract_item, vendor_id, purchase_group,
               requirement_date, document_date, validity_period_start, l1_name, allocated_qty
        FROM po_allocation_aggregated
        ORDER BY site_id, po_code, product_code
    LOOP
        v_article_clean := rec.product_code;
        IF v_article_clean LIKE '%-Outlet-Store' THEN
            v_article_clean := REPLACE(v_article_clean, '-Outlet-Store', '');
        ELSIF v_article_clean LIKE '%-Retail-Store' THEN
            v_article_clean := REPLACE(v_article_clean, '-Retail-Store', '');
        END IF;
        FOR char_row IN SELECT special_character, replace_character FROM character_mapping LOOP
            v_article_clean := REPLACE(v_article_clean, char_row.special_character, char_row.replace_character);
        END LOOP;
        v_delivery_date := v_delivery_date_default;
        v_statistical_delivery_date := GREATEST(
            v_eastern_today,
            (v_delivery_date - INTERVAL '14 days')::date
        );
        v_json_output := v_json_output || jsonb_build_object(
            'DCR', '',
            'Site', COALESCE(TRIM(rec.site_id), ''),
            'Carton', '',
            'Vendor', COALESCE(LTRIM(rec.vendor_id::text, '0'), ''),
            'Article', COALESCE(TRIM(v_article_clean), ''),
            'Freight', '',
            'Newness', '',
            'Contract', rec.po_code::text,
            'Item Text', '',
            'Pick_Hold', '',
            'RMA Number', '',
            'Header Text', '',
            'Contract Item', rec.contract_item::text,
            'Delivery Date', TO_CHAR(v_delivery_date, 'MM/DD/YYYY'),
            'Our Reference', '',
            'Stock Segment', CASE WHEN rec.l1_name = 'Outlet-Store' THEN 'RTO' ELSE 'RTL' END,
            'Carton Content', '',
            'Purchase Group', COALESCE(NULLIF(TRIM(rec.purchase_group), ''), '-'),
            'Shipping Label', '',
            'Your Reference', '',
            'Return Indicator', '',
            'Storage Location', '1',
            'Production Season', '',
            'Scheduled Quantity', rec.allocated_qty,
            'Shipping Instruction', '6',
            'Special Instructions', '',
            'Special Shipping Code', '',
            'Statistical Delivery Date', TO_CHAR(v_statistical_delivery_date, 'MM/DD/YYYY')
	        );
	        v_sku_count := v_sku_count + 1;
	    END LOOP;
	    v_end_time := clock_timestamp();
	    v_execution_time := EXTRACT(EPOCH FROM (v_end_time - v_start_time));
	    UPDATE global.supersession_function_logs
	    SET end_time = v_end_time,
	        execution_time_seconds = v_execution_time,
	        sku_count = v_sku_count,
	        status = 'SUCCESS',
	        error_message = NULL
	    WHERE id = v_log_id;
	    result_json := v_json_output;
	    RETURN NEXT;
	EXCEPTION
	    WHEN OTHERS THEN
	        v_end_time := clock_timestamp();
	        v_execution_time := EXTRACT(EPOCH FROM (v_end_time - v_start_time));
	        UPDATE global.supersession_function_logs
	        SET end_time = v_end_time,
	            execution_time_seconds = v_execution_time,
	            sku_count = v_sku_count,
	            status = 'ERROR',
	            error_message = SQLERRM || ' (Line: ' || SQLSTATE || ')'
	        WHERE id = v_log_id;
	        result_json := jsonb_build_object('error', SQLERRM);
	        RETURN NEXT;
	END;
	$function$;

