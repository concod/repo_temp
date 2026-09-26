--liquibase formatted sql
--changeset shaik.azmathulla:fn_get_top_drivers_report runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-66552
--comment: initial changeset for fn_get_top_drivers_report

DROP FUNCTION IF EXISTS item_smart.fn_get_top_drivers_report;

CREATE OR REPLACE FUNCTION item_smart.fn_get_top_drivers_report
(
	input refcursor,
	sdate date,
	tdate date,
	report_level text,
	dept_name text,
	coll_name text,
	ven_name text
)
    RETURNS refcursor
    LANGUAGE 'plpgsql'
AS $function$
/*
 * Function/Procedure name: inventory_smart.fn_get_summarized_multi_dept_report
 * Created by: Shaik Azmathulla
 * Created at: 03-Jan-2025
 * No of input parameter: 9
 * Parameter Description : 
 * 
 * Purpose: This function been created to get the summarized report.
 * Calling Statement:
		 select * from item_smart.fn_get_top_drivers_report
				('test',
				 '2024-03-31',
				'2025-04-01',
				 'vendor',
				 ' ''UPHOLSTERY'' ',
				 ' ''WALSH'' ',
				 ' ''KUKA __ia_char_15HK__ia_char_16 TRADE CO.__ia_char_30 LIMIITED'' '
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
		col_name text;
		_year int;
		six_month_interval int;
		three_month_interval int;
		_month int;
		join_con text;
		
	BEGIN

		DROP TABLE IF EXISTS mv_product_hierarchies_filter_temp;
		DROP TABLE IF EXISTS fiscal_date_mapping_temp;
		DROP TABLE IF EXISTS itemfact_sku_temp;
		DROP TABLE IF EXISTS wp_master_temp;
		DROP TABLE IF EXISTS ly_master_temp;
		DROP TABLE IF EXISTS op_master_temp;
	
		IF report_level = 'collection' THEN
        	col_name := 'collection_name,lifestyle';
	    ELSIF report_level = 'vendor' THEN
	        col_name := 'vendor_name';
	    ELSIF report_level = 'sku' THEN
			col_name := ' l1_name,wm.dept,class_name,product_code,product_description,collection_name,lifestyle,wm.hierarchy_code ';
			join_con := 'l1_name, dept, class_name,  product_code, product_description, collection_name, lifestyle, hierarchy_code';
	    END IF;
		
		--RAISE NOTICE 'Selected col_name: % ', col_name;
		
		_year := EXTRACT(YEAR FROM CURRENT_DATE);
		_month := EXTRACT(MONTH FROM CURRENT_DATE);
		three_month_interval := EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '3 months'));
		six_month_interval := EXTRACT(MONTH FROM (CURRENT_DATE - INTERVAL '6 months'));

		RAISE NOTICE 'Selected col_name: %, year: % , month: %,three: %, six: %', col_name,_year,_month,three_month_interval,six_month_interval;
		
		_query_combine:= '
					CREATE TEMP TABLE mv_product_hierarchies_filter_temp AS
					SELECT 	collection_name,markdown_date,hierarchy_code,vendor_name,l2_name,launch_date,exit_date,dpt_name,class_name,
							product_code,product_description,kit_status,purchase_status , lifestyle,l1_name
					FROM 	item_smart.mv_product_hierarchies_filter 
					WHERE	1 = 1 
							and collection_name IN (' || coll_name || ') AND vendor_name IN (' || ven_name || ');
			
					CREATE INDEX idx_mv_product_hierarchies_filter_temp ON mv_product_hierarchies_filter_temp (l2_name,collection_name,lifestyle,vendor_name) ;
		
					CREATE TEMP TABLE  fiscal_date_mapping_temp AS
					SELECT  distinct fiscal_year_week, 
							fiscal_year, fiscal_month, fiscal_week, 0 as sweek,0 as tweek
					FROM "global".fiscal_date_mapping 
					WHERE	calendar_date between '''||sdate ||''' and '''||tdate ||''' ;

					CREATE INDEX idx_fiscal_date_mapping_temp ON fiscal_date_mapping_temp (fiscal_year_week); 
			
					CREATE TEMP TABLE  itemfact_sku_temp AS
					SELECT markdown_date, hierarchy_code,dept,launch_date,exit_date
					FROM item_smart.itemfact_sku 
					WHERE dept IN ('||dept_name ||') ;
			
					CREATE INDEX idx_itemfact_sku_temp ON itemfact_sku_temp (hierarchy_code,dept); ';

		
		RAISE NOTICE 'temp query: %', _query_combine;
		execute _query_combine;

		SELECT min(fiscal_year_week) AS sweek,max(fiscal_year_week) as tweek 
		INTO sweek,tweek
		FROM fiscal_date_mapping_temp WHERE 1 = 1 LIMIT 1;

		RAISE NOTICE 'Start week: %, End week: %', sweek, tweek;
		_query_combine := '';
		
		_query_combine:= '
						CREATE TEMP TABLE  wp_master_temp AS					
						SELECT 	* 
						FROM 	item_smart.wp_master wm
						WHERE 	dept IN ('||dept_name ||') 
								and current_week between '||sweek ||' and '||tweek ||' ;
						
						CREATE INDEX idx_wp_master_temp ON wp_master_temp (dept,current_week); 
						
						CREATE TEMP TABLE  ly_master_temp AS					
						SELECT 	* 
						FROM 	item_smart.ly_master wm
						WHERE 	dept IN ('||dept_name ||')
								and current_week between '||sweek ||' and '||tweek ||';
						
						CREATE INDEX idx_ly_master_temp ON ly_master_temp (dept,current_week);
						
						CREATE TEMP TABLE  op_master_temp AS					
						SELECT 	* 
						FROM 	item_smart.op_master wm
						WHERE 	dept IN ('||dept_name ||') 
								and current_week between '||sweek ||' and '||tweek ||';
						
						CREATE INDEX idx_op_master_temp ON op_master_temp (dept,current_week); 
						';
		RAISE NOTICE 'master_temp queries: %', _query_combine;
		execute _query_combine;
		_query_combine := '';
		
		_query_combine := '
											
						with max_inv_wp as (
							select  '||col_name ||',
									current_week  as current_week,
									Sum(eop_units) as eop_units_wp
							FROM 	wp_master_temp wm
							     	inner JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code 
									inner JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
									LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
							WHERE 	wm.dept IN ('||dept_name ||') and collection_name IN (' || coll_name || ')
									and vendor_name IN (' || ven_name || ')
									and current_week = '||tweek ||' 
							group by '||col_name ||',current_week
						),
						min_inv_wp as (
							SELECT  '||col_name ||',
									current_week AS current_week,
									Sum(atp_units) as atp_units_wp
							FROM 	wp_master_temp wm
							     	INNER JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code 
									INNER JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
									LEFT JOIN  itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
							WHERE 	wm.dept IN ('||dept_name ||') and collection_name IN (' || coll_name || ')
									and vendor_name IN (' || ven_name || ')
									and current_week = '||sweek ||' 
							 group by '||col_name ||',current_week
						 
						),
						wp_inv as (
							SELECT 	'||case when report_level = 'sku' then join_con else col_name end ||',
									atp_units_wp,
									eop_units_wp
							FROM 	max_inv_wp
							JOIN 	min_inv_wp USING( '||case when report_level = 'sku' then join_con else col_name end ||' )
						),
						wp_avg_base as (
							SELECT
							        '||col_name ||',
							        fiscal_month, fiscal_year,
							        SUM(written_sales_dollars) AS w_sls_dollars,
							        SUM(written_sales_units) AS w_sls_units,
							        COALESCE(SUM(written_sales_dollars) / NULLIF(SUM(written_sales_units), 0), 0) AS written_aur
							FROM 	wp_master_temp wm
							     	INNER JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code 
									INNER JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
									LEFT JOIN  itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
									' ||
			        				CASE WHEN report_level = 'vendor' THEN 
			                		'left join item_smart.itemfact_assortment_tier_week iatw on iatw.current_week = wm.current_week ' ELSE ''	
			        				END ||'				
							WHERE 	wm.dept IN ('||dept_name ||') and collection_name IN (' || coll_name || ')
									and vendor_name IN (' || ven_name || ')
							GROUP BY '||col_name ||',fiscal_month, fiscal_year
						
						),
						--Inventory calc
						wp_avg as (
							SELECT '||col_name ||',
							        avg(w_sls_dollars) as avg_w_sls_dollars,
							        avg (case when fiscal_year*100+fiscal_month  between 
							        ' || _year || ' *100 + ' || three_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_dollars else 0 end) as written_sales_dollars_3m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_dollars else 0 end) as written_sales_dollars_6m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_dollars else 0 end) as written_sales_dollars_9m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || three_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_units else 0 end) as written_sales_units_3m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_units else 0 end) as written_sales_units_6m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_units else 0 end) as written_sales_units_9m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || three_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then written_aur else 0 end) as w_aur_3m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then written_aur else 0 end) as w_aur_6m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || '  
							        then written_aur else 0 end) as w_aur_9m_avg
							 FROM 	wp_avg_base wm
							 GROUP by '||col_name ||'       
						),
						wp_avg_final as (
							SELECT *
							FROM wp_avg
						),
						--avg calc
						wp_base as (
							SELECT
						        '||col_name ||',
						        SUM(written_sales_dollars) AS w_sls_dollars_wp,
						        SUM(written_sales_units) AS w_sls_units_wp,
						        SUM(delivered_net_sales_dollars) AS d_sls_dollars_wp,
						        SUM(delivered_net_sales_units) AS d_sls_units_wp,
						        SUM(written_gm_dollar) AS w_gm_dollars_wp,
						        SUM(delivered_gm) AS d_gm_wp,
						        SUM(CASE WHEN EXTRACT(YEAR from COALESCE(is2.markdown_date, mv.markdown_date)) >= fiscal_year AND EXTRACT(WEEK FROM COALESCE(is2.markdown_date, mv.markdown_date)) >= fiscal_week THEN written_sales_units ELSE 0 END) 
						        AS post_md_written_units_wp,
						    	SUM(CASE 
						        WHEN COALESCE(is2.markdown_date, mv.markdown_date) IS NULL THEN written_sales_dollars
						        WHEN EXTRACT(YEAR FROM COALESCE(is2.markdown_date, mv.markdown_date)) < fiscal_year AND EXTRACT(WEEK FROM COALESCE(is2.markdown_date, mv.markdown_date)) < fiscal_week THEN written_sales_dollars
						        ELSE 0 END) AS pre_md_written_sales_wp,
						    	SUM(CASE 
						        WHEN COALESCE(is2.markdown_date, mv.markdown_date) IS NULL THEN written_sales_units
						        WHEN EXTRACT(YEAR FROM COALESCE(is2.markdown_date, mv.markdown_date)) < fiscal_year AND EXTRACT(WEEK FROM COALESCE(is2.markdown_date, mv.markdown_date)) < fiscal_week THEN written_sales_units
						        ELSE 0 END) AS pre_md_written_units_wp,
						        SUM(CASE WHEN EXTRACT(YEAR from COALESCE(is2.markdown_date, mv.markdown_date)) >= fiscal_year AND EXTRACT(WEEK FROM COALESCE(is2.markdown_date, mv.markdown_date)) >= fiscal_week THEN written_sales_dollars ELSE 0 END) 
						        AS post_md_written_sales_wp,
						        COALESCE(SUM(written_air * written_sales_units) / NULLIF(SUM(written_sales_units), 0), 0) AS written_air_wp,
						        COALESCE(SUM(written_sales_dollars) / NULLIF(SUM(written_sales_units), 0), 0) AS written_aur_wp,
						        COALESCE(SUM(delivered_net_sales_dollars) / NULLIF(SUM(delivered_net_sales_units), 0), 0) AS delivered_aur_wp,
						        COALESCE(SUM(written_sales_cost) / NULLIF(SUM(written_sales_units), 0), 0) AS written_auc_wp,
						        COALESCE(SUM(written_gm_dollar) / NULLIF(SUM(written_sales_dollars), 0), 0) AS written_gm_perc_wp,
						        COALESCE(SUM(delivered_gm) / NULLIF(SUM(delivered_net_sales_dollars), 0), 0) AS delivered_gmperc_wp,
						        COALESCE(SUM(written_dr_perc * written_sales_units) / NULLIF(SUM(written_sales_units), 0), 0) AS written_dr_perc_wp,
						        SUM(total_receipt_units) AS total_receipt_units_wp,
						    	SUM(on_order_placed_total_unit) AS on_order_placed_total_unit_wp,
						    	SUM(aoh_fwos_units) AS aoh_fwos_units_wp,
						    	SUM(atp_fwos_units) AS atp_fwos_units_wp
						FROM 	wp_master_temp wm
						     	INNER JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code 
								INNER JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
								LEFT JOIN  itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
								left join item_smart.itemfact_assortment_tier_week iatw on iatw.current_week = wm.current_week
						WHERE 	wm.dept IN ('||dept_name ||') and collection_name IN (' || coll_name || ')
									and vendor_name IN (' || ven_name || ')
						GROUP BY '||col_name ||'
						),
						wp_data as (
							SELECT *
							FROM wp_base
							join wp_avg_final using( '||case when report_level = 'sku' then join_con else col_name end ||' )
							join wp_inv using( '||case when report_level = 'sku' then join_con else col_name end ||' )
						)
						,
						max_inv_ly as (
							SELECT  '||col_name ||',
									current_week,
									Sum(eop_units) as eop_units_ly
							FROM 	ly_master_temp wm
							     	inner JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code 
									inner JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
									LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
							WHERE 	wm.dept IN ('||dept_name ||') and collection_name IN (' || coll_name || ')
									and vendor_name IN (' || ven_name || ') 
									and current_week = '||tweek ||' 
							 group by '||col_name ||',current_week
						),
						min_inv_ly as (
							select  '||col_name ||',
									current_week,
									Sum(atp_units) as atp_units_ly
							FROM 	ly_master_temp wm
							     	inner JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code 
									inner JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
									LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
							WHERE 	wm.dept IN ('||dept_name ||') and collection_name IN (' || coll_name || ')
									and vendor_name IN (' || ven_name || ') 
									and current_week = '||sweek ||' 
							 group by '||col_name ||',current_week
						),
						ly_inv as (
							SELECT 	'||case when report_level = 'sku' then join_con else col_name end ||',
									atp_units_ly,
									eop_units_ly
							FROM 	max_inv_ly
							JOIN 	min_inv_ly using( '||case when report_level = 'sku' then join_con else col_name end ||' )
						),
						ly_avg_base as (
							SELECT
							        '||col_name ||',
							        fiscal_month, fiscal_year,
							        SUM(written_sales_dollars) AS w_sls_dollars,
							        SUM(written_sales_units) AS w_sls_units,
							        COALESCE(SUM(written_sales_dollars) / NULLIF(SUM(written_sales_units), 0), 0) AS written_aur
							FROM	ly_master_temp wm
							     	inner JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code 
									inner JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
									LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
									left join item_smart.itemfact_assortment_tier_week iatw on iatw.current_week = wm.current_week
							WHERE 	wm.dept IN ('||dept_name ||') and collection_name IN (' || coll_name || ')
									and vendor_name IN (' || ven_name || ') 
							GROUP BY '||col_name ||',fiscal_month, fiscal_year
						),
						--Inventory calc
						ly_avg as (
							select '||col_name ||',
							        avg(w_sls_dollars) as avg_w_sls_dollars,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || three_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_dollars else 0 end) as written_sales_dollars_3m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_dollars else 0 end) as written_sales_dollars_6m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_dollars else 0 end) as written_sales_dollars_9m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || three_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || '  
							        then w_sls_units else 0 end) as written_sales_units_3m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_units else 0 end) as written_sales_units_6m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_units else 0 end) as written_sales_units_9m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							        ' || _year || ' *100 +' || three_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then written_aur else 0 end) as w_aur_3m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then written_aur else 0 end) as w_aur_6m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then written_aur else 0 end) as w_aur_9m_avg
							 FROM 	ly_avg_base wm
							 group by '||col_name ||'       
						),
						ly_avg_final as (
							SELECT *
							FROM ly_avg
						),
						--avg calc
						ly_base as (
							SELECT
						        '||col_name ||',
						        SUM(written_sales_dollars) AS w_sls_dollars_ly,
						        SUM(written_sales_units) AS w_sls_units_ly,
						        SUM(delivered_net_sales_dollars) AS d_sls_dollars_ly,
						        SUM(delivered_net_sales_units) AS d_sls_units_ly,
						        SUM(written_gm_dollar) AS w_gm_dollars_ly,
						        SUM(delivered_gm) AS d_gm_ly,
						        SUM(CASE WHEN EXTRACT(YEAR from COALESCE(is2.markdown_date, mv.markdown_date)) >= fiscal_year AND EXTRACT(WEEK FROM COALESCE(is2.markdown_date, mv.markdown_date)) >= fiscal_week THEN written_sales_units ELSE 0 END) 
						        AS post_md_written_units_ly,
						    	SUM(CASE 
						        WHEN COALESCE(is2.markdown_date, mv.markdown_date) IS NULL THEN written_sales_dollars
						        WHEN EXTRACT(YEAR FROM COALESCE(is2.markdown_date, mv.markdown_date)) < fiscal_year AND EXTRACT(WEEK FROM COALESCE(is2.markdown_date, mv.markdown_date)) < fiscal_week THEN written_sales_dollars
						        ELSE 0 END) AS pre_md_written_sales_ly,
						    	SUM(CASE 
						        WHEN COALESCE(is2.markdown_date, mv.markdown_date) IS NULL THEN written_sales_units
						        WHEN EXTRACT(YEAR FROM COALESCE(is2.markdown_date, mv.markdown_date)) < fiscal_year AND EXTRACT(WEEK FROM COALESCE(is2.markdown_date, mv.markdown_date)) < fiscal_week THEN written_sales_units
						        ELSE 0 END) AS pre_md_written_units_ly,
						        SUM(CASE WHEN EXTRACT(YEAR from COALESCE(is2.markdown_date, mv.markdown_date)) >= fiscal_year AND EXTRACT(WEEK FROM COALESCE(is2.markdown_date, mv.markdown_date)) >= fiscal_week THEN written_sales_dollars ELSE 0 END) 
						        AS post_md_written_sales_ly,
						        COALESCE(SUM(written_air * written_sales_units) / NULLIF(SUM(written_sales_units), 0), 0) AS written_air_ly,
						        COALESCE(SUM(written_sales_dollars) / NULLIF(SUM(written_sales_units), 0), 0) AS written_aur_ly,
						        COALESCE(SUM(delivered_net_sales_dollars) / NULLIF(SUM(delivered_net_sales_units), 0), 0) AS delivered_aur_ly,
						        COALESCE(SUM(written_sales_cost) / NULLIF(SUM(written_sales_units), 0), 0) AS written_auc_ly,
						        COALESCE(SUM(written_gm_dollar) / NULLIF(SUM(written_sales_dollars), 0), 0) AS written_gm_perc_ly,
						        COALESCE(SUM(delivered_gm) / NULLIF(SUM(delivered_net_sales_dollars), 0), 0) AS delivered_gmperc_ly,
						        COALESCE(SUM(written_dr_perc * written_sales_units) / NULLIF(SUM(written_sales_units), 0), 0) AS written_dr_perc_ly,
						        SUM(total_receipt_units) AS total_receipt_units_ly,
						    	SUM(on_order_placed_total_unit) AS on_order_placed_total_unit_ly,
						    	SUM(aoh_fwos_units) AS aoh_fwos_units_ly,
						    	SUM(atp_fwos_units) AS atp_fwos_units_ly
						   FROM	ly_master_temp wm
						     	inner JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code 
								inner JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
								LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
								left join item_smart.itemfact_assortment_tier_week iatw on iatw.current_week = wm.current_week
						    WHERE 	wm.dept IN ('||dept_name ||') and collection_name IN (' || coll_name || ') 
									and vendor_name IN (' || ven_name || ') 
						    GROUP BY '||col_name ||'
						),
						ly_data as (
							select *
							from ly_base
							-- join ly_avg_final using( '||case when report_level = 'sku' then join_con else col_name end ||' )
							join ly_inv using( '||case when report_level = 'sku' then join_con else col_name end ||' )
						),
						max_inv_op as (
							select  '||col_name ||',
									current_week,
									Sum(eop_units) as eop_units_op
							FROM 	op_master_temp wm
							     	inner JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code 
									inner JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
									LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
							WHERE 	wm.dept IN ('||dept_name ||') and collection_name IN (' || coll_name || ') 
									and vendor_name IN (' || ven_name || ') 
									and current_week = '||tweek ||'
							 group by '||col_name ||',current_week
						),
						min_inv_op as (
							select  '||col_name ||',
									current_week,
									Sum(atp_units) as atp_units_op
							FROM 	op_master_temp wm
							     	inner JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code 
									inner JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
									LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
							WHERE 	wm.dept IN ('||dept_name ||') and collection_name IN (' || coll_name || ') 
									and vendor_name IN (' || ven_name || ') 
									and current_week = '||sweek ||'
							 group by '||col_name ||',current_week
						),
						op_inv as (
							select 		'||case when report_level = 'sku' then join_con else col_name end ||',
									atp_units_op,
									eop_units_op
							from max_inv_op
							join min_inv_op using( '||case when report_level = 'sku' then join_con else col_name end ||' )
						),
						op_avg_base as (
							SELECT
							        '||col_name ||',
							        fiscal_month, fiscal_year,
							        SUM(written_sales_dollars) AS w_sls_dollars,
							        SUM(written_sales_units) AS w_sls_units,
							        COALESCE(SUM(written_sales_dollars) / NULLIF(SUM(written_sales_units), 0), 0) AS written_aur
							FROM 	op_master_temp wm
							     	inner JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code 
									inner JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
									LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
									left join item_smart.itemfact_assortment_tier_week iatw on iatw.current_week = wm.current_week
							WHERE 	wm.dept IN ('||dept_name ||') and collection_name IN (' || coll_name || ')
									and vendor_name IN (' || ven_name || ') 
							GROUP BY '||col_name ||',fiscal_month, fiscal_year
						),
						--Inventory calc
						op_avg as (
							select '||col_name ||',
							        avg(w_sls_dollars) as avg_w_sls_dollars,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || three_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_dollars else 0 end) as written_sales_dollars_3m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_dollars else 0 end) as written_sales_dollars_6m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || '  
							        then w_sls_dollars else 0 end) as written_sales_dollars_9m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || three_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_units else 0 end) as written_sales_units_3m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_units else 0 end) as written_sales_units_6m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then w_sls_units else 0 end) as written_sales_units_9m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || three_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then written_aur else 0 end) as w_aur_3m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then written_aur else 0 end) as w_aur_6m_avg,
							        avg (case when fiscal_year*100+fiscal_month  between 
							         ' || _year || ' *100 +' || six_month_interval || '
							        and 
							         ' || _year || ' *100 + ' || _month || ' 
							        then written_aur else 0 end) as w_aur_9m_avg
								from op_avg_base wm
								group by '||col_name ||'
						),
						op_avg_final as (
							select *
							from op_avg
						),
						--avg calc
						op_base as (
							SELECT
						        '||col_name ||',
						        SUM(written_sales_dollars) AS w_sls_dollars_op,
						        SUM(written_sales_units) AS w_sls_units_op,
						        SUM(delivered_net_sales_dollars) AS d_sls_dollars_op,
						        SUM(delivered_net_sales_units) AS d_sls_units_op,
						        SUM(written_gm_dollar) AS w_gm_dollars_op,
						        SUM(delivered_gm) AS d_gm_op,
						        SUM(CASE WHEN EXTRACT(YEAR from COALESCE(is2.markdown_date, mv.markdown_date)) >= fiscal_year AND EXTRACT(WEEK FROM COALESCE(is2.markdown_date, mv.markdown_date)) >= fiscal_week THEN written_sales_units ELSE 0 END) 
						        AS post_md_written_units_op,
						    	SUM(CASE 
						        WHEN COALESCE(is2.markdown_date, mv.markdown_date) IS NULL THEN written_sales_dollars
						        WHEN EXTRACT(YEAR FROM COALESCE(is2.markdown_date, mv.markdown_date)) < fiscal_year AND EXTRACT(WEEK FROM COALESCE(is2.markdown_date, mv.markdown_date)) < fiscal_week THEN written_sales_dollars
						        ELSE 0 END) AS pre_md_written_sales_op,
						    	SUM(CASE 
						        WHEN COALESCE(is2.markdown_date, mv.markdown_date) IS NULL THEN written_sales_units
						        WHEN EXTRACT(YEAR FROM COALESCE(is2.markdown_date, mv.markdown_date)) < fiscal_year AND EXTRACT(WEEK FROM COALESCE(is2.markdown_date, mv.markdown_date)) < fiscal_week THEN written_sales_units
						        ELSE 0 END) AS pre_md_written_units_op,
						        SUM(CASE WHEN EXTRACT(YEAR from COALESCE(is2.markdown_date, mv.markdown_date)) >= fiscal_year AND EXTRACT(WEEK FROM COALESCE(is2.markdown_date, mv.markdown_date)) >= fiscal_week THEN written_sales_dollars ELSE 0 END) 
						        AS post_md_written_sales_op,
						        COALESCE(SUM(written_air * written_sales_units) / NULLIF(SUM(written_sales_units), 0), 0) AS written_air_op,
						        COALESCE(SUM(written_sales_dollars) / NULLIF(SUM(written_sales_units), 0), 0) AS written_aur_op,
						        COALESCE(SUM(delivered_net_sales_dollars) / NULLIF(SUM(delivered_net_sales_units), 0), 0) AS delivered_aur_op,
						        COALESCE(SUM(written_sales_cost) / NULLIF(SUM(written_sales_units), 0), 0) AS written_auc_op,
						        COALESCE(SUM(written_gm_dollar) / NULLIF(SUM(written_sales_dollars), 0), 0) AS written_gm_perc_op,
						        COALESCE(SUM(delivered_gm) / NULLIF(SUM(delivered_net_sales_dollars), 0), 0) AS delivered_gmperc_op,
						        COALESCE(SUM(written_dr_perc * written_sales_units) / NULLIF(SUM(written_sales_units), 0), 0) AS written_dr_perc_op,
						        SUM(total_receipt_units) AS total_receipt_units_op,
						    	SUM(on_order_placed_total_unit) AS on_order_placed_total_unit_op,
						    	SUM(aoh_fwos_units) AS aoh_fwos_units_op,
						    	SUM(atp_fwos_units) AS atp_fwos_units_op
						    FROM 	op_master_temp wm
						     	inner JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code 
								inner JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
								LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
								left join item_smart.itemfact_assortment_tier_week iatw on iatw.current_week = wm.current_week
							WHERE 	wm.dept IN ('||dept_name ||') and collection_name IN (' || coll_name || ')
									and vendor_name IN (' || ven_name || ') 
						    GROUP BY '||col_name ||'
						),
						op_data as (
							select *
							from op_base
							-- join op_avg_final using( '||case when report_level = 'sku' then join_con else col_name end ||' )
							join op_inv using( '||case when report_level = 'sku' then join_con else col_name end ||' )
							),
							contri_base as (
							SELECT ''ttl'' as  l0_name,
							        '||col_name ||',
							        SUM(written_sales_dollars) AS w_sls_dollars
							FROM 	wp_master_temp wm
							     	INNER JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code  
									INNER JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
							WHERE 	wm.dept IN ('||dept_name ||') and collection_name IN (' || coll_name || ')
									and vendor_name IN (' || ven_name || ') 
							GROUP BY '||col_name ||'
						),
						contri as  (
							SELECT l0_name,
									'||col_name ||',
							        w_sls_dollars,
							      RANK() OVER (PARTITION BY l0_name ORDER BY w_sls_dollars DESC) AS rank_omni,
							      RANK() OVER (PARTITION BY '||col_name ||'        
							        ORDER BY w_sls_dollars DESC) AS rank_rpt
							FROM contri_base wm
						),
						c_base as (
							select *,
							w_sls_dollars/Sum(w_sls_dollars) over (PARTITION BY l0_name ) as sls_to_ttl
							from contri
						),
						contri_final as (
							select '||col_name ||',sls_to_ttl,w_sls_dollars/Sum(case when rank_omni<=10 then w_sls_dollars else 0 end ) over (PARTITION BY l0_name ) as sls_to_rpt
							from c_base wm
							where rank_omni<=10
						),report_final AS (
						select *,
						COALESCE((w_sls_dollars_wp - w_sls_dollars_op) , 0) AS w_sls_dollars_wp_op_var,
						COALESCE((pre_md_written_sales_wp - pre_md_written_sales_wp) , 0) AS pre_md_w_sls_dollars_wp_op_var,
						COALESCE((post_md_written_sales_wp - post_md_written_sales_op) , 0) AS post_md_w_sls_dollars_wp_op_var,
						COALESCE((w_sls_dollars_wp - w_sls_dollars_op) / NULLIF(w_sls_dollars_op, 0) , 0) AS w_sls_dollars_wp_op_var_perc,
						COALESCE((pre_md_written_sales_wp - pre_md_written_sales_op) / NULLIF(pre_md_written_sales_op, 0) , 0) AS pre_md_w_sls_dollars_wp_op_var_perc,
						COALESCE((post_md_written_sales_wp - post_md_written_sales_op) / NULLIF(post_md_written_sales_op, 0) , 0) AS post_md_w_sls_dollars_wp_op_var_perc,
						COALESCE((w_sls_dollars_wp - w_sls_dollars_ly) , 0) AS w_sls_dollars_wp_ly_var,
						COALESCE((pre_md_written_sales_wp - pre_md_written_sales_ly) , 0) AS pre_md_w_sls_dollars_wp_ly_var,
						COALESCE((post_md_written_sales_wp - post_md_written_sales_ly) , 0) AS post_md_w_sls_dollars_wp_ly_var,
						COALESCE((w_sls_dollars_wp - w_sls_dollars_ly) / NULLIF(w_sls_dollars_ly, 0) , 0) AS w_sls_dollars_wp_ly_var_perc,
						COALESCE((pre_md_written_sales_wp - pre_md_written_sales_ly) / NULLIF(pre_md_written_sales_ly, 0) , 0) AS pre_md_w_sls_dollars_wp_ly_var_perc,
						COALESCE((post_md_written_sales_wp - post_md_written_sales_ly) / NULLIF(post_md_written_sales_ly, 0) , 0) AS post_md_w_sls_dollars_wp_ly_var_perc,
						COALESCE((w_sls_units_wp - w_sls_units_op) , 0) AS w_sls_units_wp_op_var,
						COALESCE((pre_md_written_units_wp - pre_md_written_units_op) , 0) AS pre_md_w_sls_units_wp_op_var,
						COALESCE((post_md_written_units_wp - post_md_written_units_op) , 0) AS post_md_w_sls_units_wp_op_var,
						COALESCE((w_sls_units_wp - w_sls_units_op) / NULLIF(w_sls_units_op, 0) , 0) AS w_sls_units_wp_op_var_perc,
						COALESCE((pre_md_written_units_wp - pre_md_written_units_op) / NULLIF(pre_md_written_units_op, 0) , 0) AS pre_md_w_sls_units_wp_op_var_perc,
						COALESCE((post_md_written_units_wp - post_md_written_units_op) / NULLIF(post_md_written_units_op, 0) , 0) AS post_md_w_sls_units_wp_op_var_perc,
						COALESCE((w_sls_units_wp - w_sls_units_ly) , 0) AS w_sls_units_wp_ly_var,
						COALESCE((pre_md_written_units_wp - pre_md_written_units_ly) , 0) AS pre_md_w_sls_units_wp_ly_var,
						COALESCE((post_md_written_units_wp - post_md_written_units_ly) , 0) AS post_md_w_sls_units_wp_ly_var,
						COALESCE((w_sls_units_wp - w_sls_dollars_ly) / NULLIF(w_sls_units_ly, 0) , 0) AS w_sls_units_wp_ly_var_perc,
						COALESCE((pre_md_written_units_wp - pre_md_written_units_ly) / NULLIF(pre_md_written_units_ly, 0) , 0) AS pre_md_w_sls_units_wp_ly_var_perc,
						COALESCE((post_md_written_units_wp - post_md_written_units_ly) / NULLIF(post_md_written_units_ly, 0) , 0) AS post_md_w_sls_units_wp_ly_var_perc,
						COALESCE((w_gm_dollars_wp - w_gm_dollars_op) , 0) AS w_gm_dollars_wp_op_var,
						COALESCE(((NULLIF(w_gm_dollars_wp, 0)/NULLIF(w_sls_dollars_wp, 0)) - (NULLIF(w_gm_dollars_op, 0) / NULLIF(w_sls_dollars_op, 0)))/(NULLIF(w_gm_dollars_op, 0) / NULLIF(w_sls_dollars_op, 0)) , 0) AS w_gm_perc_wp_op_var,
						COALESCE((w_gm_dollars_wp - w_gm_dollars_op) / NULLIF(w_gm_dollars_op, 0) , 0) AS w_gm_dollars_wp_op_var_perc,
						COALESCE((w_gm_dollars_wp - w_gm_dollars_ly), 0) AS w_gm_dollars_wp_ly_var,
						COALESCE(((NULLIF(w_gm_dollars_wp, 0)/NULLIF(w_sls_dollars_wp, 0)) - (NULLIF(w_gm_dollars_ly, 0) / NULLIF(w_sls_dollars_ly, 0)))/(NULLIF(w_gm_dollars_ly, 0) / NULLIF(w_sls_dollars_ly, 0)) , 0) AS w_gm_perc_wp_ly_var,
						COALESCE((w_gm_dollars_wp - w_gm_dollars_ly) / NULLIF(w_gm_dollars_ly, 0) , 0) AS w_gm_dollars_wp_ly_var_perc,
						COALESCE((total_receipt_units_wp - total_receipt_units_op) , 0) AS total_receipt_units_wp_op_var,
						COALESCE((total_receipt_units_wp - total_receipt_units_op) / NULLIF(total_receipt_units_op, 0) , 0) AS total_receipt_units_wp_op_var_perc,
						COALESCE((total_receipt_units_wp - total_receipt_units_ly) , 0) AS total_receipt_units_wp_ly_var,
						COALESCE((total_receipt_units_wp - total_receipt_units_ly) / NULLIF(total_receipt_units_ly, 0) , 0) AS total_receipt_units_wp_ly_var_perc,
						COALESCE((on_order_placed_total_unit_wp - on_order_placed_total_unit_op) , 0) AS on_order_placed_total_unit_wp_op_var,
						COALESCE((on_order_placed_total_unit_wp - on_order_placed_total_unit_op)/NULLIF(on_order_placed_total_unit_op, 0) , 0) AS on_order_placed_total_unit_wp_op_var_perc,
						COALESCE((on_order_placed_total_unit_wp - on_order_placed_total_unit_ly) , 0) AS on_order_placed_total_unit_wp_ly_var,
						COALESCE((on_order_placed_total_unit_wp - on_order_placed_total_unit_ly)/NULLIF(on_order_placed_total_unit_ly, 0) , 0) AS on_order_placed_total_unit_wp_ly_var_perc,
						COALESCE((d_sls_dollars_wp - d_sls_dollars_op) , 0) AS d_sls_dollars_wp_op_var,
						COALESCE((d_sls_dollars_wp - d_sls_dollars_op)/NULLIF(d_sls_dollars_op, 0) , 0) AS d_sls_dollars_wp_op_var_perc,
						COALESCE((d_sls_dollars_wp - d_sls_dollars_ly) , 0) AS d_sls_dollars_wp_ly_var,
						COALESCE((d_sls_dollars_wp - d_sls_dollars_ly)/NULLIF(d_sls_dollars_ly, 0) , 0) AS d_sls_dollars_wp_ly_var_perc,
						COALESCE((d_sls_units_wp - d_sls_units_op) , 0) AS d_sls_units_wp_op_var,
						COALESCE((d_sls_units_wp - d_sls_units_op)/NULLIF(d_sls_units_op, 0) , 0) AS d_sls_units_wp_op_var_perc,
						COALESCE((d_sls_units_wp - d_sls_units_ly) , 0) AS d_sls_units_wp_ly_var,
						COALESCE((d_sls_units_wp - d_sls_units_ly)/NULLIF(d_sls_units_ly, 0) , 0) AS d_sls_units_wp_ly_var_perc,
						COALESCE((d_gm_wp - d_gm_op) , 0) AS d_gm_wp_op_var,
						COALESCE(((NULLIF(d_gm_wp, 0)/NULLIF(d_sls_dollars_wp, 0)) - (NULLIF(d_gm_op, 0) / NULLIF(d_sls_dollars_op, 0)))/(NULLIF(d_gm_op, 0) / NULLIF(d_sls_dollars_op, 0)) , 0) AS d_gm_perc_wp_op_var,
						COALESCE((d_gm_wp - d_gm_op) / NULLIF(d_gm_op, 0) , 0) AS d_gm_wp_op_var_perc,
						coalesce(NULLIF(d_gm_ly, 0) / NULLIF(w_sls_dollars_ly, 0) , 0) AS ly_d_gm_perc,
						COALESCE((d_gm_wp - d_gm_ly) , 0) AS d_gm_wp_ly_var,
						COALESCE(((NULLIF(d_gm_wp, 0)/NULLIF(d_sls_dollars_wp, 0)) - (NULLIF(d_gm_ly, 0) / NULLIF(d_sls_dollars_ly, 0)))/(NULLIF(d_gm_ly, 0) / NULLIF(d_sls_dollars_ly, 0)) , 0) AS d_gm_perc_wp_ly_var,
						COALESCE((d_gm_wp - d_gm_ly) / NULLIF(d_gm_ly, 0) , 0) AS d_gm_wp_ly_var_perc,
						COALESCE((eop_units_wp - eop_units_op) , 0) AS eop_units_wp_op_var,
						COALESCE((eop_units_wp - eop_units_op) / NULLIF(eop_units_op, 0) , 0) AS eop_units_wp_op_var_perc,
						COALESCE((eop_units_wp - eop_units_ly) , 0) AS eop_units_wp_ly_var,
						COALESCE((eop_units_wp - eop_units_ly) / NULLIF(eop_units_ly, 0) , 0) AS eop_units_wp_ly_var_perc
						from wp_data
						left join ly_data using('||case when report_level = 'sku' then join_con else col_name end ||' )
						left join op_data using( '||case when report_level = 'sku' then join_con else col_name end ||' )
						inner join contri_final using( '||case when report_level = 'sku' then join_con else col_name end ||' )
						)
						Select 
						'||case when report_level = 'sku' then join_con else col_name end ||',
						sls_to_ttl as "% of WP W Sls $ to Ttl"  ,
						sls_to_rpt as "% of WP W Sls $ of Top Drivers"  ,
						avg_w_sls_dollars as "WP Avg Monthly W Sls$"  ,
						written_sales_dollars_3m_avg as "3 mo Avg Month W Sls $"  ,
						written_sales_dollars_6m_avg as "6 mo Avg Month W Sls $"  ,
						written_sales_dollars_9m_avg as "9 mo Avg Month W Sls $"  ,
						written_sales_units_3m_avg as "3 mo Avg Month W Sls U"  ,
						written_sales_units_6m_avg as "6 mo Avg Month W Sls U"  ,
						written_sales_units_9m_avg as "9 mo Avg Month W Sls U"  ,
						w_sls_dollars_wp as "WP W Sls $"  ,
						pre_md_written_sales_wp as "WP W Sls $ - PreMD"  ,
						post_md_written_sales_wp as "WP W Sls $ - PostMD"  ,
						w_sls_dollars_op as "OP W Sls $"  ,
						pre_md_written_sales_op as "OP W Sls $ - PreMD"  ,
						post_md_written_sales_op as "OP W Sls $ - PostMD"  ,
						w_sls_dollars_wp_op_var as "WP W Sls $ Var to OP"  ,
						pre_md_w_sls_dollars_wp_op_var as "WP W Sls $ - PreMD Var to OP"  ,
						post_md_w_sls_dollars_wp_op_var as "WP W Sls $ - PostMD Var to OP"  ,
						w_sls_dollars_wp_op_var_perc as "WP W Sls $ % Var  to OP"  ,
						pre_md_w_sls_dollars_wp_op_var_perc as "WP W Sls $ - PreMD % Var  to OP"  ,
						post_md_w_sls_dollars_wp_op_var_perc as "WP W Sls $ - PostMD % Var  to OP"  ,
						w_sls_dollars_ly as "LY W Sls $"  ,
						pre_md_written_sales_ly as "LY W Sls $ - PreMD"  ,
						post_md_written_sales_ly as "LY W Sls $ - PostMD"  ,
						w_sls_dollars_wp_ly_var as "WP W Sls $ Var to LY"  ,
						pre_md_w_sls_dollars_wp_ly_var as "WP W Sls $ - PreMD Var to LY"  ,
						post_md_w_sls_dollars_wp_ly_var as "WP W Sls $ - PostMD Var to LY"  ,
						w_sls_dollars_wp_ly_var_perc as "WP W Sls $ % Var to LY"  ,
						pre_md_w_sls_dollars_wp_ly_var_perc as "WP W Sls $ - PreMD % Var to LY"  ,
						post_md_w_sls_dollars_wp_ly_var_perc as "WP W Sls $ - PostMD % Var to LY"  ,
						w_sls_units_wp as "WP W Sls U"  ,
						pre_md_written_units_wp as "WP W Sls U - PreMD"  ,
						post_md_written_units_wp as "WP W Sls U - PostMD"  ,
						w_sls_units_op as "OP W Sls U"  ,
						pre_md_written_units_op as "OP W Sls U - PreMD"  ,
						post_md_written_units_op as "OP W Sls U - PostMD"  ,
						w_sls_units_wp_op_var as "WP W Sls U Var to OP"  ,
						pre_md_w_sls_units_wp_op_var as "WP W Sls U - PreMD Var to OP"  ,
						post_md_w_sls_units_wp_op_var as "WP W Sls U - PostMD Var to OP"  ,
						w_sls_units_wp_op_var_perc as "WP W Sls U % Var to OP"  ,
						pre_md_w_sls_units_wp_op_var_perc as "WP W Sls U - PreMD % Var to OP"  ,
						post_md_w_sls_units_wp_op_var_perc as "WP W Sls U - PostMD % Var to OP"  ,
						w_sls_units_ly as "LY W Sls U"  ,
						pre_md_written_units_ly as "LY W Sls U - PreMD"  ,
						post_md_written_units_ly as "LY W Sls U - PostMD"  ,
						w_sls_units_wp_ly_var as "WP W Sls U Var to LY"  ,
						pre_md_w_sls_units_wp_ly_var as "WP W Sls U - PreMD Var to LY"  ,
						post_md_w_sls_units_wp_ly_var as "WP W Sls U - PostMD Var to LY"  ,
						w_sls_units_wp_ly_var_perc as "WP W Sls U % Var to LY"  ,
						pre_md_w_sls_units_wp_ly_var_perc as "WP W Sls U - PreMD % Var to LY"  ,
						post_md_w_sls_units_wp_ly_var_perc as "WP W Sls U - PostMD % Var to LY"  ,
						written_aur_wp as "WP W AUR"  ,
						w_aur_3m_avg as "3 mo Avg Month W Sls AUR"  ,
						w_aur_6m_avg as "6 mo Avg Month W Sls AUR"  ,
						w_aur_9m_avg as "9 mo Avg Month W Sls AUR"  ,
						written_aur_op as "OP W AUR"  ,
						written_aur_ly as "LY W AUR"  ,
						written_dr_perc_wp as "WP W DR%"  ,
						written_dr_perc_op as "OP W DR%"  ,
						written_dr_perc_ly as "LY W DR%"  ,
						w_gm_dollars_wp as "WP W GM $"  ,
						written_gm_perc_wp as "WP W GM %"  ,
						w_gm_dollars_op as "OP W GM $"  ,
						written_gm_perc_op as "OP W GM %"  ,
						w_gm_dollars_wp_op_var as "WP W GM $ Var to OP"  ,
						w_gm_perc_wp_op_var as "WP W GM % Var to OP"  ,
						w_gm_dollars_wp_op_var_perc as "WP W GM $ % Var to OP"  ,
						w_gm_dollars_ly as "LY W GM $"  ,
						written_gm_perc_ly as "LY W GM %"  ,
						w_gm_dollars_wp_ly_var as "WP W GM $ Var to LY"  ,
						w_gm_perc_wp_ly_var as "WP W GM % Var to LY"  ,
						w_gm_dollars_wp_ly_var_perc as "WP W GM $ % Var to LY"  ,
						aoh_fwos_units_wp as "WP AOH FWOS U"  ,
						aoh_fwos_units_op as "OP AOH FWOS U"  ,
						aoh_fwos_units_ly as "LY AOH FWOS U"  ,
						total_receipt_units_wp as "WP Ttl Rcpt U"  ,
						total_receipt_units_op as "OP Ttl Rcpt U"  ,
						total_receipt_units_wp_op_var as "WP Ttl Rcpt U Var to OP"  ,
						total_receipt_units_wp_op_var_perc as "OP Ttl Rcpt U % Var to OP"  ,
						total_receipt_units_ly as "LY Ttl Rcpt U"  ,
						total_receipt_units_wp_ly_var as "WP Ttl Rcpt U Var to LY"  ,
						total_receipt_units_wp_ly_var_perc as "WP Ttl Rcpt U % Var to LY"  ,
						on_order_placed_total_unit_wp as "WP OO U (TTL-P)"  ,
						on_order_placed_total_unit_op as "OP OO U (TTL-P)"  ,
						on_order_placed_total_unit_wp_op_var as "WP OO U (TTL-P) Var to OP"  ,
						on_order_placed_total_unit_wp_op_var_perc as "OP OO U (TTL-P) % Var to OP"  ,
						on_order_placed_total_unit_ly as "LY OO U (TTL-P)"  ,
						on_order_placed_total_unit_wp_ly_var as "WP OO U (TTL-P) Var to LY"  ,
						on_order_placed_total_unit_wp_ly_var_perc as "WP OO U (TTL-P) % Var to LY"  ,
						atp_units_wp as "WP ATP U"  ,
						atp_fwos_units_wp as "WP ATP FWOS U"  ,
						atp_units_op as "OP ATP U"  ,
						atp_fwos_units_op as "OP ATP FWOS U"  ,
						atp_units_ly as "LY ATP U"  ,
						atp_fwos_units_ly as "LY ATP FWOS U"  ,
						d_sls_dollars_wp as "WP D Sls $"  ,
						d_sls_dollars_op as "OP D Sls $"  ,
						d_sls_dollars_wp_op_var as "WP Var to OP D Sls $"  ,
						d_sls_dollars_wp_op_var_perc as "WP % Var to OP D Sls $"  ,
						d_sls_dollars_ly as "LY D Sls $"  ,
						d_sls_dollars_wp_ly_var as "WP Var to LY D Sls $"  ,
						d_sls_dollars_wp_ly_var_perc as "WP % Var to LY D Sls $"  ,
						d_sls_units_wp as "WP D Sls U"  ,
						d_sls_units_op as "OP D Sls U"  ,
						d_sls_units_wp_op_var as "WP Var to OP D Sls U"  ,
						d_sls_units_wp_op_var_perc as "WP % Var to OP D Sls U"  ,
						d_sls_units_ly as "LY D Sls U"  ,
						d_sls_units_wp_ly_var as "WP Var to LY D Sls U"  ,
						d_sls_units_wp_ly_var_perc as "WP % Var to LY D Sls U"  ,
						delivered_aur_wp as "WP D AUR"  ,
						delivered_aur_op as "OP D AUR"  ,
						delivered_aur_ly as "LY D AUR"  ,
						d_gm_wp as "WP D GM $"  ,
						delivered_gmperc_wp as "WP D GM %"  ,
						d_gm_op as "OP D GM $"  ,
						delivered_gmperc_op as "OP D GM %"  ,
						d_gm_wp_op_var as "WP D GM $ Var to OP"  ,
						d_gm_perc_wp_op_var as "WP D GM % Var to OP"  ,
						d_gm_wp_op_var_perc as "WP D GM $ % Var to OP"  ,
						d_gm_ly as "LY D GM $"  ,
						ly_d_gm_perc as "LY D GM %"  ,
						d_gm_wp_ly_var as "WP D GM $ Var to LY"  ,
						d_gm_perc_wp_ly_var as "WP D GM % Var to LY"  ,
						d_gm_wp_ly_var_perc as "WP D GM $ % Var to LY"  ,
						eop_units_wp as "WP EOP U"  ,
						eop_units_op as "OP EOP U"  ,
						eop_units_wp_op_var as "WP Var to OP EOP U"  ,
						eop_units_wp_op_var_perc as "WP % Var to OP EOP U"  ,
						eop_units_ly as "LY EOP U"  ,
						eop_units_wp_ly_var as "WP Var to LY EOP U"  ,
						eop_units_wp_ly_var_perc as "WP % Var to LY EOP U"  
						from report_final		
						; ' ;
	RAISE NOTICE 'final_query: %', _query_combine;
	OPEN $1 FOR execute _query_combine;
	RETURN $1;
		
END;
$function$; 