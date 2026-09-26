--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_download_layout_file runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_download_layout_file

DROP FUNCTION if exists price_promo_opt.fn_download_layout_file;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_download_layout_file(_promo_ids integer[])
 RETURNS TABLE("UPC" integer, "Item ID" bigint, "Item Name" text, "Size" text, "Event/Campaign ID" integer, "Promo ID" integer, "Start Date" date, "End Date" date, "Offer Type" text, "Bogo Buy quantity" numeric, "Bogo Get quantity" numeric, "Bogo Discount (% off)" numeric, "Scan Back" numeric, "Off Invoice" numeric, "Cost" numeric, "Regular Retail" numeric, "Sale Retail" numeric, "Savings" numeric, "%Off" numeric, "Theme" text, "In Store ONLY" text, "Regular GP%" numeric, "Sale GP%" numeric, "WNW Pictured in Ad" text, "DISPLAY" text, "WNW DISPLAY" text, "Prebook" text, "Pictured in Ad" text, "Page #" text, "Layout Block- MERCH SVC TO FILL OUT ONLY" text, "Hot Deal" text, "S2 or S5 Size & Signage Message" text, "Loyalty Points" text, "Department" text, "Sub-Department" text, "Class" text, "Sub-Class" text, "Promo Offer Name" text, "Archived" text, "Promotional Theme (Vendor)" text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _promo_details_tbl_name text;
    _promo_details_idx_name text;
    _scenario_data_tbl_name text;
    _scenario_data_idx_name text;
    _query text;
    _promo_ids_overall_level int[];
    _promo_ids_other_level int[];
    _start_time timestamptz;
    _step_start_time timestamptz;
BEGIN
    _start_time := clock_timestamp();
    -- Generate unique table names with a timestamp suffix.
    _promo_details_tbl_name := 'public.promo_products_details_' || to_char(now(), 'YYYYMMDDHH24MISSMSUS');
    _promo_details_idx_name := 'idx_promo_products_details_' || to_char(now(), 'YYYYMMDDHH24MISSMSUS');
    _scenario_data_tbl_name := 'public.promo_scenario_data_' || to_char(now(), 'YYYYMMDDHH24MISSMSUS');
    _scenario_data_idx_name := 'idx_promo_scenario_data_' || to_char(now(), 'YYYYMMDDHH24MISSMSUS');

    -- Filter promo IDs into two lists based on discount level directly from the source table.
    SELECT array_agg(promo_id) INTO _promo_ids_overall_level FROM price_promo.ps_rules WHERE promo_id = ANY(_promo_ids) AND product_discount_level = ARRAY[-200];
    SELECT array_agg(promo_id) INTO _promo_ids_other_level FROM price_promo.ps_rules WHERE promo_id = ANY(_promo_ids) AND product_discount_level <> ARRAY[-200];

    -- Create the first unlogged table with product details.
    _step_start_time := clock_timestamp();
    _query := format('CREATE UNLOGGED TABLE %s AS
        SELECT 
            
            pp.promo_id, pp.product_id, pp.user_metadata,
            
            prm.start_date, prm.end_date, prm.event_id, prm.status, prm.last_approved_scenario_id,
            price_promo.impute_special_characters(prm.name) AS promo_name,
            
          --  pm.manufacturer_id, 
--pm.movement, 
pm.primary_upc AS upc, pm.size AS prod_size,
--			pm.original_uom::text AS size_code, 
--			pm.map, pm.imap, pm.psp_store_count, pm.wnw_store_count, 
			pm.promo_base_price, pm.cost,
            price_promo.impute_special_characters(pm.product_name) AS product_name, 
            price_promo.impute_special_characters(pm.l0_name) AS l0_name, 
            price_promo.impute_special_characters(pm.l1_name) AS l1_name, 
            price_promo.impute_special_characters(pm.l2_name) AS l2_name, 
            price_promo.impute_special_characters(pm.l3_name) AS l3_name, 
--            price_promo.impute_special_characters(pm.manufacturer) AS manufacturer, 
--            price_promo.impute_special_characters(pm.merchandiser) AS merchandiser, 
--            price_promo.impute_special_characters(pm.brand) AS brand,
            
            pr.product_discount_level
        FROM price_promo.promo_product pp
        JOIN price_promo.product_master pm USING (product_id)
        JOIN price_promo.promo_master prm USING (promo_id)
        JOIN price_promo.ps_rules pr USING (promo_id)
        WHERE pp.promo_id = ANY(%L);',
        _promo_details_tbl_name, _promo_ids);
    RAISE NOTICE 'Create promo details table query: %', _query;
    EXECUTE _query;
    RAISE NOTICE 'Time taken to create first temp table: %', clock_timestamp() - _step_start_time;

    -- Create an index on the first temporary table.
    _step_start_time := clock_timestamp();
    _query := format('CREATE INDEX %I ON %s USING BTREE (promo_id, product_id);', _promo_details_idx_name, _promo_details_tbl_name);
    RAISE NOTICE 'Create first index query: %', _query;
    EXECUTE _query;
    RAISE NOTICE 'Time taken to create first index: %', clock_timestamp() - _step_start_time;

    -- Create the second unlogged table with scenario data.
    _query := format('CREATE UNLOGGED TABLE %s AS
        WITH scenario_data_extracted AS materialized (
            SELECT 
                pprd.promo_id, 
                pp.product_id, 
                psd.scenario_data, 
                sm.scenario_order_id
            FROM price_promo.tb_promo_product_reco_details pprd
            JOIN price_promo.promo_product pp USING (promo_id)
            JOIN price_promo.promo_master prm ON prm.promo_id = pprd.promo_id
            JOIN price_promo.ps_scenario_discounts psd ON psd.promo_id = pprd.promo_id AND psd.product_level_id = pprd.product_level_id
            JOIN price_promo.scenario_master sm ON sm.promo_id = pprd.promo_id AND sm.scenario_id = prm.last_approved_scenario_id
            WHERE pprd.promo_id = ANY(%L)
            
            UNION ALL
            
            SELECT 
                pprd.promo_id, 
                dlp.product_id, 
                psd.scenario_data, 
                sm.scenario_order_id
            FROM price_promo.tb_promo_product_reco_details pprd
            JOIN price_promo.tb_discount_level_products dlp USING (product_level_id)
            JOIN price_promo.promo_master prm ON prm.promo_id = pprd.promo_id
            JOIN price_promo.ps_scenario_discounts psd ON psd.promo_id = pprd.promo_id AND psd.product_level_id = pprd.product_level_id
            JOIN price_promo.scenario_master sm ON sm.promo_id = pprd.promo_id AND sm.scenario_id = prm.last_approved_scenario_id
            WHERE pprd.promo_id = ANY(%L)
        )
        SELECT
            promo_id, product_id,
            jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''offer_type'') AS offer_type,
            jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''offer_x_type'') AS offer_x_type,
            jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''offer_y_type'') AS offer_y_type,
            jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''offer_x_value'')::numeric AS offer_x_value,
            jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''offer_y_value'')::numeric AS offer_y_value,
            jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''offer_z_value'')::numeric AS offer_z_value,
            CASE WHEN jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''offer_x_type'') = ''unit'' THEN jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''offer_x_value'')::numeric ELSE NULL END AS bogo_buy_qty,
            CASE WHEN jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''offer_y_type'') = ''unit'' THEN jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''offer_y_value'')::numeric ELSE NULL END AS bogo_get_qty,
            ROUND(jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''off_invoice_allowance_amount'')::numeric, 2) AS off_invoice,
            ROUND(jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''scan_back_allowance_amount'')::numeric, 2) AS scan_back,
            jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''loyality_points'') AS loyalty_points,
            jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''promotional_theme'') AS promotional_theme
        FROM scenario_data_extracted;',
        _scenario_data_tbl_name, _promo_ids_overall_level, _promo_ids_other_level);
    _step_start_time := clock_timestamp();
    RAISE NOTICE 'Create scenario data table query: %', _query;
    EXECUTE _query;
    RAISE NOTICE 'Time taken to create second temp table: %', clock_timestamp() - _step_start_time;

    -- Create an index on the second temporary table.
    _step_start_time := clock_timestamp();
    _query := format('CREATE INDEX %I ON %s USING BTREE (promo_id, product_id);', _scenario_data_idx_name, _scenario_data_tbl_name);
    RAISE NOTICE 'Create second index query: %', _query;
    EXECUTE _query;
    RAISE NOTICE 'Time taken to create second index: %', clock_timestamp() - _step_start_time;

    -- The main query now joins the temporary tables.
    _query := format('
    WITH promo_product_tables AS MATERIALIZED (
        SELECT 
            tpd.*,
            sm.offer_type, sm.offer_x_type, sm.offer_y_type, sm.offer_x_value, sm.offer_y_value, sm.offer_z_value,
            sm.bogo_buy_qty, sm.bogo_get_qty, sm.off_invoice, sm.scan_back, sm.loyalty_points, sm.promotional_theme,
            CASE 
                WHEN sm.offer_type = ''percent_off'' OR sm.offer_type = ''upto_x_percent_off'' THEN sm.offer_x_value
                WHEN sm.offer_type = ''extra_amount_off'' THEN COALESCE((sm.offer_x_value / NULLIF(tpd.promo_base_price,0)) * 100, 0)
                WHEN sm.offer_type = ''bxgy_percent_off'' THEN ((sm.offer_z_value * 0.01 * sm.offer_y_value) / NULLIF((sm.offer_y_value + sm.offer_x_value),0)) * 100
                WHEN sm.offer_type = ''bxgy'' THEN (sm.offer_y_value / NULLIF((sm.offer_y_value + sm.offer_x_value),0)) * 100
                WHEN sm.offer_type = ''bmsm'' AND sm.offer_x_type = ''dollar'' AND sm.offer_y_type = ''percent_off'' THEN sm.offer_y_value
                WHEN sm.offer_type = ''bmsm'' AND sm.offer_x_type = ''unit'' AND sm.offer_y_type = ''percent_off'' THEN sm.offer_y_value
                WHEN sm.offer_type = ''bmsm'' AND sm.offer_x_type = ''dollar'' AND sm.offer_y_type = ''dollar_off'' THEN (sm.offer_y_value / NULLIF(sm.offer_x_value,0)) * 100
                WHEN sm.offer_type = ''bmsm'' AND sm.offer_x_type = ''unit'' AND sm.offer_y_type = ''dollar_off'' THEN COALESCE((sm.offer_y_value / NULLIF((sm.offer_x_value * tpd.promo_base_price),0)) * 100,0)
                WHEN sm.offer_type = ''bmsm'' AND sm.offer_x_type = ''unit'' AND sm.offer_y_type = ''at_dollar'' THEN COALESCE(((tpd.promo_base_price - (sm.offer_y_value / NULLIF(sm.offer_x_value,0))) / NULLIF(tpd.promo_base_price,0)) * 100,0)
                WHEN sm.offer_type = ''fixed_price'' THEN COALESCE((((tpd.promo_base_price - sm.offer_x_value) / NULLIF(tpd.promo_base_price,0)) * 100), 0)
                ELSE 0
            END AS effective_discount
        FROM %s tpd
        LEFT JOIN %s sm ON tpd.promo_id = sm.promo_id AND tpd.product_id = sm.product_id
    )
    SELECT
--        ppt.merchandiser AS "Merchant",
        ppt.upc AS "UPC",
        ppt.product_id AS "Item ID",
        ppt.product_name AS "Item Name",
        ppt.prod_size AS "Size",
--        ppt.size_code AS "UOM",
        ppt.event_id AS "Event/Campaign ID",
        ppt.promo_id AS "Promo ID",
        ppt.start_date AS "Start Date",
        ppt.end_date AS "End Date",
        ppt.offer_type AS "Offer Type",
        ppt.bogo_buy_qty AS "Bogo Buy quantity",
        ppt.bogo_get_qty AS "Bogo Get quantity",
        ppt.offer_z_value AS "Bogo Discount (%% off)",
        ppt.scan_back AS "Scan Back",
        ppt.off_invoice AS "Off Invoice",
        ppt.cost::numeric AS "Cost",
        ppt.promo_base_price::numeric AS "Regular Retail",
        ROUND((((100 - ppt.effective_discount) / 100.0) * ppt.promo_base_price)::numeric, 2) AS "Sale Retail",
        ROUND(((ppt.effective_discount / 100.0) * ppt.promo_base_price)::numeric, 2) AS "Savings",
        ppt.effective_discount::numeric AS "%%Off",
        (ppt.user_metadata->>''theme'')::text AS "Theme",
        (ppt.user_metadata->>''in_store_only'')::text AS "In Store ONLY",
        (CASE WHEN ppt.cost <> 0 THEN ROUND((((ppt.promo_base_price - ppt.cost) / NULLIF(ppt.cost,0)) * 100)::numeric, 2) END)::numeric AS "Regular GP%%",
        (CASE WHEN ppt.cost <> 0 THEN ROUND(((((((100 - ppt.effective_discount) / 100.0) * ppt.promo_base_price) - ppt.cost) / NULLIF(ppt.cost,0)) * 100)::numeric, 2) END)::numeric AS "Sale GP%%",
--        ppt.map::numeric AS "MAP",
--        ppt.imap::numeric AS "IMAP",
--        ppt.wnw_store_count AS "Wag N Wash Store Count",
        (ppt.user_metadata->>''wnw_pictured_in_ad'')::text AS "WNW Pictured in Ad",
--        ppt.movement AS "Movement",
--        ppt.psp_store_count AS "Store Count",
        (ppt.user_metadata->>''display'')::text AS "DISPLAY",
        (ppt.user_metadata->>''wnw_display'')::text AS "WNW DISPLAY",
        (ppt.user_metadata->>''prebook'')::text AS "Prebook",
        (ppt.user_metadata->>''pictured_in_ad'')::text AS "Pictured in Ad",
        (ppt.user_metadata->>''page_number'')::text AS "Page #",
        (ppt.user_metadata->>''layout_block'')::text AS "Layout Block- MERCH SVC TO FILL OUT ONLY",
        (ppt.user_metadata->>''hot_deal'')::text AS "Hot Deal",
        CONCAT((ppt.user_metadata->>''s2_or_s5_size'')::text, '' - '', (ppt.user_metadata->>''signage_message'')::text) AS "S2 or S5 Size & Signage Message",
        ppt.loyalty_points AS "Loyalty Points",
--        ppt.manufacturer_id AS "Manufacturer Number",
--        ppt.manufacturer AS "Manufacturer Name",
        ppt.l0_name AS "Department",
        ppt.l1_name AS "Sub-Department",
        ppt.l2_name AS "Class",
        ppt.l3_name AS "Sub-Class",
--        ppt.brand AS "Brand",
        ppt.promo_name AS "Promo Offer Name",
        CASE WHEN ppt.status IN (4, 8) THEN ''Yes'' ELSE ''No'' END AS "Archived",
        ppt.promotional_theme AS "Promotional Theme (Vendor)"
    FROM promo_product_tables ppt;', _promo_details_tbl_name, _scenario_data_tbl_name);

    _step_start_time := clock_timestamp();
    RAISE NOTICE 'Final select query: %', _query;
    RETURN QUERY EXECUTE _query;

    -- Drop the temporary tables.
    _query := format('DROP TABLE %s; DROP TABLE %s;', _promo_details_tbl_name, _scenario_data_tbl_name);
    RAISE NOTICE 'Drop tables query: %', _query;
    EXECUTE _query;

    RAISE NOTICE 'Total time taken for fn_download_layout_file: %', clock_timestamp() - _start_time;
END;
$function$
;
