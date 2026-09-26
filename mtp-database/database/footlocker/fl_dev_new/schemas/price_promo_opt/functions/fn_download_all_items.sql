--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_download_all_items runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_download_all_items

DROP FUNCTION if exists price_promo_opt.fn_download_all_items;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_download_all_items(_promo_ids integer[])
 RETURNS TABLE("Discount" text, "Description" text, "Start Date" date, "End Date" date, "Price Group" text, "Price Group Collection" text, "Match All Price Groups" text, "Retail Discount Account Code" integer, "Retail Discount Concurrency Mode" text, "Primary UPC" integer, "Unit" text, "Scan Back Amount" numeric, "AX ID" bigint, "UPC/PLU" integer, "Description 1" text, "Size" text, "Start Date 1" date, "End Date 1" date, "Theme" text, "Scan Back (EA)" numeric, "Unit Cost" numeric, "Unit SB Cost" numeric, "Price Group 1" text, "Note" text, "Addtl. Note" text, "Hot Deal" text, "In Store Only" text, "Prebooks" text, "Display Plan" text, "WNW Display Plan" text, "Department Name" text, "Sub Department Name" text, "Class Name" text, "Sub Class Name" text, "Avg Cost" numeric, "Update" text, "Last Sold" date, "Offer Name" text, "Offer ID" integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
	arr_promo_id integer;
	prod_discount_level integer[];
    query varchar;
BEGIN
	
	FOREACH arr_promo_id IN ARRAY _promo_ids
	LOOP
		SELECT product_discount_level
        INTO prod_discount_level
        FROM price_promo.ps_rules
        WHERE promo_id = arr_promo_id;

	    query := format('
		    WITH promo_product_tables AS MATERIALIZED (
		        SELECT 
					pp.promo_id,
		            pm.product_id,
		            price_promo.impute_special_characters(pm.product_description) AS product_description,
--		            pm.manufacturer_id,
		            prm.start_date,
		            prm.end_date,
					price_promo.impute_special_characters(prm.name) AS promo_name,
		            pm.primary_upc AS upc,
		            price_promo.impute_special_characters(pm.product_name) AS product_name,
		            price_promo.impute_special_characters(pm.l0_name) AS department, 
		            price_promo.impute_special_characters(pm.l1_name) AS sub_department,
		            price_promo.impute_special_characters(pm.l2_name) AS class, 
		            price_promo.impute_special_characters(pm.l3_name) AS sub_class,
--		            price_promo.impute_special_characters(pm.manufacturer) AS manufacturer, 
--		            price_promo.impute_special_characters(pm.merchandiser) AS merchandiser,
--		            price_promo.impute_special_characters(pm.brand) AS brand,
		            pm.price_bucket,
--		            ROUND(pm.size::numeric, 2) AS prod_size,
					size AS prod_size,
		            pm.size_bucket,
--		            pm.original_uom::text AS size_code,
--		            pm.uom,
--		            ROUND(pm.base_retail::numeric, 2) AS base_retail,
--		            ROUND(pm.base_retail_li::numeric, 2) AS base_retail_li,
--		            ROUND(pm.map::numeric, 2) AS map, 
--		            ROUND(pm.imap::numeric , 2) AS imap,
--		            pm.psp_store_count,
--					pm.wnw_store_count,
		          	CASE WHEN last_sold ~ ''^\d{4}-\d{2}-\d{2}$'' THEN last_sold::date
					ELSE NULL END
					::date AS prod_last_sold,
		            ROUND(pm.promo_base_price::numeric, 2) AS promo_base_price,
		            ROUND(pm.cost::numeric, 2) AS cost,
					(pp.user_metadata->>''prebook'')::text AS prebook,
					(pp.user_metadata->>''in_store_only'')::text AS in_store_only,
					(pp.user_metadata->>''hot_deal'')::text AS hot_deal,
					(pp.user_metadata->>''theme'')::text AS theme,
					(pp.user_metadata->>''page_number'')::text AS page,
					(pp.user_metadata->>''wnw_display'')::text AS wnw_display,
					(pp.user_metadata->>''display'')::text AS display,
					ROUND(jsonb_extract_path_text(pps.scenario_data, sm.scenario_order_id::text, ''scan_back_allowance_amount'')::numeric, 2) AS scan_back,
					jsonb_extract_path_text(pps.scenario_data, sm.scenario_order_id::text, ''offer_type'') AS offer_type,
					jsonb_extract_path_text(pps.scenario_data, sm.scenario_order_id::text, ''offer_x_type'') AS offer_x_type,
		        	jsonb_extract_path_text(pps.scenario_data, sm.scenario_order_id::text, ''offer_x_value'')::numeric AS offer_x_value,
		        	jsonb_extract_path_text(pps.scenario_data, sm.scenario_order_id::text, ''offer_y_type'') AS offer_y_type,
		        	jsonb_extract_path_text(pps.scenario_data, sm.scenario_order_id::text, ''offer_y_value'')::numeric AS offer_y_value,
		        	jsonb_extract_path_text(pps.scenario_data, sm.scenario_order_id::text, ''offer_z_value'')::numeric AS offer_z_value
		        FROM (SELECT * FROM price_promo.promo_product
		              WHERE promo_id = %s) pp
		        JOIN price_promo.product_master pm USING (product_id)
		        JOIN price_promo.promo_master prm USING (promo_id)
		        JOIN price_promo.ps_rules pr USING (promo_id)
		        JOIN price_promo.scenario_master sm
		            ON sm.promo_id = prm.promo_id
		            AND sm.scenario_id = prm.last_approved_scenario_id
		        LEFT JOIN (%s) pps
		            ON pp.promo_id = pps.promo_id
		            AND pp.product_id = pps.product_id
		    ),
		    discount_calc AS MATERIALIZED (
			    SELECT 
			        *,
			        CASE 
			            WHEN offer_type = ''percent_off'' OR offer_type = ''upto_x_percent_off'' THEN offer_x_value
			            WHEN offer_type = ''extra_amount_off'' THEN COALESCE(((offer_x_value / NULLIF(promo_base_price,0)) * 100), 0)
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
			    FROM promo_product_tables
			)
		    SELECT
		        NULL AS "Discount",
--		        manufacturer_id AS "Manufacturer",
				CONCAT(to_char(end_date, ''MON YY ''), theme, '' PPC'') AS "Description",
		        start_date::date AS "Start Date", 
		        end_date::date AS "End Date",
				''PPC'' AS "Price Group",
				NULL AS "Price Group Collection",
		        ''Yes'' AS "Match All Price Groups",
		        450350 AS "Retail Discount Account Code",
		        ''Compounded'' AS "Retail Discount Concurrency Mode",
		        upc AS "Primary UPC",
		        ''Unit'' AS "Unit",
--				ROUND((effective_discount / 100.0) * base_retail::numeric, 2) AS "Discount Amount",
				scan_back AS "Scan Back Amount",
		        product_id AS "AX ID",
		        upc AS "UPC/PLU",
		        product_description AS "Description 1",
		        prod_size AS "Size",
--		        size_code AS "Size Code",
		        start_date::date AS "Start Date 1", 
		        end_date::date AS "End Date 1",
				theme AS "theme",
				scan_back AS "Scan Back (EA)",
		        cost AS "Unit Cost",
				cost - scan_back AS "Unit SB Cost",
--				base_retail AS "Retail",
--		        ROUND(((100 - effective_discount) / 100.0) * base_retail::numeric, 2) AS "Sale Retail",
--		        ROUND((effective_discount / 100.0) * base_retail::numeric, 2) AS "Save",
--		        CASE 
--				WHEN cost <> 0 THEN ROUND(((ROUND(((100 - effective_discount) / 100.0) * base_retail::numeric, 2) - cost) / NULLIF(cost,0)) * 100, 2) 
--				END AS "Sale GP%%%%",
--		        CASE 
--				WHEN base_retail <> 0 THEN ROUND((ROUND((effective_discount / 100.0) * base_retail::numeric, 2) / NULLIF(base_retail,0)) * 100, 2) 
--				END AS "Markdown%%%%",
				''PPC'' AS "Price Group 1",
				NULL AS "Note",
				page AS "Addtl. Note",
				hot_deal AS "Hot Deal",
				in_store_only AS "In Store Only",
				prebook AS "Prebooks",
				display AS "Display Plan",
				wnw_display AS "WNW Display Plan",
--		        merchandiser AS "Merchandiser Name",
--		        base_retail AS "Base Retail Unit",
--		        base_retail_li AS "NYLI Retail Unit",
--		        map AS "MAP",
--		        imap AS "IMAP",   
--				CASE
--		    	WHEN psp_store_count IS NOT NULL AND wnw_store_count IS NOT NULL THEN ''PSP/WNW''
--		    	WHEN psp_store_count IS NOT NULL AND wnw_store_count IS NULL THEN ''PSP''
--		    	WHEN psp_store_count IS NULL AND wnw_store_count IS NOT NULL THEN ''WNW''
--		    	ELSE NULL END AS "InSet",
		        department AS "Department Name",
		        sub_department AS "Sub Department Name",
		        class AS "Class Name",
		        sub_class AS "Sub Class Name",
--		        manufacturer_id AS "Billing MFG #",
--		        manufacturer AS "Billing MFG Name",        
--		        brand AS "Brand Name",
--				CONCAT(department, class, sub_class, manufacturer, brand, size_code, prod_size, base_retail, product_id, ''PPC'') AS "NoteDepartmentNameSubDepartmentNameSubClassNameBILLING MFG NameBrandNameSize CodeSizeRetailAX IDPrice Group",
--				CASE
--				WHEN size_code = ''LB'' THEN ROUND((base_retail / NULLIF(prod_size,0))::numeric, 2)
--		        ELSE 0 END AS "Base_RetailLB",
--				CASE
--				WHEN size_code = ''LB'' THEN ROUND((base_retail / NULLIF(prod_size,0))::numeric, 2)
--		        ELSE 0 END AS "NYLI_RetailLB",
				NULL::numeric AS "Avg Cost",
				NULL AS "Update",
--		        CASE 
--				WHEN promo_base_price >= imap THEN TRUE 
--				ELSE FALSE END AS "Retail >= IMAP",
--		        CASE 
--				WHEN ROUND(((100 - effective_discount) / 100.0) * base_retail::numeric, 2) >= imap THEN TRUE 
--				ELSE FALSE END AS "Sale Retail >= IMAP",
--		        psp_store_count AS "Store Count",
		        prod_last_sold AS "Last Sold",
				promo_name AS "Offer Name",
				promo_id AS "Offer ID"
		    FROM discount_calc dc
			WHERE offer_type IN (''percent_off'',''reg_price'',''fixed_price'',''extra_amount_off'')
			
			UNION ALL
		
			SELECT
				NULL AS "Discount",
--		        manufacturer_id AS "Manufacturer",
				CONCAT(to_char(end_date, ''MON YY ''), theme, '' PPCLI'') AS "Description",
		        start_date AS "Start Date", 
		        end_date AS "End Date",
				''PPCLI'' AS "Price Group",
				NULL AS "Price Group Collection",
		        ''Yes'' AS "Match All Price Groups",
		        450350 AS "Retail Discount Account Code",
		        ''Compounded'' AS "Retail Discount Concurrency Mode",
		        upc AS "Primary UPC",
		        ''Unit'' AS "Unit",
--				ROUND((effective_discount / 100.0) * base_retail_li::numeric, 2) AS "Discount Amount",
				scan_back AS "Scan Back Amount",
		        product_id AS "AX ID",
		        upc AS "UPC/PLU",
		        product_description AS "Description",
		        prod_size AS "Size",
--		        size_code AS "Size Code",
		        start_date AS "Start Date 1", 
		        end_date AS "End Date 1",
				theme AS "theme",
				scan_back AS "Scan Back (EA)",
		        cost AS "Unit Cost",
				cost - scan_back AS "Unit SB Cost",
--				base_retail_li AS "Retail",
--		        ROUND(((100 - effective_discount) / 100.0) * base_retail_li::numeric, 2) AS "Sale Retail",
--		        ROUND((effective_discount / 100.0) * base_retail_li::numeric, 2) AS "Save",
--		        CASE 
--				WHEN cost <> 0 THEN ROUND(((ROUND(((100 - effective_discount) / 100.0) * base_retail_li::numeric, 2) - cost) / NULLIF(cost,0)) * 100, 2) 
--				END AS "Sale GP%%%%",
--		        CASE 
--				WHEN base_retail_li <> 0 THEN ROUND((ROUND((effective_discount / 100.0) * base_retail_li::numeric, 2) / NULLIF(base_retail_li,0)) * 100, 2) 
--				END AS "Markdown%%%%",
				''PPCLI'' AS "Price Group 1",
				NULL AS "Note",
				page AS "Addtl. Note",
				hot_deal AS "Hot Deal",
				in_store_only AS "In Store Only",
				prebook AS "Prebooks",
				display AS "Display Plan",
				wnw_display AS "WNW Display Plan",
--		        merchandiser AS "Merchandiser Name",
--		        base_retail AS "Base Retail Unit",
--		        base_retail_li AS "NYLI Retail Unit",
--		        map AS "MAP",
--		        imap AS "IMAP",
--				CASE
--		    	WHEN psp_store_count IS NOT NULL AND wnw_store_count IS NOT NULL THEN ''PSP/WNW''
--		    	WHEN psp_store_count IS NOT NULL AND wnw_store_count IS NULL THEN ''PSP''
--		    	WHEN psp_store_count IS NULL AND wnw_store_count IS NOT NULL THEN ''WNW''
--		    	ELSE NULL END AS "InSet",    
		        department AS "Department Name",
		        sub_department AS "Sub Department Name",
		        class AS "Class Name",
		        sub_class AS "Sub Class Name",
--		        manufacturer_id AS "Billing MFG",
--		        manufacturer AS "Billing MFG Name",        
--		        brand AS "Brand Name",
--				CONCAT(department, class, sub_class, manufacturer, brand, size_code, prod_size, base_retail_li, product_id, ''PPCLI'') AS "NoteDepartmentNameSubDepartmentNameSubClassNameBILLING MFG NameBrandNameSize CodeSizeRetailAX IDPrice Group",
--				CASE
--				WHEN size_code = ''LB'' THEN ROUND((base_retail / NULLIF(prod_size,0))::numeric, 2)
--		        ELSE 0 END AS "Base_RetailLB",
--				CASE
--				WHEN size_code = ''LB'' THEN ROUND((base_retail / NULLIF(prod_size,0))::numeric, 2)
--		        ELSE 0 END AS "NYLI_RetailLB",
				NULL::numeric AS "Avg Cost",
				NULL AS "Update",
--		        CASE 
--				WHEN promo_base_price >= imap THEN TRUE 
--				ELSE FALSE END AS "Retail >= IMAP",
--		        CASE 
--				WHEN ROUND(((100 - effective_discount) / 100.0) * base_retail_li::numeric, 2) >= imap THEN TRUE 
--				ELSE FALSE END AS "Sale Retail >= IMAP",
--		        psp_store_count AS "Store Count",
		        prod_last_sold AS "Last Sold",
				promo_name AS "Offer Name",
				promo_id AS "Offer ID"
		    FROM discount_calc dc
			WHERE offer_type IN (''percent_off'',''reg_price'',''fixed_price'',''extra_amount_off'')
		
			UNION ALL
		
			SELECT
		        NULL AS "Discount",
--		        manufacturer_id AS "Manufacturer",
				CONCAT(to_char(end_date, ''MON YY ''), theme, '' PPCALL'') AS "Description",
		        start_date AS "Start Date", 
		        end_date AS "End Date",
				''PPCALL'' AS "Price Group",
				NULL AS "Price Group Collection",
		        ''Yes'' AS "Match All Price Groups",
		        450350 AS "Retail Discount Account Code",
		        ''Compounded'' AS "Retail Discount Concurrency Mode",
		        upc AS "Primary UPC",
		        ''Unit'' AS "Unit",
--				ROUND((effective_discount / 100.0) * base_retail::numeric, 2) AS "Discount Amount",
				scan_back AS "Scan Back Amount",
		        product_id AS "AX ID",
		        upc AS "UPC/PLU",
		        product_description AS "Description",
		        prod_size AS "Size",
--		        size_code AS "Size Code",
		        start_date::date AS "Start Date 1", 
		        end_date::date AS "End Date 1",
				theme AS "theme",
				scan_back AS "Scan Back (EA)",
		        cost AS "Unit Cost",
				cost - scan_back AS "Unit SB Cost",
--				base_retail AS "Retail",
--		        ROUND(((100 - effective_discount) / 100.0) * base_retail::numeric, 2) AS "Sale Retail",
--		        ROUND((effective_discount / 100.0) * base_retail::numeric, 2) AS "Save",
--		        CASE 
--				WHEN cost <> 0 THEN ROUND(((ROUND(((100 - effective_discount) / 100.0) * base_retail::numeric, 2) - cost) / NULLIF(cost,0)) * 100, 2) 
--				END AS "Sale GP%%%%",
--		        CASE 
--				WHEN base_retail <> 0 THEN ROUND((ROUND((effective_discount / 100.0) * base_retail::numeric, 2) / NULLIF(base_retail,0)) * 100, 2) 
--				END AS "Markdown%%%%",
				''PPCALL'' AS "Price Group 1",
				NULL AS "Note",
				page AS "Addtl. Note",
				hot_deal AS "Hot Deal",
				in_store_only AS "In Store Only",
				prebook AS "Prebooks",
				display AS "Display Plan",
				wnw_display AS "WNW Display Plan",
--		        merchandiser AS "Merchandiser Name",
--		        base_retail AS "Base Retail Unit",
--		        base_retail_li AS "NYLI Retail Unit",
--		        map AS "MAP",
--		        imap AS "IMAP",
--				CASE
--		    	WHEN psp_store_count IS NOT NULL AND wnw_store_count IS NOT NULL THEN ''PSP/WNW''
--		    	WHEN psp_store_count IS NOT NULL AND wnw_store_count IS NULL THEN ''PSP''
--		    	WHEN psp_store_count IS NULL AND wnw_store_count IS NOT NULL THEN ''WNW''
--		    	ELSE NULL END AS "InSet",  
		        department AS "Department Name",
		        sub_department AS "Sub Department Name",
		        class AS "Class Name",
		        sub_class AS "Sub Class Name",
--		        manufacturer_id AS "Billing MFG",
--		        manufacturer AS "Billing MFG Name",        
--		        brand AS "Brand Name",
--				CONCAT(department, class, sub_class, manufacturer, brand, size_code, prod_size, base_retail, product_id, ''PPCALL'') AS "NoteDepartmentNameSubDepartmentNameSubClassNameBILLING MFG NameBrandNameSize CodeSizeRetailAX IDPrice Group",
--				CASE
--				WHEN size_code = ''LB'' THEN ROUND((base_retail / NULLIF(prod_size,0))::numeric, 2)
--		        ELSE 0 END AS "Base_RetailLB",
--				CASE
--				WHEN size_code = ''LB'' THEN ROUND((base_retail / NULLIF(prod_size,0))::numeric, 2)
--		        ELSE 0 END AS "NYLI_RetailLB",
				NULL::numeric AS "Avg Cost",
				NULL AS "Update",
--		        CASE 
--				WHEN promo_base_price >= imap THEN TRUE 
--				ELSE FALSE END AS "Retail >= IMAP",
--		        CASE 
--				WHEN ROUND(((100 - effective_discount) / 100.0) * base_retail::numeric, 2) >= imap THEN TRUE 
--				ELSE FALSE END AS "Sale Retail >= IMAP",
--		        psp_store_count AS "Store Count",
		        prod_last_sold AS "Last Sold",
				promo_name AS "Offer Name",
				promo_id AS "Offer ID"
		    FROM discount_calc dc
			WHERE offer_type NOT IN (''percent_off'',''reg_price'',''fixed_price'',''extra_amount_off'');
		', 
		arr_promo_id,
		CASE
		WHEN prod_discount_level <> ARRAY[-200] 
		THEN 'SELECT pprd.promo_id, dlp.product_id, psd.scenario_data 
		      FROM price_promo.tb_promo_product_reco_details pprd
		      JOIN price_promo.tb_discount_level_products dlp USING (product_level_id)
		      JOIN price_promo.ps_scenario_discounts psd 
		      	ON psd.promo_id = pprd.promo_id 
		        AND psd.product_level_id = pprd.product_level_id'
		ELSE 'SELECT pprd.promo_id, pp.product_id, psd.scenario_data 
		      FROM price_promo.tb_promo_product_reco_details pprd
		      JOIN price_promo.promo_product pp using (promo_id)
		      JOIN price_promo.ps_scenario_discounts psd 
		      	ON psd.promo_id = pprd.promo_id 
		        AND psd.product_level_id = pprd.product_level_id'
		END
		);

		RAISE NOTICE '%', query;
		RETURN QUERY EXECUTE query;

	END LOOP;
END;
$function$
;
