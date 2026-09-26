--liquibase formatted sql
--changeset shaik.azmathulla:fn_get_vendor_container_plan_report runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-66553
--comment: updated fn_get_vendor_container_plan_report

DROP FUNCTION IF EXISTS item_smart.fn_get_vendor_container_plan_report;
CREATE OR REPLACE FUNCTION item_smart.fn_get_vendor_container_plan_report
(
	input refcursor,
	sdate date,
	tdate date,
	dept_name text,
	ven_name text
)
RETURNS refcursor
LANGUAGE 'plpgsql'
AS $function$

/*
 * Function/Procedure name: inventory_smart.fn_get_vendor_container_plan_report
 * Created by: Shaik Azmathulla
 * Created at: 07-Jan-2025
 * No of input parameter: 5
 * Parameter Description : 
 * 
 * Purpose: This function been created to get the summarized report.
 * Calling Statement:
		 select * from item_smart.fn_get_vendor_container_plan_report
				('test',
				 '2025-01-01',
				'2025-12-31',
				 ' ''BEDROOM'' ',
				 ' ''PT KURNIA ANGGUN'' '
				 );
				fetch all in "test";
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *
 */
 DECLARE
		sweek int;
		tweek int;
		_query_combine text;
		
	BEGIN
		
		DROP TABLE IF EXISTS mv_product_hierarchies_filter_temp;
		DROP TABLE IF EXISTS fiscal_date_mapping_temp;
		DROP TABLE IF EXISTS itemfact_sku_temp;
		DROP TABLE IF EXISTS wp_master_temp;
		DROP TABLE IF EXISTS lf_master_temp;

	_query_combine:= '
		CREATE TEMP TABLE fiscal_date_mapping_temp AS
        SELECT 	DISTINCT fiscal_year_week, fiscal_year, fiscal_month, fiscal_week,
        	   	assortment_tier, store_count
        FROM 	"global".fiscal_date_mapping a
        		LEFT JOIN item_smart.itemfact_assortment_tier_week b ON a.fiscal_year_week = b.current_week
		WHERE	calendar_date between '''||sdate ||''' and '''||tdate ||''' ;

		CREATE INDEX idx_fiscal_date_mapping_temp ON fiscal_date_mapping_temp (fiscal_week,fiscal_year); 
		
		CREATE TEMP TABLE itemfact_sku_temp AS
		SELECT 	a.dept,vendor_name,a.hierarchy_code,EXTRACT(week FROM a.launch_date) as week ,EXTRACT(year FROM a.launch_date) as year
		FROM 	item_smart.itemfact_sku a 
		WHERE 	a.vendor_name IN (' || coalesce (ven_name,'') || ') AND a.dept IN ('||coalesce(dept_name,'') ||'); 
		
		CREATE INDEX idx_itemfact_sku_temp ON itemfact_sku_temp (dept,vendor_name,hierarchy_code,week,year); ' ;

		RAISE NOTICE 'temp query: %', _query_combine;
		execute _query_combine;

		SELECT min(fiscal_year_week) AS sweek,max(fiscal_year_week) as tweek 
		INTO sweek,tweek
		FROM fiscal_date_mapping_temp WHERE 1 = 1 LIMIT 1;

		RAISE NOTICE 'Start week: %, End week: %', sweek, tweek;
		_query_combine := '';
		_query_combine := '
		
		CREATE TEMP TABLE wp_master_temp AS
		SELECT 	c.dept,c.hierarchy_code,c.aoh_units,c.aoh_fwos_units ,c.total_receipt_units,written_sales_units
	  	FROM 	item_smart.wp_master c
		WHERE 	c.dept IN ('||coalesce(dept_name,'') ||')
				AND current_week between '||sweek ||' and '||tweek ||';
				
		CREATE INDEX idx_wp_master_temp ON wp_master_temp (dept,hierarchy_code); 
		
		CREATE TEMP TABLE lf_master_temp AS
		SELECT 	c.dept,c.hierarchy_code,c.aoh_units,c.aoh_fwos_units ,c.total_receipt_units,written_sales_units
	  	FROM 	item_smart.lf_master c
		WHERE 	c.dept IN ('||coalesce(dept_name,'') ||')
				AND current_week between '||sweek ||' and '||tweek ||';
				
		CREATE INDEX idx_lf_master_temp ON lf_master_temp (dept,hierarchy_code);  ' ;

		RAISE NOTICE 'master_temp queries: %', _query_combine;
		execute _query_combine;
		_query_combine := '';

		_query_combine := '
		WITH f1_base_data AS (
		    SELECT 
		        ''US'' AS coo,
		        e.vendor_id,
		        b.fiscal_year AS year,
		        b.fiscal_month AS month,
		        b.fiscal_week AS week,
		        l1_name AS division,
		        l2_name AS department,
		        l3_name AS class,
		        product_code AS sku,
		        product_description AS sku_description,
		        collection_name AS collection,
		        lifestyle,
		        kit_status_desc AS kit_status,
		        purchase_status,
		        e.launch_date,
		        e.markdown_date,
		        e.exit_date,
		        b.assortment_tier,
		        b.store_count,
		        c.written_sales_units AS wp_w_sls_units,
		        d.written_sales_units AS lf_w_sls_units,
		        FIRST_VALUE(c.aoh_units) OVER (PARTITION BY l2_name, fiscal_year ORDER BY fiscal_month) AS wp_yearly_aoh_units,
		        FIRST_VALUE(d.aoh_units) OVER (PARTITION BY l2_name, fiscal_year ORDER BY fiscal_month) AS lf_yearly_aoh_units,
		        c.aoh_fwos_units AS wp_aoh_fwos,
		        d.aoh_fwos_units AS lf_aoh_fwos,
		        c.total_receipt_units AS wp_total_receipt_units,
		        d.total_receipt_units AS lf_total_receipt_units,
		        CAST(CASE WHEN e.cubic_meter = ''NA'' THEN ''0'' ELSE cubic_meter END AS float) AS cbm
		    FROM itemfact_sku_temp a
		    LEFT JOIN fiscal_date_mapping_temp b ON a.week = b.fiscal_week AND a.year  = b.fiscal_year
		    LEFT JOIN wp_master_temp c ON a.dept = c.dept AND a.hierarchy_code = c.hierarchy_code
		    LEFT JOIN item_smart.mv_product_hierarchies_filter e ON a.hierarchy_code = e.hierarchy_code
		    LEFT JOIN lf_master_temp d ON a.dept = d.dept AND a.hierarchy_code = d.hierarchy_code
		    WHERE a.vendor_name IN (' || coalesce (ven_name,'') || ') AND a.dept IN ('||coalesce(dept_name,'') ||')
			
		), f1_data AS (
		    SELECT
		        coo,
		        vendor_id,
		        year,
		        month,
		        week,
		        division,
		        department,
		        class,
		        sku,
		        sku_description,
		        collection,
		        lifestyle,
		        kit_status,
		        purchase_status,
		        launch_date,
		        markdown_date,
		        exit_date,
		        assortment_tier,
		        cast(AVG(store_count)as int) AS store_count,
		        SUM(wp_w_sls_units) AS wp_w_sls_units,
		        SUM(lf_w_sls_units) AS lf_w_sls_units,
		        SUM(wp_yearly_aoh_units) AS wp_aoh_units,
		        SUM(lf_yearly_aoh_units) AS lf_aoh_units,
		        SUM(wp_aoh_fwos) AS wp_aoh_fwos,
		        SUM(lf_aoh_fwos) AS lf_aoh_fwos,
		        SUM(wp_total_receipt_units) AS wp_total_receipt_units,
		        SUM(lf_total_receipt_units) AS lf_total_receipt_units,
		        ROUND(AVG(cbm)::numeric,2) AS cbm
		    FROM f1_base_data
		    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18
		), f1_final_1 AS (
		    SELECT
		        coo ,
		        vendor_id,
		        year,
		        month,
		        division,
		        department,
		        class,
		        sku,
		        sku_description,
		        collection,
		        lifestyle,
		        kit_status,
		        purchase_status,
		        launch_date,
		        markdown_date,
		        exit_date,
		        assortment_tier,
		        store_count,
		        wp_w_sls_units,
		        lf_w_sls_units,
		        wp_aoh_units,
		        lf_aoh_units,
		        wp_aoh_fwos,
		        lf_aoh_fwos,
		        wp_total_receipt_units,
		        lf_total_receipt_units,
		        cbm,
		        NULLIF(SUM(wp_total_receipt_units * cbm), 0) / NULLIF(SUM(wp_total_receipt_units), 0) AS wp_cbm,
		        NULLIF(SUM(lf_total_receipt_units * cbm), 0) / NULLIF(SUM(lf_total_receipt_units), 0) AS lf_cbm,
		        CASE 
		            WHEN coo IN (''US'', ''Mexico'') THEN (NULLIF(SUM(wp_total_receipt_units * cbm), 0) / NULLIF(SUM(wp_total_receipt_units), 0)) / 90
		            ELSE (NULLIF(SUM(wp_total_receipt_units * cbm), 0) / NULLIF(SUM(wp_total_receipt_units), 0)) / 67
		        END AS wp_cbm_usage
		    FROM f1_data
		    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27
		),
		f1_final as (
		select 
			coo as "COO"  ,
			vendor_id as "Vendor"  ,
			year as "YEAR"  ,
			month as "MONTH"  ,
			division as "DIVISION"  ,
			department as "Dept"  ,
			class as "Class"  ,
			sku as "SKU"  ,
			sku_description as "SKU Description"  ,
			collection as "Collection"  ,
			lifestyle as "Lifestyle"  ,
			kit_status as "Hard Kit (Y/N)"  ,
			purchase_status as "Purchase Status"  ,
			launch_date as "Launch Date"  ,
			markdown_date as "Initial MD Date"  ,
			exit_date as "Exit Date"  ,
			assortment_tier as "Assortment Tier"  ,
			store_count as "Store Count"  ,
			wp_w_sls_units as "W Sls U - WP"  ,
			lf_w_sls_units as "W Sls U - LF"  ,
			wp_aoh_units as "AOH U - WP"  ,
			lf_aoh_units as "AOH U - LF"  ,
			wp_aoh_fwos as "AOH FWOS - WP"  ,
			lf_aoh_fwos as "AOH FWOS - LF"  ,
			wp_total_receipt_units as "Ttl Rcpt U - WP "  ,
			lf_total_receipt_units as "Ttl Rcpt U - LF"  ,
			cbm as "CBM"  ,
			wp_cbm as "Total CBM - WP"  ,
			lf_cbm as "Total CBM - LF"  ,
			wp_cbm_usage as "Total Container Usage - WP" 

		from f1_final_1
		)
		
		SELECT * FROM f1_final ; ';

		RAISE NOTICE 'final_query: %', _query_combine;
		OPEN $1 FOR execute _query_combine;
		RETURN $1;
		
END;
$function$;