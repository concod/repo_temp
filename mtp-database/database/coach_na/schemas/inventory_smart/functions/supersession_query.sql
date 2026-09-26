--liquibase formatted sql
--changeset liquibase:supersession_query runOnChange:true stripComments:false splitStatements:false context:MTP-92981_1 labels:MTP-92981_1
--comment: MTP-92981 inventory_smart.supersession_query reverted to global version
--rollback: SELECT 1
-- Drop the existing procedure if it exists
DROP FUNCTION IF EXISTS inventory_smart.supersession_query(VARCHAR);

CREATE OR REPLACE FUNCTION inventory_smart.supersession_query(p_allocation_code character varying)
 RETURNS TABLE(result_json jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_qc_passed BOOLEAN := TRUE;
    v_qc_message TEXT := '';
    v_row_count INTEGER;
    v_max_priority INTEGER;
    v_priority_level INTEGER;
    v_json_output JSONB;
    v_store_details JSONB;
    v_order_details JSONB;
    v_line_number INTEGER := 1;
    v_country VARCHAR(255);
    v_store_sap_site_id VARCHAR(255);
    v_store_dc_code VARCHAR(255);
    v_dc_sap_site_id VARCHAR(255);
    v_store_value VARCHAR(255);
    v_clean_sku_id VARCHAR(1000);
    v_size VARCHAR(255);
    v_color VARCHAR(255);
    v_style VARCHAR(255);
    v_assortment_indicator VARCHAR(255);
    v_transit_time INTEGER;
    v_in_store_date VARCHAR(255);
    store_row RECORD;
    product_row RECORD;
    char_row RECORD;
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_execution_time NUMERIC(10, 3);
    v_sku_count INTEGER;
    v_log_id INTEGER;
    v_step_start_time TIMESTAMP;
    v_step_time NUMERIC(10, 3);
    v_brand VARCHAR(255);
    v_channel VARCHAR(255);
    v_debug_count INTEGER;
    v_debug_sum NUMERIC;
    v_inventory_source TEXT;
BEGIN
    -- Check inventory_source for this allocation; if PO, delegate to PO SP and exit
    SELECT carfg.inventory_source
    INTO v_inventory_source
    FROM inventory_smart.create_allocation_result_flat_gurobi carfg
    WHERE carfg.allocation_code = p_allocation_code
    ORDER BY carfg.updated_at DESC
    LIMIT 1;
    IF UPPER(TRIM(COALESCE(v_inventory_source, ''))) = 'PO' THEN
        RETURN QUERY SELECT * FROM inventory_smart.po_finalize_query(p_allocation_code);
        RETURN;
    END IF;
    v_start_time := clock_timestamp();
    INSERT INTO global.supersession_function_logs (allocation_code, start_time, status)
    VALUES (p_allocation_code, v_start_time, 'RUNNING')
    RETURNING id INTO v_log_id;
    -- SET client_min_messages = 'DEBUG';
    DROP TABLE IF EXISTS allocations_article_level;
    DROP TABLE IF EXISTS supersession_mapping;
    DROP TABLE IF EXISTS supersession_inventory;
    DROP TABLE IF EXISTS aggregated_df;
    DROP TABLE IF EXISTS aggregated_with_mapping;
    DROP TABLE IF EXISTS aggregated_with_inventory;
    DROP TABLE IF EXISTS aggregated_with_cumulative;
    DROP TABLE IF EXISTS aggregated_with_raw_allocation;
    DROP TABLE IF EXISTS aggregated_with_allocated_sub_sku;
    DROP TABLE IF EXISTS aggregated_with_priority_rank;
    DROP TABLE IF EXISTS combined_df;
  	DROP TABLE IF EXISTS aggregated_priority_caps;
    DROP TABLE IF EXISTS combined_with_cumulative;
    DROP TABLE IF EXISTS combined_with_final_allocation;
    DROP TABLE IF EXISTS supersession_output;
    DROP TABLE IF EXISTS unmapped_products;
    DROP TABLE IF EXISTS store_attributes;
    DROP TABLE IF EXISTS dc_mapping;
    DROP TABLE IF EXISTS dc_to_sap_dict;
    DROP TABLE IF EXISTS product_attributes;
    DROP TABLE IF EXISTS ps_door_stores;
    DROP TABLE IF EXISTS store_data;
    DROP TABLE IF EXISTS original_allocations;
    DROP TABLE IF EXISTS qc_comparison;
    DROP TABLE IF EXISTS character_mapping;
    


CREATE TEMP TABLE character_mapping AS
SELECT special_character, replace_character FROM global.special_characters_mapping;

    v_step_start_time := clock_timestamp();
    CREATE TEMP TABLE allocations_article_level AS
    WITH plan_master AS (
        SELECT plan_code, updated_by, status
        FROM inventory_smart.plan_master pm
        WHERE status = 3 AND is_deleted = false AND plan_code = p_allocation_code
    ),
    allocations_calc_base_ranked AS (
        SELECT p.*, ROW_NUMBER() OVER (PARTITION BY allocation_code, article, store, retail_size_cd, dc_codes ORDER BY updated_at DESC) as rnk
        FROM inventory_smart.create_allocation_result_flat_gurobi p
        WHERE allocation_code IN (SELECT plan_code FROM plan_master)
    ),
    allocations_calc_base AS (
        SELECT * FROM allocations_calc_base_ranked WHERE rnk = 1
    ),
    insert_dupes AS (
        INSERT INTO inventory_smart.duplicate_downstream_data
        SELECT allocation_code, article, store, retail_size_cd, dc_codes, to_jsonb(t) - 'allocation_code' - 'article' - 'store' - 'retail_size_cd' - 'dc_codes' as data, now() as created_at
        FROM allocations_calc_base_ranked as t
        WHERE rnk <> 1
    ),
    unpacked_allocations AS (
        SELECT DISTINCT
            carfg.allocation_code,
            carfg.article,
            carfg.retail_size_cd AS size,
            carfg.store,
            carfg.source,
            carfg.created_at,
       		carfg.updated_by,
       		carfg.created_by,
        	dc.dc_code::int as dc_code,
            pa.pack_type,
            NULLIF(regexp_replace(pq.packs_allocated_qty::text, '[""]', '', 'g'), '')::integer as allocated_qty
        FROM allocations_calc_base carfg,
            jsonb_each(pack_dc_allocation) AS dc(dc_code, details),
            lateral jsonb_array_elements_text(details -> 'packs_allocated') WITH ordinality AS pa(pack_type, idx),
            lateral jsonb_array_elements(details -> 'packs_allocated_qty') WITH ordinality AS pq(packs_allocated_qty, idx2)
        WHERE pa.idx = pq.idx2
        AND NULLIF(regexp_replace(pq.packs_allocated_qty::text, '[""]', '', 'g'), '')::integer > 0
    ),
     final_allocations AS (
        SELECT DISTINCT
            ua.allocation_code,
            COALESCE(paf.product_code, dpc.pack_type_id) AS product_code,
            COALESCE(paf.l0_name,
                     CASE WHEN p_allocation_code ILIKE '%KateSpade%' THEN 'KateSpade'
                          WHEN p_allocation_code ILIKE '%Coach%'    THEN 'Coach'
                          ELSE 'KateSpade' END) AS brand,
            1 as ticket_type,
            ua.store as store_code,
			dc.linked_store_code as dc_code,
            COALESCE(NULLIF(ua.updated_by, 0), ua.created_by) AS updated_by,
            ua.created_at::date as created_at,
            ua.allocated_qty as quantity,
            CASE WHEN UPPER(ua.source) = 'DC' THEN 'Allocation from DC' ELSE 'Allocation from ASN' END as allocation_type,
            CASE WHEN UPPER(ua.source) = 'ASN' THEN ua.dc_code::varchar END AS po_asn_id
        FROM unpacked_allocations ua
        JOIN global.distribution_centres dc ON ua.dc_code = dc.dc_code
        JOIN inventory_smart.dc_pack_configuration dpc ON ua.article = dpc.article AND ua.size = dpc.size AND ua.pack_type = dpc.pack_type_id
        LEFT JOIN global.product_attributes_filter paf ON ua.article = paf.article AND ua.size = paf.size AND paf.product_code = ua.pack_type
        ORDER BY store_code, dc_code
    )
    SELECT * FROM final_allocations;
    SELECT COUNT(*), COALESCE(SUM(quantity), 0) INTO v_debug_count, v_debug_sum FROM allocations_article_level;
    RAISE DEBUG '[DEBUG] allocations_article_level: row_count=%, sum(quantity)=% (expected 8 rows, 56 total)', v_debug_count, v_debug_sum;
    v_step_time := EXTRACT(EPOCH FROM (clock_timestamp() - v_step_start_time));
    RAISE DEBUG 'Step 1 completed in % seconds', v_step_time;
    IF (SELECT COUNT(*) FROM allocations_article_level) = 0 THEN
        RAISE DEBUG 'DEBUG: No allocations found for plan code: %', p_allocation_code;
    END IF;

    v_step_start_time := clock_timestamp();
    CREATE TEMP TABLE supersession_mapping AS
    WITH supersession_mapping AS (
        SELECT product_code, old_product_code, priority
        FROM inventory_smart.product_supersession_mapping psm
        WHERE psm.product_code IN (SELECT DISTINCT product_code FROM allocations_article_level)
    )
    SELECT product_code::varchar as product_code, old_product_code::varchar as old_product_code, priority FROM supersession_mapping
    UNION DISTINCT
    (SELECT product_code::varchar, product_code::varchar, COALESCE(MAX(priority), 0) + 1 FROM supersession_mapping GROUP BY 1,2);
    SELECT COUNT(*) INTO v_debug_count FROM supersession_mapping;
    RAISE DEBUG '[DEBUG] supersession_mapping: row_count=%', v_debug_count;
    v_step_time := EXTRACT(EPOCH FROM (clock_timestamp() - v_step_start_time));
    RAISE DEBUG 'Step 2 completed in % seconds', v_step_time;

    v_step_start_time := clock_timestamp();
    CREATE TEMP TABLE supersession_inventory AS
    WITH reserves AS (
        SELECT product_code, dc_code, SUM(quantity) as quantity
        FROM inventory_smart.sku_dc_reserved_units sdru
        WHERE product_code IN (SELECT DISTINCT old_product_code FROM supersession_mapping)
        GROUP BY 1,2
    ),
    inventory_with_reserve AS (
        SELECT product_code, dc_code, oh_packs as oh, COALESCE(sdru.quantity, 0) as quantity
        FROM inventory_smart.sku_dc_available_units li
        LEFT JOIN reserves sdru USING(product_code, dc_code)
        WHERE product_code IN (SELECT DISTINCT old_product_code FROM supersession_mapping)
    ),
    old_product_sum AS (
        SELECT psm.product_code as new_product, inv.dc_code,
               SUM(inv.oh - inv.quantity) as total_old_inventory
        FROM inventory_with_reserve inv
        JOIN inventory_smart.product_supersession_mapping psm ON inv.product_code = psm.old_product_code
        WHERE psm.product_code != psm.old_product_code
        GROUP BY psm.product_code, inv.dc_code
    )
    SELECT inv.product_code::varchar as old_product_code,
           dc.linked_store_code::varchar as dc_code,
           CASE WHEN inv.product_code IN (SELECT DISTINCT product_code FROM inventory_smart.product_supersession_mapping WHERE product_code != old_product_code)
                THEN GREATEST(0, (inv.oh - inv.quantity) - COALESCE(ops.total_old_inventory, 0))
                ELSE (inv.oh - inv.quantity) END::float as oh,
           1 as inner_pack_units
    FROM inventory_with_reserve inv
    JOIN global.distribution_centres dc ON inv.dc_code = dc.dc_code
    LEFT JOIN old_product_sum ops ON inv.product_code = ops.new_product AND inv.dc_code = ops.dc_code
    ORDER BY inv.product_code;
    v_step_time := EXTRACT(EPOCH FROM (clock_timestamp() - v_step_start_time));
    RAISE DEBUG 'Step 3 completed in % seconds', v_step_time;

    CREATE TEMP TABLE unmapped_products AS
    SELECT DISTINCT aal.product_code
    FROM allocations_article_level aal
    LEFT JOIN supersession_mapping sm ON aal.product_code = sm.product_code
    WHERE sm.product_code IS NULL;
    INSERT INTO supersession_mapping (product_code, old_product_code, priority)
    SELECT product_code, product_code, 999 FROM unmapped_products;
    INSERT INTO supersession_inventory (old_product_code, dc_code, oh, inner_pack_units)
    SELECT DISTINCT aal.product_code, aal.dc_code::varchar, 999999.0, 1
    FROM allocations_article_level aal
    JOIN unmapped_products up ON aal.product_code = up.product_code;

    CREATE TEMP TABLE aggregated_df AS
    SELECT aal.product_code, aal.dc_code, SUM(aal.quantity) as quantity, array_agg(DISTINCT aal.allocation_code) as allocation_plans
    FROM allocations_article_level aal
    GROUP BY aal.product_code, aal.dc_code;
    SELECT COUNT(*), COALESCE(SUM(quantity), 0) INTO v_debug_count, v_debug_sum FROM aggregated_df;
    RAISE DEBUG '[DEBUG] aggregated_df: row_count=%, sum(quantity)=%', v_debug_count, v_debug_sum;

    CREATE TEMP TABLE aggregated_with_mapping AS
    SELECT ad.*, COALESCE(sm.old_product_code, ad.product_code) as old_product_code, COALESCE(sm.priority, 999) as priority
    FROM aggregated_df ad
    LEFT JOIN supersession_mapping sm ON ad.product_code = sm.product_code;

    CREATE TEMP TABLE aggregated_with_inventory AS
    SELECT am.*, COALESCE(si.oh, 0) as oh, COALESCE(si.inner_pack_units, 1) as inner_pack_units
    FROM aggregated_with_mapping am
    LEFT JOIN supersession_inventory si ON am.old_product_code = si.old_product_code AND am.dc_code = si.dc_code;

    CREATE TEMP TABLE aggregated_with_cumulative AS
    SELECT *, SUM(oh) OVER (PARTITION BY product_code, dc_code ORDER BY priority ROWS UNBOUNDED PRECEDING) as cumulative_oh
    FROM aggregated_with_inventory
    ORDER BY product_code, dc_code, priority;

    CREATE TEMP TABLE aggregated_with_raw_allocation AS
    SELECT *, CASE WHEN cumulative_oh < quantity THEN oh ELSE oh + (quantity - cumulative_oh) END as raw_allocation
    FROM aggregated_with_cumulative;

    CREATE TEMP TABLE aggregated_with_allocated_sub_sku AS
    SELECT *, CASE WHEN (raw_allocation::integer % inner_pack_units::integer) != 0
                   THEN ((raw_allocation::integer / inner_pack_units::integer) + 1) * inner_pack_units::integer
                   ELSE raw_allocation::integer END as allocated_sub_sku
    FROM aggregated_with_raw_allocation;

    CREATE TEMP TABLE aggregated_with_priority_rank AS
    SELECT *, ROW_NUMBER() OVER (PARTITION BY product_code, dc_code ORDER BY priority) as priority_rank
    FROM aggregated_with_allocated_sub_sku
    WHERE allocated_sub_sku > 0;
    SELECT COUNT(*) INTO v_debug_count FROM aggregated_with_priority_rank;
    RAISE DEBUG '[DEBUG] aggregated_with_priority_rank: row_count=% (if >8, this causes duplicate rows in combined_df)', v_debug_count;

    
    CREATE TEMP TABLE aggregated_priority_caps AS
  SELECT
      product_code,
      dc_code,
      SUM(allocated_sub_sku)::numeric AS allocated_sub_sku,
      MAX(inner_pack_units) AS inner_pack_units,
      (ARRAY_AGG(old_product_code ORDER BY priority_rank DESC))[1] AS old_product_code,
      MAX(priority_rank) AS priority_rank
  FROM aggregated_with_priority_rank
  GROUP BY product_code, dc_code;
  CREATE TEMP TABLE combined_df AS
  SELECT aal.*, COALESCE(apc.old_product_code, aal.product_code) AS old_product_code, COALESCE(apc.priority_rank, 999) AS priority,
         COALESCE(apc.allocated_sub_sku, 0) AS allocated_sub_sku, COALESCE(apc.inner_pack_units, 1) AS inner_pack_units
  FROM allocations_article_level aal
  LEFT JOIN aggregated_priority_caps apc
    ON apc.product_code = aal.product_code AND apc.dc_code = aal.dc_code;

    SELECT COUNT(*), COALESCE(SUM(quantity), 0) INTO v_debug_count, v_debug_sum FROM combined_df;
    RAISE DEBUG '[DEBUG] combined_df: row_count=%, sum(quantity)=% (expected 8, 56)', v_debug_count, v_debug_sum;

    CREATE TEMP TABLE combined_with_cumulative AS
    SELECT *, SUM(quantity) OVER (PARTITION BY old_product_code, dc_code ORDER BY allocation_code, store_code ROWS UNBOUNDED PRECEDING) as cumulative_quantity
    FROM combined_df
    ORDER BY product_code, dc_code, old_product_code, allocation_code, store_code;
    SELECT COUNT(*), COALESCE(SUM(quantity), 0) INTO v_debug_count, v_debug_sum FROM combined_with_cumulative;
    RAISE DEBUG '[DEBUG] combined_with_cumulative: row_count=%, sum(quantity)=%', v_debug_count, v_debug_sum;

    CREATE TEMP TABLE combined_with_final_allocation AS
    SELECT *, CASE WHEN cumulative_quantity < allocated_sub_sku THEN quantity
                   ELSE GREATEST(0, quantity - (cumulative_quantity - allocated_sub_sku)) END as final_allocation
    FROM combined_with_cumulative;
    SELECT COUNT(*), COALESCE(SUM(final_allocation), 0) INTO v_debug_count, v_debug_sum FROM combined_with_final_allocation;
    RAISE DEBUG '[DEBUG] combined_with_final_allocation (initial): row_count=%, sum(final_allocation)=%', v_debug_count, v_debug_sum;

    CREATE TEMP TABLE supersession_output AS
    SELECT allocation_code, product_code as original_product_code, old_product_code as supersession_product_code, brand, inner_pack_units::integer, ticket_type,
           store_code, dc_code, updated_by, created_at, final_allocation::integer as quantity, allocation_type, po_asn_id
    FROM combined_with_final_allocation
    WHERE final_allocation > 0;

    SELECT MAX(priority_rank) INTO v_max_priority FROM aggregated_with_priority_rank;
    IF v_max_priority IS NULL THEN v_max_priority := 0; END IF;
    RAISE DEBUG '[DEBUG] priority_rank max=%, running priority loop', v_max_priority;
    v_step_start_time := clock_timestamp();
    FOR v_priority_level IN 1..v_max_priority LOOP
        DROP TABLE IF EXISTS combined_with_final_allocation_new;
        CREATE TEMP TABLE combined_with_final_allocation_new AS
        WITH sum_store_plan_calc AS (
            SELECT allocation_code, product_code, store_code, dc_code, SUM(final_allocation) as sum_store_plan
            FROM combined_with_final_allocation
            GROUP BY allocation_code, product_code, store_code, dc_code
        ),
         deficit_calc AS (
      SELECT
          b.*,
          b.quantity - COALESCE(ssp.sum_store_plan, 0) AS deficit
      FROM (
          SELECT
              allocation_code,
              product_code,
              store_code,
              dc_code,
              old_product_code,
              brand,
              inner_pack_units,
              ticket_type,
              updated_by,
              created_at,
              allocation_type,
              po_asn_id,
              quantity,
              priority,
              allocated_sub_sku,
              cumulative_quantity,
              final_allocation
          FROM combined_with_final_allocation c
      ) b
      LEFT JOIN sum_store_plan_calc ssp
        ON b.allocation_code = ssp.allocation_code
       AND b.product_code   = ssp.product_code
       AND b.store_code     = ssp.store_code
       AND b.dc_code        = ssp.dc_code
        ),
        adjusted_allocation_calc AS (
            SELECT d.*, CASE WHEN d.priority > v_priority_level THEN LEAST(d.final_allocation + d.deficit, d.allocated_sub_sku) ELSE d.final_allocation END as adjusted_allocation
            FROM deficit_calc d
        ),
        cumulative_quantity_calc AS (
            SELECT a.*, SUM(COALESCE(a.adjusted_allocation, a.final_allocation)) OVER (PARTITION BY a.old_product_code, a.dc_code ORDER BY a.allocation_code, a.store_code ROWS UNBOUNDED PRECEDING) as cumulative_quantity_new
            FROM adjusted_allocation_calc a
        )
        SELECT c.allocation_code, c.product_code, c.store_code, c.dc_code, c.old_product_code, c.brand, c.inner_pack_units, c.ticket_type, c.updated_by, c.created_at, c.allocation_type, c.po_asn_id,
               c.quantity, c.priority, c.allocated_sub_sku, c.cumulative_quantity, c.deficit, c.adjusted_allocation, c.cumulative_quantity_new,
               CASE WHEN c.cumulative_quantity_new < c.allocated_sub_sku THEN COALESCE(c.adjusted_allocation, c.final_allocation)
                    ELSE GREATEST(0, COALESCE(c.adjusted_allocation, c.final_allocation) - (c.cumulative_quantity_new - c.allocated_sub_sku)) END as final_allocation
        FROM cumulative_quantity_calc c;
        DROP TABLE IF EXISTS combined_with_final_allocation;
        ALTER TABLE combined_with_final_allocation_new RENAME TO combined_with_final_allocation;
    END LOOP;
    v_step_time := EXTRACT(EPOCH FROM (clock_timestamp() - v_step_start_time));
    RAISE DEBUG 'Priority loop completed in % seconds', v_step_time;
    SELECT COUNT(*), COALESCE(SUM(final_allocation), 0) INTO v_debug_count, v_debug_sum FROM combined_with_final_allocation;
    RAISE DEBUG '[DEBUG] combined_with_final_allocation (after loop): row_count=%, sum(final_allocation)=%', v_debug_count, v_debug_sum;

    -- FIX: use final_allocation (no SUM) so we do not double-count
    CREATE TEMP TABLE consolidated_allocations AS
    SELECT DISTINCT ON (allocation_code, product_code, store_code, dc_code)
        allocation_code, product_code, store_code, dc_code, old_product_code, brand, inner_pack_units, ticket_type, updated_by, created_at, allocation_type, po_asn_id,
        final_allocation
    FROM combined_with_final_allocation
    ORDER BY allocation_code, product_code, store_code, dc_code, priority ASC;
    SELECT COUNT(*), COALESCE(SUM(final_allocation), 0) INTO v_debug_count, v_debug_sum FROM consolidated_allocations;
    RAISE DEBUG '[DEBUG] consolidated_allocations: row_count=%, sum(final_allocation)=% (expected 8, 56)', v_debug_count, v_debug_sum;

    DROP TABLE IF EXISTS supersession_output;
    CREATE TEMP TABLE supersession_output AS
    SELECT allocation_code, product_code as original_product_code, old_product_code as supersession_product_code, brand, inner_pack_units::integer, ticket_type,
           store_code, dc_code, updated_by, created_at, final_allocation::integer as quantity, allocation_type, po_asn_id
    FROM consolidated_allocations
    WHERE final_allocation > 0;
    DROP TABLE IF EXISTS consolidated_allocations;
    SELECT COUNT(*), COALESCE(SUM(quantity), 0) INTO v_debug_count, v_debug_sum FROM supersession_output;
    RAISE DEBUG '[DEBUG] supersession_output (before INSERT): row_count=%, sum(quantity)=% (expected 8, 56)', v_debug_count, v_debug_sum;


FOR char_row IN SELECT special_character, replace_character FROM character_mapping LOOP
    UPDATE supersession_output
    SET original_product_code   = REPLACE(original_product_code,   char_row.special_character, char_row.replace_character),
        supersession_product_code = REPLACE(supersession_product_code, char_row.special_character, char_row.replace_character);
END LOOP;


    INSERT INTO inventory_smart.final_allocations_results (allocation_code, original_product_code, supersession_product_code, brand, inner_pack_units, ticket_type, store_code, dc_code, updated_by, created_at, quantity, allocation_type, po_asn_id)
    SELECT
        allocation_code,
        original_product_code,
        MAX(supersession_product_code) AS supersession_product_code,
        MAX(brand) AS brand,
        MAX(inner_pack_units) AS inner_pack_units,
        MAX(ticket_type) AS ticket_type,
        store_code,
        dc_code,
        MAX(updated_by) AS updated_by,
        MAX(created_at) AS created_at,
        SUM(quantity) AS quantity,
        MAX(allocation_type) AS allocation_type,
        MAX(po_asn_id) AS po_asn_id
    FROM supersession_output
    GROUP BY allocation_code, original_product_code, store_code, dc_code
    ON CONFLICT (allocation_code, store_code, dc_code, supersession_product_code, created_at) DO UPDATE SET
        original_product_code = EXCLUDED.original_product_code,
        brand = EXCLUDED.brand,
        inner_pack_units = EXCLUDED.inner_pack_units,
        ticket_type = EXCLUDED.ticket_type,
        updated_by = EXCLUDED.updated_by,
        created_at = EXCLUDED.created_at,
        quantity = EXCLUDED.quantity,
        allocation_type = EXCLUDED.allocation_type,
        po_asn_id = EXCLUDED.po_asn_id;
    RAISE DEBUG '[DEBUG] INSERT done. Run: SELECT COUNT(*), SUM(quantity) FROM final_allocations_results WHERE allocation_code = ''%'';', p_allocation_code;

  CREATE TEMP TABLE original_allocations AS
	SELECT
    aal.allocation_code,
    aal.product_code,
    aal.store_code AS store,
    aal.dc_code::varchar AS linked_store_code,
    SUM(aal.quantity)::numeric AS allocated_total
FROM allocations_article_level aal
GROUP BY aal.allocation_code, aal.product_code, aal.store_code, aal.dc_code;

	FOR char_row IN SELECT special_character, replace_character FROM character_mapping LOOP
   UPDATE original_allocations
SET product_code = REPLACE(product_code, char_row.special_character, char_row.replace_character);
	END LOOP;

       DROP TABLE IF EXISTS qc_comparison;
    CREATE TEMP TABLE qc_comparison AS
    WITH physical_stores AS (
        SELECT DISTINCT store_code
        FROM global.store_attributes_filter
        WHERE cust_type IN ('PS Door', 'PS', 'AC')
    ),
    so_agg AS (
        SELECT
            so.allocation_code,
            so.original_product_code,
            so.store_code,
            so.dc_code,
            SUM(so.quantity) AS supersession_quantity
        FROM supersession_output so
        INNER JOIN physical_stores ps ON ps.store_code = so.store_code
        GROUP BY so.allocation_code, so.original_product_code, so.store_code, so.dc_code
    ),
    oa_agg AS (
        SELECT
            oa.allocation_code,
            oa.product_code,
            oa.store,
            oa.linked_store_code,
            SUM(oa.allocated_total) AS allocated_total
        FROM original_allocations oa
        INNER JOIN physical_stores ps ON ps.store_code = oa.store
        GROUP BY oa.allocation_code, oa.product_code, oa.store, oa.linked_store_code
    )
    SELECT
        so.original_product_code,
        so.store_code AS supersession_store_code,
        so.dc_code AS supersession_dc_code,
        so.supersession_quantity,
        oa.product_code AS plan_product_code,
        oa.store AS original_store,
        oa.linked_store_code AS original_dc_code,
        oa.allocated_total,
        (so.supersession_quantity - oa.allocated_total) AS quantity_difference,
        CASE
            WHEN so.supersession_quantity = oa.allocated_total THEN 'MATCH'
            ELSE 'DEVIATION'
        END AS qc_status
    FROM so_agg so
    JOIN oa_agg oa
      ON oa.allocation_code = so.allocation_code
     AND oa.product_code = so.original_product_code
     AND oa.store = so.store_code
     AND oa.linked_store_code = so.dc_code;
    SELECT COUNT(*) INTO v_row_count FROM qc_comparison WHERE qc_status = 'DEVIATION';
    IF v_row_count > 0 THEN
        v_qc_passed := FALSE;
        v_qc_message := 'QC CHECK FAILED: Found ' || v_row_count || ' deviations between supersession and original allocations';
    ELSE
        v_qc_passed := TRUE;
        v_qc_message := 'QC CHECK PASSED: All quantities match between supersession and original allocations';
    END IF;
    RAISE DEBUG '[DEBUG] QC: %', v_qc_message;

    IF v_qc_passed THEN

        CREATE TEMP TABLE store_attributes AS
        SELECT store_code, s2_name AS country, sap_site_id, cust_type
        FROM global.store_attributes_filter
        WHERE cust_type IN ('PS Door', 'PS', 'AC');

        CREATE TEMP TABLE dc_mapping AS
        SELECT store_code as dc_code, sap_site_id
        FROM global.store_attributes_filter
        WHERE cust_type = 'DC Door';

        CREATE TEMP TABLE dc_to_sap_dict AS
        SELECT DISTINCT dc_code::varchar as dc_code, sap_site_id FROM dc_mapping;

        CREATE TEMP TABLE _paf_clean AS
        SELECT paf.product_code, paf.size, paf.color_code, paf.style, paf.assortment_indicator,
               pm.mapping_code, COALESCE(dttm.transit_time, 0) AS transit_time
        FROM global.product_attributes_filter paf
        LEFT JOIN global.product_mapping pm ON paf.product_code = pm.product_code
        LEFT JOIN inventory_smart.dc_transit_time_mapping dttm ON pm.mapping_code = dttm.mapping_code
        WHERE EXISTS (
            SELECT 1 FROM (SELECT DISTINCT supersession_product_code FROM supersession_output) s
            WHERE paf.product_code LIKE split_part(trim(s.supersession_product_code), ' ', 1) || '%'
        );

        FOR char_row IN SELECT special_character, replace_character FROM character_mapping LOOP
            UPDATE _paf_clean SET product_code = REPLACE(product_code, char_row.special_character, char_row.replace_character);
        END LOOP;

        CREATE TEMP TABLE product_attributes AS
        SELECT * FROM _paf_clean
        WHERE product_code IN (SELECT DISTINCT supersession_product_code FROM supersession_output);
        DROP TABLE _paf_clean;

        -- Pack SKUs: product_attributes has no row (pack id not in PAF). Add rows from constituent product via dc_pack_configuration.
        INSERT INTO product_attributes (product_code, size, color_code, style, assortment_indicator, mapping_code, transit_time)
        SELECT so.supersession_product_code,
               paf.size,
               paf.color_code,
               paf.style,
               paf.assortment_indicator,
               pm.mapping_code,
               COALESCE(dttm.transit_time, 0)
        FROM (SELECT DISTINCT supersession_product_code FROM supersession_output) so
        LEFT JOIN product_attributes pa ON pa.product_code = so.supersession_product_code
        JOIN inventory_smart.dc_pack_configuration dpc ON dpc.pack_type_id = so.supersession_product_code
        JOIN global.product_attributes_filter paf ON paf.product_code = dpc.product_code
        LEFT JOIN global.product_mapping pm ON paf.product_code = pm.product_code
        LEFT JOIN inventory_smart.dc_transit_time_mapping dttm ON pm.mapping_code = dttm.mapping_code
        WHERE pa.product_code IS NULL;

        CREATE TEMP TABLE ps_door_stores AS
        SELECT DISTINCT so.store_code, so.dc_code
       FROM supersession_output so
       INNER JOIN store_attributes sa ON sa.store_code = so.store_code;

        v_store_details := '[]'::jsonb;

        FOR store_row IN SELECT store_code, dc_code FROM ps_door_stores LOOP
            CREATE TEMP TABLE store_data AS
          SELECT supersession_product_code, SUM(quantity) AS total_quantity
        FROM supersession_output
        WHERE store_code = store_row.store_code AND dc_code = store_row.dc_code
        GROUP BY supersession_product_code;

            SELECT country, sap_site_id, cust_type
            INTO v_country, v_store_sap_site_id, v_channel
            FROM store_attributes
            WHERE store_code = store_row.store_code
            LIMIT 1;

            SELECT sap_site_id INTO v_dc_sap_site_id
            FROM dc_to_sap_dict
            WHERE dc_code = store_row.dc_code;

            IF EXISTS (SELECT 1 FROM inventory_smart.store_asc_mapping WHERE sap_site_id = v_store_sap_site_id) THEN
                SELECT asc_id INTO v_store_value FROM inventory_smart.store_asc_mapping WHERE sap_site_id = v_store_sap_site_id;
            ELSE
                v_store_value := v_store_sap_site_id;
            END IF;

            v_order_details := '[]'::jsonb;
			FOR product_row IN SELECT * FROM store_data LOOP
			    v_clean_sku_id := product_row.supersession_product_code;
			    IF v_clean_sku_id LIKE '%-Outlet-Store' THEN v_clean_sku_id := REPLACE(v_clean_sku_id, '-Outlet-Store', '');
			    ELSIF v_clean_sku_id LIKE '%-Retail-Store' THEN v_clean_sku_id := REPLACE(v_clean_sku_id, '-Retail-Store', '');
			    END IF;
			
			    SELECT size, color_code, style, assortment_indicator, transit_time
			    INTO v_size, v_color, v_style, v_assortment_indicator, v_transit_time
			    FROM product_attributes WHERE product_code = product_row.supersession_product_code;
			
			    FOR char_row IN SELECT special_character, replace_character FROM character_mapping LOOP
			        v_clean_sku_id := REPLACE(v_clean_sku_id, char_row.special_character, char_row.replace_character);
			        v_size  := REPLACE(COALESCE(v_size, ''),  char_row.special_character, char_row.replace_character);
			        v_color := REPLACE(COALESCE(v_color, ''), char_row.special_character, char_row.replace_character);
			        v_style := REPLACE(COALESCE(v_style, ''), char_row.special_character, char_row.replace_character);
			    END LOOP;
			
			    IF LENGTH(v_clean_sku_id) <= 11 THEN v_size := ''; END IF;
			    v_in_store_date := '';
			    IF v_assortment_indicator IS NOT NULL AND (v_assortment_indicator LIKE '40%' OR v_assortment_indicator LIKE '43%') THEN
			        v_in_store_date := TO_CHAR(CURRENT_DATE + INTERVAL '1 day' + INTERVAL '1 day' * v_transit_time, 'YYYYMMDD');
			    END IF;
			    v_order_details := v_order_details || jsonb_build_object(
			        'size', COALESCE(v_size, ''),
			        'color', COALESCE(v_color, ''),
			        'skuID', COALESCE(v_clean_sku_id, ''),
			        'style', COALESCE(v_style, ''),
			        'orderQty', product_row.total_quantity,
			        'inStoreDate', v_in_store_date,
			        'expediteFlag', '',
			        'reAllocation', 'F'
			    );
			END LOOP;
            v_store_details := v_store_details || jsonb_build_object(
                'dc', COALESCE(v_dc_sap_site_id, ''),
                'store', COALESCE(v_store_value, ''),
                'channel', COALESCE(TRIM(v_channel), 'PS Door'),
                'country', COALESCE(v_country, ''),
                'lineNumber', v_line_number,
                'orderDetails', v_order_details
            );
            v_line_number := v_line_number + 1;
            DROP TABLE IF EXISTS store_data;
        END LOOP;

        DROP TABLE IF EXISTS character_mapping;
        DROP TABLE IF EXISTS store_attributes;
        DROP TABLE IF EXISTS dc_mapping;
        DROP TABLE IF EXISTS dc_to_sap_dict;
        DROP TABLE IF EXISTS product_attributes;
        DROP TABLE IF EXISTS ps_door_stores;

        SELECT brand INTO v_brand FROM supersession_output LIMIT 1;
        v_brand := COALESCE(TRIM(v_brand), '');
        IF UPPER(TRIM(v_brand)) = 'KATESPADE' THEN
            v_brand := 'KS';
        ELSIF UPPER(TRIM(v_brand)) = 'COACH' THEN
            v_brand := 'CH';
        ELSIF v_brand = '' OR v_brand IS NULL THEN
            v_brand := 'CH';
        ELSE
            v_brand := v_brand;
        END IF;

        v_json_output := jsonb_build_object(
            'asn', '', 'poNo', '', 'brand', v_brand, 'storeDetails', v_store_details, 'allocationNumber', p_allocation_code
        );
    ELSE
        v_json_output := NULL;
    END IF;

    SELECT COUNT(DISTINCT supersession_product_code) INTO v_sku_count FROM supersession_output;
    v_end_time := clock_timestamp();
    v_execution_time := EXTRACT(EPOCH FROM (v_end_time - v_start_time));
    UPDATE global.supersession_function_logs
    SET end_time = v_end_time, execution_time_seconds = v_execution_time, sku_count = v_sku_count,
        status = CASE WHEN v_qc_passed THEN 'SUCCESS: ' || v_qc_message ELSE 'FAILED: ' || v_qc_message END,
        error_message = CASE WHEN NOT v_qc_passed THEN v_qc_message ELSE NULL END
    WHERE id = v_log_id;

    IF v_qc_passed THEN
    result_json := v_json_output;
    ELSE
    result_json := '{}'::jsonb;  -- or jsonb_build_object() if supported
    END IF;
    RETURN NEXT;

EXCEPTION
    WHEN OTHERS THEN
        v_end_time := clock_timestamp();
        v_execution_time := EXTRACT(EPOCH FROM (v_end_time - v_start_time));
        UPDATE global.supersession_function_logs
        SET end_time = v_end_time, execution_time_seconds = v_execution_time, status = 'ERROR', error_message = SQLERRM || ' (Line: ' || SQLSTATE || ')'
        WHERE id = v_log_id;
        RAISE;
END;
$function$
;