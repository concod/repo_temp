--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_download_all_items runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changes for fn_download_all_items

DROP FUNCTION if exists price_promo_opt.fn_download_all_items;

CREATE OR REPLACE FUNCTION price_promo_opt.fn_download_all_items(_promo_ids integer[])
 RETURNS TABLE("Discount" text, "Manufacturer" integer, "Description" text, "Start Date" date, "End Date" date, "Price Group" text, "Price Group Collection" text, "Match All Price Groups" text, "Retail Discount Account Code" integer, "Retail Discount Concurrency Mode" text, "Primary UPC" text, "Unit" text, "Discount Amount" numeric, "Scan Back Amount" numeric, "AX ID" text, "UPC/PLU" text, "Description 1" text, "Size" numeric, "Size Code" text, "Start Date 1" date, "End Date 1" date, "Theme" text, "Supplemental" text, "Allowance (CS)" numeric, "Scan Back (EA)" numeric, "Unit Cost" numeric, "Unit SB Cost" numeric, "Retail" numeric, "Sale Retail" numeric, "Save" numeric, "Markdown%" numeric, "Sale GP%" numeric, "Regular GP%" numeric, "Price Group 1" text, "Note" text, "Addtl. Note" text, "Hot Deal" text, "In Store Only" text, "Final Pictured in Ad" text, "Prebooks" text, "PSP Display Plan" text, "WNW Display Plan" text, "Sort" text, "Merchandiser Name" text, "Base Retail Unit" numeric, "NYLI Retail Unit" numeric, "MAP" numeric, "IMAP" numeric, "InSet" text, "Department Name" text, "Sub Department Name" text, "Class Name" text, "Sub Class Name" text, "Billing MFG #" text, "Billing MFG Name" text, "Brand Name" text, "NoteDepartmentNameSubDepartmentNameSubClassNameBILLING MFG Name" text, "Base_RetailLB" numeric, "NYLI_RetailLB" numeric, "Avg Cost" numeric, "Update" text, "Retail >= IMAP" boolean, "Sale Retail >= IMAP" boolean, "On Hand" text, "Store Ct" integer, "Last Sold" date, "Offer Name" text, "Offer ID" integer)
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
    _promo_details_tbl_name := 'public.all_items_details_' || to_char(now(), 'YYYYMMDDHH24MISSMSUS');
    _promo_details_idx_name := 'idx_all_items_details_' || to_char(now(), 'YYYYMMDDHH24MISSMSUS');
    _scenario_data_tbl_name := 'public.all_items_scenario_data_' || to_char(now(), 'YYYYMMDDHH24MISSMSUS');
    _scenario_data_idx_name := 'idx_all_items_scenario_data_' || to_char(now(), 'YYYYMMDDHH24MISSMSUS');

    -- Filter promo IDs into two lists based on discount level.
    SELECT array_agg(promo_id) INTO _promo_ids_overall_level FROM price_promo.ps_rules WHERE promo_id = ANY(_promo_ids) AND product_discount_level = ARRAY[-200];
    SELECT array_agg(promo_id) INTO _promo_ids_other_level FROM price_promo.ps_rules WHERE promo_id = ANY(_promo_ids) AND product_discount_level <> ARRAY[-200];

    -- Create the first unlogged table with product details.
    _step_start_time := clock_timestamp();
    _query := format('CREATE UNLOGGED TABLE %s AS
        SELECT 
            pp.promo_id, pp.product_id, pp.user_metadata,
            prm.start_date, prm.end_date, prm.last_approved_scenario_id,
            price_promo.impute_special_characters(prm.name) AS promo_name,
            pm.manufacturer_id, pm.movement, pm.primaryupc AS upc, pm.last_sold AS prod_last_sold,
            pm.size AS prod_size, pm.original_uom AS size_code, pm.map, pm.imap, 
            pm.psp_store_count, pm.promo_base_price, pm.cost, pm.base_retail_li,
            price_promo.impute_special_characters(pm.product_description) AS product_description, 
            price_promo.impute_special_characters(pm.l0_name) AS department, 
            price_promo.impute_special_characters(pm.l1_name) AS sub_department,
            price_promo.impute_special_characters(pm.l2_name) AS class, 
            price_promo.impute_special_characters(pm.l3_name) AS sub_class,
            price_promo.impute_special_characters(pm.manufacturer) AS manufacturer, 
            price_promo.impute_special_characters(pm.merchandiser) AS merchandiser, 
            price_promo.impute_special_characters(pm.brand) AS brand,
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
    _step_start_time := clock_timestamp();
    _query := format('CREATE UNLOGGED TABLE %s AS
        WITH scenario_data_extracted AS materialized (
            SELECT 
                pprd.promo_id, pp.product_id, psd.scenario_data, sm.scenario_order_id
            FROM price_promo.tb_promo_product_reco_details pprd
            JOIN price_promo.promo_product pp USING (promo_id)
            JOIN price_promo.promo_master prm ON prm.promo_id = pprd.promo_id
            JOIN price_promo.ps_scenario_discounts psd ON psd.promo_id = pprd.promo_id AND psd.product_level_id = pprd.product_level_id
            JOIN price_promo.scenario_master sm ON sm.promo_id = pprd.promo_id AND sm.scenario_id = prm.last_approved_scenario_id
            WHERE pprd.promo_id = ANY(%L)

            UNION ALL

            SELECT 
                pprd.promo_id, dlp.product_id, psd.scenario_data, sm.scenario_order_id
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
			ROUND(jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''off_invoice_allowance_amount'')::numeric, 2) AS off_invoice,
            ROUND(jsonb_extract_path_text(scenario_data, scenario_order_id::text, ''scan_back_allowance_amount'')::numeric, 2) AS scan_back
        FROM scenario_data_extracted;',
        _scenario_data_tbl_name, _promo_ids_overall_level, _promo_ids_other_level);
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
            sd.offer_type, sd.offer_x_type, sd.offer_y_type, sd.offer_x_value, sd.offer_y_value, sd.offer_z_value, sd.off_invoice, sd.scan_back,
            CASE 
                WHEN offer_type = ''percent_off'' THEN offer_x_value
                WHEN offer_type = ''extra_amount_off'' THEN COALESCE((offer_x_value / NULLIF(promo_base_price,0)) * 100, 0)
                WHEN offer_type = ''bxgy_percent_off'' THEN ((offer_z_value * 0.01 * offer_y_value) / NULLIF((offer_y_value + offer_x_value),0)) * 100
                WHEN offer_type = ''bxgy'' THEN (offer_y_value / NULLIF((offer_y_value + offer_x_value),0)) * 100
                WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''percent_off'' THEN offer_y_value
                WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''percent_off'' THEN offer_y_value
                WHEN offer_type = ''bmsm'' AND offer_x_type = ''dollar'' AND offer_y_type = ''dollar_off'' THEN (offer_y_value / NULLIF(offer_x_value,0)) * 100
                WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''dollar_off'' THEN COALESCE((offer_y_value / NULLIF((offer_x_value * promo_base_price),0)) * 100,0)
                WHEN offer_type = ''bmsm'' AND offer_x_type = ''unit'' AND offer_y_type = ''at_dollar'' THEN COALESCE(((promo_base_price - (offer_y_value / NULLIF(offer_x_value,0))) / NULLIF(promo_base_price,0)) * 100,0)
                WHEN offer_type = ''fixed_price'' THEN COALESCE((((promo_base_price - offer_x_value) / NULLIF(promo_base_price,0)) * 100), 0)
                ELSE 0
            END AS effective_discount
        FROM %s tpd
        LEFT JOIN %s sd ON tpd.promo_id = sd.promo_id AND tpd.product_id = sd.product_id
    )
    SELECT
        NULL AS "Discount",
        ppt.manufacturer_id AS "Manufacturer",
        CONCAT(''MON '', to_char(ppt.end_date, ''MON YY ''), ppt.manufacturer, '' PPC'') AS "Description",
        ppt.start_date AS "Start Date", 
        ppt.end_date AS "End Date",
        ''PPC'' AS "Price Group",
        NULL AS "Price Group Collection",
        ''Yes'' AS "Match All Price Groups",
        450350 AS "Retail Discount Account Code",
        ''Compounded'' AS "Retail Discount Concurrency Mode",
        ppt.upc AS "Primary UPC",
        ''Unit'' AS "Unit",
        ROUND((ppt.effective_discount::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric AS "Discount Amount",
        ppt.scan_back::numeric AS "Scan Back Amount",
        ppt.product_id::text AS "AX ID",
        ppt.upc AS "UPC/PLU",
        ppt.product_description AS "Description 1",
        ppt.prod_size::numeric AS "Size",
        ppt.size_code AS "Size Code",
        ppt.start_date AS "Start Date 1",
        ppt.end_date AS "End Date 1",
        (ppt.user_metadata->>''theme'')::text AS "Theme",
		NULL AS "Supplemental",
		ppt.off_invoice AS "Allowance (CS)",
        ppt.scan_back::numeric AS "Scan Back (EA)",
        ROUND(ppt.cost::numeric, 2)::numeric AS "Unit Cost",
        ROUND((ppt.cost - COALESCE(ppt.scan_back, 0) - COALESCE(ppt.off_invoice, 0))::numeric, 2)::numeric AS "Unit SB Cost",
        ppt.promo_base_price::numeric AS "Retail",
        ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric AS "Sale Retail",
        ROUND((ppt.effective_discount::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric AS "Save",
		(CASE WHEN ppt.promo_base_price <> 0 THEN ROUND(1 - (ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric / NULLIF(ppt.promo_base_price::numeric,0)), 4) END)::numeric AS "Markdown%%",
        (CASE WHEN ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric <> 0 THEN ROUND(((ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric - (ppt.cost - COALESCE(ppt.scan_back, 0) - COALESCE(ppt.off_invoice, 0)))::numeric / NULLIF(ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric,0)), 4) END)::numeric AS "Sale GP%%",
		(CASE WHEN ppt.promo_base_price <> 0 THEN ROUND(ROUND((ppt.promo_base_price - ppt.cost)::numeric, 2) / NULLIF(ppt.promo_base_price::numeric,0), 4) END)::numeric AS "Regular GP%%",
        ''PPC'' AS "Price Group 1",
        NULL AS "Note",
        (ppt.user_metadata->>''page_number'')::text AS "Addtl. Note",
        (ppt.user_metadata->>''hot_deal'')::text AS "Hot Deal",
        (ppt.user_metadata->>''in_store_only'')::text AS "In Store Only",
		NULL AS "Final Pictured in Ad",
        (ppt.user_metadata->>''prebook'')::text AS "Prebooks",
        (ppt.user_metadata->>''display'')::text AS "PSP Display Plan",
        (ppt.user_metadata->>''wnw_display'')::text AS "WNW Display Plan",
		NULL AS "Sort",
        ppt.merchandiser AS "Merchandiser Name",
        ppt.promo_base_price::numeric AS "Base Retail Unit",
        ppt.base_retail_li::numeric AS "NYLI Retail Unit",
        ppt.map::numeric AS "MAP",
        ppt.imap::numeric AS "IMAP",
        ''InSet'' AS "InSet",
        ppt.department AS "Department Name",
        ppt.sub_department AS "Sub Department Name",
        ppt.class AS "Class Name",
        ppt.sub_class AS "Sub Class Name",
        ppt.manufacturer_id::text AS "Billing MFG #",
        ppt.manufacturer AS "Billing MFG Name",
        ppt.brand AS "Brand Name",
        CONCAT(ppt.department, ppt.class, ppt.sub_class, ppt.manufacturer, ppt.brand, ppt.size_code, ppt.prod_size, ppt.promo_base_price, ppt.product_id, ''PPC'') AS "NoteDepartmentNameSubDepartmentNameSubClassNameBILLING MFG Name",
        (CASE WHEN ppt.size_code = ''LB'' THEN ROUND((ppt.promo_base_price::numeric / NULLIF(ppt.prod_size,0))::numeric, 2) ELSE 0 END)::numeric AS "Base_RetailLB",
        (CASE WHEN ppt.size_code = ''LB'' THEN ROUND((ppt.promo_base_price::numeric / NULLIF(ppt.prod_size,0))::numeric, 2) ELSE 0 END)::numeric AS "NYLI_RetailLB",
        NULL::numeric AS "Avg Cost",
        NULL AS "Update",
        CASE WHEN ppt.promo_base_price >= ppt.imap THEN TRUE ELSE FALSE END AS "Retail >= IMAP",
        CASE WHEN ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric >= ppt.imap THEN TRUE ELSE FALSE END AS "Sale Retail >= IMAP",
		NULL AS "On Hand",
        ppt.psp_store_count AS "Store Ct",
        ppt.prod_last_sold AS "Last Sold",
        ppt.promo_name AS "Offer Name",
        ppt.promo_id AS "Offer ID"
    FROM promo_product_tables ppt
    WHERE ppt.offer_type IN (''percent_off'',''reg_price'',''fixed_price'',''extra_amount_off'')

    UNION ALL

    SELECT
        NULL AS "Discount",
        ppt.manufacturer_id AS "Manufacturer",
        CONCAT(''MON '', to_char(ppt.end_date, ''MON YY ''), ppt.manufacturer, '' PPCLI'') AS "Description",
        ppt.start_date AS "Start Date", 
        ppt.end_date AS "End Date",
        ''PPCLI'' AS "Price Group",
        NULL AS "Price Group Collection",
        ''Yes'' AS "Match All Price Groups",
        450350 AS "Retail Discount Account Code",
        ''Compounded'' AS "Retail Discount Concurrency Mode",
        ppt.upc AS "Primary UPC",
        ''Unit'' AS "Unit",
        ROUND((ppt.effective_discount::numeric / 100.0::numeric) * ppt.base_retail_li::numeric, 2)::numeric AS "Discount Amount",
        ppt.scan_back::numeric AS "Scan Back Amount",
        ppt.product_id::text AS "AX ID",
        ppt.upc AS "UPC/PLU",
        ppt.product_description AS "Description 1",
        ppt.prod_size::numeric AS "Size",
        ppt.size_code AS "Size Code",
        ppt.start_date AS "Start Date 1", 
        ppt.end_date AS "End Date 1",
        (ppt.user_metadata->>''theme'')::text AS "Theme",
		NULL AS "Supplemental",
		ppt.off_invoice AS "Allowance (CS)",
        ppt.scan_back::numeric AS "Scan Back (EA)",
        ROUND(ppt.cost::numeric, 2)::numeric AS "Unit Cost",
        ROUND((ppt.cost - COALESCE(ppt.scan_back, 0) - COALESCE(ppt.off_invoice, 0))::numeric, 2)::numeric AS "Unit SB Cost",
        ppt.base_retail_li::numeric AS "Retail",
        ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.base_retail_li::numeric, 2)::numeric AS "Sale Retail",
        ROUND((ppt.effective_discount::numeric / 100.0::numeric) * ppt.base_retail_li::numeric, 2)::numeric AS "Save",
		(CASE WHEN ppt.base_retail_li <> 0 THEN ROUND(1 - (ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.base_retail_li::numeric, 2)::numeric / NULLIF(ppt.base_retail_li::numeric,0)), 4) END)::numeric AS "Markdown%%",
        (CASE WHEN ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.base_retail_li::numeric, 2)::numeric <> 0 THEN ROUND(((ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.base_retail_li::numeric, 2)::numeric - (ppt.cost - COALESCE(ppt.scan_back, 0) - COALESCE(ppt.off_invoice, 0)))::numeric / NULLIF(ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.base_retail_li::numeric, 2)::numeric,0)), 4) END)::numeric AS "Sale GP%%",
		(CASE WHEN ppt.base_retail_li <> 0 THEN ROUND(ROUND((ppt.base_retail_li - ppt.cost)::numeric, 2) / NULLIF(ppt.base_retail_li::numeric,0), 4) END)::numeric AS "Regular GP%%",        
        ''PPCLI'' AS "Price Group 1",
        NULL AS "Note",
        (ppt.user_metadata->>''page_number'')::text AS "Addtl. Note",
        (ppt.user_metadata->>''hot_deal'')::text AS "Hot Deal",
        (ppt.user_metadata->>''in_store_only'')::text AS "In Store Only",
		NULL AS "Final Pictured in Ad",
        (ppt.user_metadata->>''prebook'')::text AS "Prebooks",
        (ppt.user_metadata->>''display'')::text AS "PSP Display Plan",
        (ppt.user_metadata->>''wnw_display'')::text AS "WNW Display Plan",
		NULL AS "Sort",
        ppt.merchandiser AS "Merchandiser Name",
        ppt.promo_base_price::numeric AS "Base Retail Unit",
        ppt.base_retail_li::numeric AS "NYLI Retail Unit",
        ppt.map::numeric AS "MAP",
        ppt.imap::numeric AS "IMAP",
        ''InSet'' AS "InSet",
        ppt.department AS "Department Name",
        ppt.sub_department AS "Sub Department Name",
        ppt.class AS "Class Name",
        ppt.sub_class AS "Sub Class Name",
        ppt.manufacturer_id::text AS "Billing MFG #",
        ppt.manufacturer AS "Billing MFG Name",
        ppt.brand AS "Brand Name",
        CONCAT(ppt.department, ppt.class, ppt.sub_class, ppt.manufacturer, ppt.brand, ppt.size_code, ppt.prod_size, ppt.base_retail_li, ppt.product_id, ''PPCLI'') AS "NoteDepartmentNameSubDepartmentNameSubClassNameBILLING MFG Name",
        (CASE WHEN ppt.size_code = ''LB'' THEN ROUND((ppt.promo_base_price::numeric / NULLIF(ppt.prod_size,0))::numeric, 2) ELSE 0 END)::numeric AS "Base_RetailLB",
        (CASE WHEN ppt.size_code = ''LB'' THEN ROUND((ppt.promo_base_price::numeric / NULLIF(ppt.prod_size,0))::numeric, 2) ELSE 0 END)::numeric AS "NYLI_RetailLB",
        NULL::numeric AS "Avg Cost",
        NULL AS "Update",
        CASE WHEN ppt.promo_base_price >= ppt.imap THEN TRUE ELSE FALSE END AS "Retail >= IMAP",
        CASE WHEN ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.base_retail_li::numeric, 2)::numeric >= ppt.imap THEN TRUE ELSE FALSE END AS "Sale Retail >= IMAP",
        NULL AS "On Hand",
		ppt.psp_store_count AS "Store Ct",
        ppt.prod_last_sold AS "Last Sold",
        ppt.promo_name AS "Offer Name",
        ppt.promo_id AS "Offer ID"
    FROM promo_product_tables ppt
    WHERE ppt.offer_type IN (''percent_off'',''reg_price'',''fixed_price'',''extra_amount_off'')

    UNION ALL

    SELECT
        NULL AS "Discount",
        ppt.manufacturer_id AS "Manufacturer",
        CONCAT(''MON '', to_char(ppt.end_date, ''MON YY ''), ppt.manufacturer, '' PPCALL'') AS "Description",
        ppt.start_date AS "Start Date", 
        ppt.end_date AS "End Date",
        ''PPCALL'' AS "Price Group",
        NULL AS "Price Group Collection",
        ''Yes'' AS "Match All Price Groups",
        450350 AS "Retail Discount Account Code",
        ''Compounded'' AS "Retail Discount Concurrency Mode",
        ppt.upc AS "Primary UPC",
        ''Unit'' AS "Unit",
        ROUND((ppt.effective_discount::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric AS "Discount Amount",
        ppt.scan_back::numeric AS "Scan Back Amount",
        ppt.product_id::text AS "AX ID",
        ppt.upc AS "UPC/PLU",
        ppt.product_description AS "Description 1",
        ppt.prod_size::numeric AS "Size",
        ppt.size_code AS "Size Code",
        ppt.start_date AS "Start Date 1", 
        ppt.end_date AS "End Date 1",
        (ppt.user_metadata->>''theme'')::text AS "Theme",
		NULL AS "Supplemental",
		ppt.off_invoice AS "Allowance (CS)",
        ppt.scan_back::numeric AS "Scan Back (EA)",
        ROUND(ppt.cost::numeric, 2)::numeric AS "Unit Cost",
        ROUND((ppt.cost - COALESCE(ppt.scan_back, 0) - COALESCE(ppt.off_invoice, 0))::numeric, 2)::numeric AS "Unit SB Cost",
        ppt.promo_base_price::numeric AS "Retail",
        ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric AS "Sale Retail",
        ROUND((ppt.effective_discount::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric AS "Save",
		(CASE WHEN ppt.promo_base_price <> 0 THEN ROUND(1 - (ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric / NULLIF(ppt.promo_base_price::numeric,0)), 4) END)::numeric AS "Markdown%%",
        (CASE WHEN ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric <> 0 THEN ROUND(((ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric - (ppt.cost - COALESCE(ppt.scan_back, 0) - COALESCE(ppt.off_invoice, 0)))::numeric / NULLIF(ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric,0)), 4) END)::numeric AS "Sale GP%%",
        (CASE WHEN ppt.promo_base_price <> 0 THEN ROUND(ROUND((ppt.promo_base_price - ppt.cost)::numeric, 2) / NULLIF(ppt.promo_base_price::numeric,0), 4) END)::numeric AS "Regular GP%%",
        ''PPCALL'' AS "Price Group 1",
        NULL AS "Note",
        (ppt.user_metadata->>''page_number'')::text AS "Addtl. Note",
        (ppt.user_metadata->>''hot_deal'')::text AS "Hot Deal",
        (ppt.user_metadata->>''in_store_only'')::text AS "In Store Only",
		NULL AS "Final Pictured in Ad",
        (ppt.user_metadata->>''prebook'')::text AS "Prebooks",
        (ppt.user_metadata->>''display'')::text AS "PSP Display Plan",
        (ppt.user_metadata->>''wnw_display'')::text AS "WNW Display Plan",
		NULL AS "Sort",
        ppt.merchandiser AS "Merchandiser Name",
        ppt.promo_base_price::numeric AS "Base Retail Unit",
        ppt.base_retail_li::numeric AS "NYLI Retail Unit",
        ppt.map::numeric AS "MAP",
        ppt.imap::numeric AS "IMAP",
        ''InSet'' AS "InSet",
        ppt.department AS "Department Name",
        ppt.sub_department AS "Sub Department Name",
        ppt.class AS "Class Name",
        ppt.sub_class AS "Sub Class Name",
        ppt.manufacturer_id::text AS "Billing MFG #",
        ppt.manufacturer AS "Billing MFG Name",
        ppt.brand AS "Brand Name",
        CONCAT(ppt.department, ppt.class, ppt.sub_class, ppt.manufacturer, ppt.brand, ppt.size_code, ppt.prod_size, ppt.promo_base_price, ppt.product_id, ''PPCALL'') AS "NoteDepartmentNameSubDepartmentNameSubClassNameBILLING MFG Name",
        (CASE WHEN ppt.size_code = ''LB'' THEN ROUND((ppt.promo_base_price::numeric / NULLIF(ppt.prod_size,0))::numeric, 2) ELSE 0 END)::numeric AS "Base_RetailLB",
        (CASE WHEN ppt.size_code = ''LB'' THEN ROUND((ppt.promo_base_price::numeric / NULLIF(ppt.prod_size,0))::numeric, 2) ELSE 0 END)::numeric AS "NYLI_RetailLB",
        NULL::numeric AS "Avg Cost",
        NULL AS "Update",
        CASE WHEN ppt.promo_base_price >= ppt.imap THEN TRUE ELSE FALSE END AS "Retail >= IMAP",
        CASE WHEN ROUND(((100 - ppt.effective_discount)::numeric / 100.0::numeric) * ppt.promo_base_price::numeric, 2)::numeric >= ppt.imap THEN TRUE ELSE FALSE END AS "Sale Retail >= IMAP",
        NULL AS "On Hand",
		ppt.psp_store_count AS "Store Ct",
        ppt.prod_last_sold AS "Last Sold",
        ppt.promo_name AS "Offer Name",
        ppt.promo_id AS "Offer ID"
    FROM promo_product_tables ppt
    WHERE ppt.offer_type NOT IN (''percent_off'',''reg_price'',''fixed_price'',''extra_amount_off'');', 
    _promo_details_tbl_name, _scenario_data_tbl_name);

    _step_start_time := clock_timestamp();
    RAISE NOTICE 'Final select query: %', _query;
    RETURN QUERY EXECUTE _query;

    -- Drop the temporary tables.
    _query := format('DROP TABLE %s; DROP TABLE %s;', _promo_details_tbl_name, _scenario_data_tbl_name);
    RAISE NOTICE 'Drop tables query: %', _query;
    EXECUTE _query;

    RAISE NOTICE 'Total time taken for fn_download_all_items_optimized: %', clock_timestamp() - _start_time;
END;
$function$
;
