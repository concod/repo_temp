--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_download_layout_file runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes for fn_download_layout_file

DROP FUNCTION if exists price_promo_opt.fn_download_layout_file;

CREATE OR REPLACE FUNCTION price_promo_opt.fn_download_layout_file(_promo_ids integer[])
 RETURNS TABLE("Category" text, "Merchant" text, "UPC" text, "Item ID" text, "Item Name" text, "Size" integer, "UOM" text, "Scan Back" numeric, "Off Invoice" numeric, "Cost" numeric, "Regular Retail" numeric, "Sale Retail" numeric, "Savings" numeric, "%Off" numeric, "Theme" text, "Start Date" date, "End Date" date, "Sale GP%" numeric, "Regular GP%" numeric, "Movement" integer, "PSP Store Count" integer, "WNW Store Count" integer, "In-Store Only" text, "Hot Deal" text, "Proposed Pictured in Ad" text, "Final Pictured in Ad" text, "Page #" text, "Layout Block" text, "S2/S5 Message" text, "Loyalty" text, "MAP" numeric, "IMAP" numeric, "Department" text, "Sub-Department" text, "Class" text, "Sub-Class" text, "Manufacturer Number" text, "Manufacturer Name" text, "Brand" text, "NYLI Retail" numeric, "Regular Retail Update" numeric, "Prebook" text, "PSP Display Plan" text, "WNW Display Plan" text, "Pet Partner Submission Scan Back" numeric, "Pet Partner Submission Savings" numeric, "Pet Partner Submission Theme" text, "Pet Partner Submission Duration" integer, "Event/Campaign ID" integer, "Promo ID" integer, "Archived" text, "Promo Offer Name" text, "Offer Type" text, "Bogo Buy quantity" numeric, "Bogo Get quantity" numeric, "Bogo Discount (% off)" numeric)
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
            pm.manufacturer_id, pm.movement, pm.primaryupc AS upc, 
            pm.size AS prod_size, pm.original_uom AS size_code, pm.map, pm.imap, 
            pm.psp_store_count, pm.wnw_store_count, pm.promo_base_price, pm.cost,
            price_promo.impute_special_characters(pm.product_description) AS product_description, 
            price_promo.impute_special_characters(pm.l0_name) AS l0_name, 
            price_promo.impute_special_characters(pm.l1_name) AS l1_name, 
            price_promo.impute_special_characters(pm.l2_name) AS l2_name, 
            price_promo.impute_special_characters(pm.l3_name) AS l3_name, 
            price_promo.impute_special_characters(pm.manufacturer) AS manufacturer, 
            price_promo.impute_special_characters(pm.merchandiser) AS merchandiser, 
            price_promo.impute_special_characters(pm.brand) AS brand,
			pm.base_retail_li,
            pr.product_discount_level,
			(pp.user_metadata->''vendor_scenario_data''->''1''->>''offer_type'') AS vendor_offer_type,
            (pp.user_metadata->''vendor_scenario_data''->''1''->>''offer_x_type'') AS vendor_offer_x_type,
            (pp.user_metadata->''vendor_scenario_data''->''1''->>''offer_y_type'') AS vendor_offer_y_type,
            (pp.user_metadata->''vendor_scenario_data''->''1''->>''offer_x_value'')::numeric AS vendor_offer_x_value,
            (pp.user_metadata->''vendor_scenario_data''->''1''->>''offer_y_value'')::numeric AS vendor_offer_y_value,
            (pp.user_metadata->''vendor_scenario_data''->''1''->>''offer_z_value'')::numeric AS vendor_offer_z_value
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
                WHEN sm.offer_type = ''percent_off'' THEN sm.offer_x_value
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
            END AS effective_discount,
			CASE 
                WHEN tpd.vendor_offer_type = ''percent_off'' THEN tpd.vendor_offer_x_value
                WHEN tpd.vendor_offer_type = ''extra_amount_off'' THEN COALESCE((tpd.vendor_offer_x_value / NULLIF(tpd.promo_base_price,0)) * 100, 0)
                WHEN tpd.vendor_offer_type = ''bxgy_percent_off'' THEN ((tpd.vendor_offer_z_value * 0.01 * tpd.vendor_offer_y_value) / NULLIF((tpd.vendor_offer_y_value + tpd.vendor_offer_x_value),0)) * 100
                WHEN tpd.vendor_offer_type = ''bxgy'' THEN (tpd.vendor_offer_y_value / NULLIF((tpd.vendor_offer_y_value + tpd.vendor_offer_x_value),0)) * 100
                WHEN tpd.vendor_offer_type = ''bmsm'' AND tpd.vendor_offer_x_type = ''dollar'' AND tpd.vendor_offer_y_type = ''percent_off'' THEN tpd.vendor_offer_y_value
                WHEN tpd.vendor_offer_type = ''bmsm'' AND tpd.vendor_offer_x_type = ''unit'' AND tpd.vendor_offer_y_type = ''percent_off'' THEN tpd.vendor_offer_y_value
                WHEN tpd.vendor_offer_type = ''bmsm'' AND tpd.vendor_offer_x_type = ''dollar'' AND tpd.vendor_offer_y_type = ''dollar_off'' THEN (tpd.vendor_offer_y_value / NULLIF(tpd.vendor_offer_x_value,0)) * 100
                WHEN tpd.vendor_offer_type = ''bmsm'' AND tpd.vendor_offer_x_type = ''unit'' AND tpd.vendor_offer_y_type = ''dollar_off'' THEN COALESCE((tpd.vendor_offer_y_value / NULLIF((tpd.vendor_offer_x_value * tpd.promo_base_price),0)) * 100,0)
                WHEN tpd.vendor_offer_type = ''bmsm'' AND tpd.vendor_offer_x_type = ''unit'' AND tpd.vendor_offer_y_type = ''at_dollar'' THEN COALESCE(((tpd.promo_base_price - (tpd.vendor_offer_y_value / NULLIF(tpd.vendor_offer_x_value,0))) / NULLIF(tpd.promo_base_price,0)) * 100,0)
                WHEN tpd.vendor_offer_type = ''fixed_price'' THEN COALESCE((((tpd.promo_base_price - tpd.vendor_offer_x_value) / NULLIF(tpd.promo_base_price,0)) * 100), 0)
                ELSE 0
            END AS vendor_effective_discount
        FROM %s tpd
        LEFT JOIN %s sm ON tpd.promo_id = sm.promo_id AND tpd.product_id = sm.product_id
    )
    SELECT
		NULL AS "Category",
        ppt.merchandiser AS "Merchant",
        ppt.upc AS "UPC",
        ppt.product_id::text AS "Item ID",
        ppt.product_description AS "Item Name",
        ppt.prod_size AS "Size",
        ppt.size_code AS "UOM",
		ROUND(ppt.scan_back::numeric, 2)::numeric AS "Scan Back",
        ppt.off_invoice AS "Off Invoice",
        ROUND(ppt.cost::numeric, 2)::numeric AS "Cost",
        ppt.promo_base_price::numeric AS "Regular Retail",
		ROUND((((100 - ppt.effective_discount) / 100.0) * ppt.promo_base_price)::numeric, 2) AS "Sale Retail",
        ROUND(((ppt.effective_discount / 100.0) * ppt.promo_base_price)::numeric, 2) AS "Savings",
        ROUND((ppt.effective_discount::numeric / 100.0), 4)::numeric AS "%%Off",
        (ppt.user_metadata->>''theme'')::text AS "Theme",
		ppt.start_date AS "Start Date",
        ppt.end_date AS "End Date",
		(CASE WHEN ppt.cost <> 0 THEN ROUND((((((100 - ppt.effective_discount) / 100.0) * ppt.promo_base_price) - ppt.cost) / NULLIF(ppt.cost,0))::numeric, 4) END)::numeric AS "Sale GP%%",
		(CASE WHEN ppt.cost <> 0 THEN ROUND(((ppt.promo_base_price - ppt.cost) / NULLIF(ppt.cost,0))::numeric, 4) END)::numeric AS "Regular GP%%",
		ppt.movement AS "Movement",
		ppt.psp_store_count AS "PSP Store Count",
		ppt.wnw_store_count AS "WNW Store Count",
		(ppt.user_metadata->>''in_store_only'')::text AS "In-Store Only",
		(ppt.user_metadata->>''hot_deal'')::text AS "Hot Deal",
		(ppt.user_metadata->>''pictured_in_ad'')::text AS "Proposed Pictured in Ad",
		NULL AS "Final Pictured in Ad",
		(ppt.user_metadata->>''page_number'')::text AS "Page #",
		(ppt.user_metadata->>''layout_block'')::text AS "Layout Block",
		CONCAT((ppt.user_metadata->>''s2_or_s5_size'')::text, '' - '', (ppt.user_metadata->>''signage_message'')::text) AS "S2/S5 Message",
		ppt.loyalty_points AS "Loyalty",
		ppt.map::numeric AS "MAP",
        ppt.imap::numeric AS "IMAP",
		ppt.l0_name AS "Department",
        ppt.l1_name AS "Sub-Department",
        ppt.l2_name AS "Class",
        ppt.l3_name AS "Sub-Class",		
		ppt.manufacturer_id::text AS "Manufacturer Number",
        ppt.manufacturer AS "Manufacturer Name",
		ppt.brand AS "Brand",
		ppt.base_retail_li::numeric AS "NYLI Retail",
		(ppt.user_metadata->>''vendor_promo_base_price'')::numeric AS "Regular Retail Update",
		(ppt.user_metadata->>''prebook'')::text AS "Prebook",
		(ppt.user_metadata->>''display'')::text AS "PSP Display Plan",
        (ppt.user_metadata->>''wnw_display'')::text AS "WNW Display Plan",
		(ppt.user_metadata->''vendor_scenario_data''->''1''->>''scan_back_allowance_amount'')::numeric AS "Pet Partner Submission Scan Back",
		ROUND(((ppt.vendor_effective_discount / 100.0) * ppt.promo_base_price)::numeric, 2) AS "Pet Partner Submission Savings",
		ppt.promotional_theme AS "Pet Partner Submission Theme",
		ppt.end_date - ppt.start_date AS "Pet Partner Submission Duration",
		ppt.event_id AS "Event/Campaign ID",
        ppt.promo_id AS "Promo ID",
		CASE WHEN ppt.status IN (4, 8) THEN ''Yes'' ELSE ''No'' END AS "Archived",
		ppt.promo_name AS "Promo Offer Name",
		ppt.offer_type AS "Offer Type",
        ppt.bogo_buy_qty AS "Bogo Buy quantity",
        ppt.bogo_get_qty AS "Bogo Get quantity",
        ROUND((ppt.offer_z_value::numeric / 100.0), 2) AS "Bogo Discount (%% off)"
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
