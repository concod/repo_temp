
--liquibase formatted sql
--changeset shaik.azmathulla:fn_get_summarized_multi_dept_report_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-66550 -Corrected the missed changes
--comment: Corrected the missed changes      

DROP FUNCTION IF EXISTS item_smart.fn_get_summarized_multi_dept_report;

CREATE OR REPLACE FUNCTION item_smart.fn_get_summarized_multi_dept_report(input refcursor, sdate date, tdate date, report_type text, dept_name text, coll_name text, ven_name text, cls_name text, fis_year integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$

/*
 * Function/Procedure name: inventory_smart.fn_get_summarized_multi_dept_report
 * Created by: Shaik Azmathulla
 * Modified by: Hari krishna 
 * Created at: 18-Dec-2024
 * No of input parameter: 8
 * Parameter Description : 
 * 
 * Purpose: This function been created to get the summarized report.
 * Calling Statement:
		 select * from item_smart.fn_get_summarized_multi_dept_report
				('test',
				 '2024-01-01',
				 '2025-12-17',
				 'sku_pre_md',
				 ' ''SOFT GOODS'',''ACCESSORY'' ',
				 ' ''HONEYCOMB'' ',
				 ' ''MONSOON IMPEX PRIVATE LTD'' ',
				 ' ''ACCENT PILLOWS'' ',
				 2025
				 );
				fetch all in "test";
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by        Updated_on      Purpose
 * ----------        -----------     --------
 * Shaik Azmathulla   06th Jan,2025  MTP-66550: Optimize Single Dept Rollup Queries
 */
	DECLARE
		sweek int;
		tweek int;
		_query_combine text;
		col_name text;
		dept_list text;
		union_sql text := '';
		wp_union_sql text := '';
		op_union_sql text := '';
		dept_array text[]; 
		dept_name_1 text;
	BEGIN

		DROP TABLE IF EXISTS mv_product_hierarchies_filter_temp;
		DROP TABLE IF EXISTS fiscal_date_mapping_temp;
		DROP TABLE IF EXISTS itemfact_sku_temp;

		
		IF report_type IN('collection','sku_total','sku_pre_md','total','class') THEN
        	col_name := 'collection_name';
	    ELSIF report_type = 'class' THEN
	        col_name := 'l3_name';
	    ELSIF report_type = 'lifestyle' THEN
	        col_name := 'lifestyle';
	    ELSIF report_type = 'division' THEN
	        col_name := 'l1_name';
	    END IF;
		
		RAISE NOTICE 'Selected col_name: %', col_name;
	

dept_array := ARRAY(
    SELECT lower(trim(both ' '' ' FROM unnest(string_to_array(dept_name, ','))))
);

-- FOREACH dept_name_1 IN ARRAY dept_array LOOP
--   --  RAISE NOTICE 'Processing dept: %', dept_name;
--     union_sql := union_sql || format(
--         'SELECT * FROM item_smart.itemfact_sku_week_%I', replace(lower(dept_name_1), ' ', '')
--     ) || ' UNION ALL ';

--  wp_union_sql := wp_union_sql || format(
--         'SELECT * FROM item_smart.wp_master_%I', replace(lower(dept_name_1), ' ', '')
--     ) || ' UNION ALL ';

--  op_union_sql := op_union_sql || format(
--         'SELECT * FROM item_smart.op_master_%I', replace(lower(dept_name_1), ' ', '')
--     ) || ' UNION ALL ';

-- END LOOP;
-- union_sql := left(union_sql, length(union_sql) - 11);
-- wp_union_sql:= left(wp_union_sql, length(wp_union_sql) - 11);
-- op_union_sql:= left(op_union_sql, length(op_union_sql) - 11);

		IF report_type in('dept','total','division','collection','class') THEN
		
		_query_combine:='
				CREATE TEMP TABLE  fiscal_date_mapping_temp AS
					SELECT  distinct fiscal_year_week, 
							fiscal_year, fiscal_month, fiscal_week, 0 as sweek,0 as tweek
					FROM "global".fiscal_date_mapping 
					WHERE	fiscal_year = '||fis_year ||';

					CREATE INDEX idx_fiscal_date_mapping_temp ON fiscal_date_mapping_temp (fiscal_year_week); 
					
				CREATE TEMP TABLE  itemfact_sku_temp AS
					SELECT markdown_date, hierarchy_code,dept,launch_date,exit_date
					FROM item_smart.itemfact_sku 
					WHERE dept IN ('||dept_name ||') ;
			
					CREATE INDEX idx_itemfact_sku_temp ON itemfact_sku_temp (hierarchy_code); ';

		ELSE
		
		_query_combine:= '
					CREATE TEMP TABLE mv_product_hierarchies_filter_temp AS
					SELECT 	'||col_name ||',markdown_date,hierarchy_code,vendor_name,l2_name,launch_date,exit_date,dpt_name,class_name,
							product_code,
 REGEXP_REPLACE(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(
                        REGEXP_REPLACE(
                            REGEXP_REPLACE(
                                REGEXP_REPLACE(
                                    REGEXP_REPLACE(
                                        REGEXP_REPLACE(
                                            REGEXP_REPLACE(
                                                REGEXP_REPLACE(
                                                    REGEXP_REPLACE(
                                                        REGEXP_REPLACE(
                                                            REGEXP_REPLACE(
                                                                REGEXP_REPLACE(
                                                                    product_description,
                                                                    ''__ia_char_01'', ''A'', ''g''
                                                                ),
                                                                ''__ia_char_02'', ''&'', ''g''
                                                            ),
                                                            ''__ia_char_03'', ''B'', ''g''
                                                        ),
                                                        ''__ia_char_04'', ''-'', ''g''
                                                    ),
                                                    ''__ia_char_05'', ''C'', ''g''
                                                ),
                                                ''__ia_char_06'', ''D'', ''g''
                                            ),
                                            ''__ia_char_07'', ''E'', ''g''
                                        ),
                                        ''__ia_char_08'', ''F'', ''g''
                                    ),
                                    ''__ia_char_09'', ''G'', ''g''
                                ),
                                ''__ia_char_10'', ''H'', ''g''
                            ),
                            ''__ia_char_11'', ''I'', ''g''
                        ),
                        ''__ia_char_12'', ''J'', ''g''
                    ),
                    ''__ia_char_13'', ''K'', ''g''
                ),
                ''__ia_char_14'', ''L'', ''g''
            ),
            ''__ia_char_15'', ''M'', ''g''
        ),
        ''__ia_char_16'', ''N'', ''g''
    ) AS product_description ,kit_status,purchase_status '
							|| CASE WHEN report_type not in ('collection','sku_total','sku_pre_md') THEN ', collection_name' 
									WHEN report_type not in ('lifestyle') THEN ', lifestyle' 
							  ELSE '' END || '
					FROM 	item_smart.mv_product_hierarchies_filter 
					WHERE	1=1 and ' ||
        				CASE WHEN report_type = 'class' THEN 
                			'l3_name IN (' || coll_name || ') AND vendor_name IN (' || ven_name || ')'
							WHEN report_type = 'sku_pre_md' THEN
							'collection_name IN (' || coll_name || ') AND vendor_name IN (' || ven_name || ') AND class_name IN (' || cls_name || ')'
            			ELSE 
                			'collection_name IN (' || coll_name || ') AND vendor_name IN (' || ven_name || ')'
        				END ||';
			
					CREATE INDEX idx_mv_product_hierarchies_filter_temp ON mv_product_hierarchies_filter_temp (' || col_name || ',vendor_name,hierarchy_code);
		
					CREATE TEMP TABLE  fiscal_date_mapping_temp AS
					SELECT  distinct fiscal_year_week, 
							fiscal_year, fiscal_month, fiscal_week
					FROM "global".fiscal_date_mapping 
					WHERE	calendar_date between '''||sdate ||''' and '''||tdate ||''' ;

					CREATE INDEX idx_fiscal_date_mapping_temp ON fiscal_date_mapping_temp (fiscal_year_week); 
			
					CREATE TEMP TABLE  itemfact_sku_temp AS
					SELECT markdown_date, hierarchy_code,dept,launch_date,exit_date
					FROM item_smart.itemfact_sku 
					WHERE dept IN ('||dept_name ||') ;
			
					CREATE INDEX idx_itemfact_sku_temp ON itemfact_sku_temp (hierarchy_code); ';

		END IF;
		
		RAISE NOTICE 'temp query: %', _query_combine;
		execute _query_combine;

		SELECT min(fiscal_year_week) AS sweek,max(fiscal_year_week) as tweek 
		INTO sweek,tweek
		FROM fiscal_date_mapping_temp WHERE 1 = 1 LIMIT 1;

		RAISE NOTICE 'Start week: %, End week: %', sweek, tweek;

		FOREACH dept_name_1 IN ARRAY dept_array LOOP
		  --  RAISE NOTICE 'Processing dept: %', dept_name;
		    union_sql := union_sql || format(
		        'SELECT * FROM item_smart.itemfact_sku_week_%I where current_week between  '||sweek ||' and '||tweek , replace(lower(dept_name_1), ' ', '')
		    ) || ' UNION ALL ';
		
		 wp_union_sql := wp_union_sql || format(
		        'SELECT * FROM item_smart.wp_master_%I where current_week between  '||sweek ||' and '||tweek , replace(lower(dept_name_1), ' ', '')
		    ) || ' UNION ALL ';
		
		 op_union_sql := op_union_sql || format(
		        'SELECT * FROM item_smart.op_master_%I where current_week between  '||sweek ||' and '||tweek , replace(lower(dept_name_1), ' ', '')
		    ) || ' UNION ALL ';
		
		END LOOP;
		
		union_sql := left(union_sql, length(union_sql) - 11);
		wp_union_sql:= left(wp_union_sql, length(wp_union_sql) - 11);
		op_union_sql:= left(op_union_sql, length(op_union_sql) - 11);

		raise notice 'union_sql:%',union_sql;
		raise notice 'wp_union_sql:%',wp_union_sql;
		raise notice 'op_union_sql:%',op_union_sql;
		_query_combine:= '';

		IF report_type in('dept') THEN

			_query_combine := 'WITH wp_base_data AS (
					    SELECT 
					        mv.l1_name AS Division,
					        wm.dept,
					        collection_name AS collection,
					        channel,
					        wm.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
  							-- (
   						-- 	 SELECT SUM((value)::INT)
   						-- 	 FROM json_each_text(isku.tier_store_count::json)
  							-- ) AS store_count,
							CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					     --  store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM (' || wp_union_sql || ')  wm
					    left join (' || union_sql || ') isku on wm.hierarchy_code=isku.hierarchy_code and wm.current_week=isku.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
					    WHERE wm.dept IN ('||dept_name ||') and fiscal_year = '||fis_year ||'
						AND wm.current_week between '||sweek ||' and '||tweek ||' and channel<>''Warehouse''
					), 
					wp_data as (SELECT
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					   -- count(distinct hierarchy_code) cnt_hierarchy,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    wp_aoh_units,
					    wp_atp_units,
					    wp_eop_cost,
					    wp_eop_units,
					    COUNT(DISTINCT (fiscal_year, fiscal_month)) AS no_of_months,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    AVG(store_count) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM wp_base_data
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
					), wp_agg as (select dept, channel, fiscal_year as year, fiscal_month as month, no_of_months,
					wp_aoh_units, wp_atp_units, wp_eop_cost, wp_eop_units,
					avg(store_count) as wp_store_count, count(distinct hierarchy_code) as wp_sku_count, avg(w_air) as wp_w_air, 
					avg(w_auc) as wp_w_auc, avg(w_aur) as wp_w_aur, avg(w_dr_perc) as wp_w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
					nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_sls_units),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
					sum(w_sls_dollars) as wp_w_sls_dollars, avg(w_sls_ecom_perc) as wp_w_sls_ecom_perc, 
					sum(w_sls_units) as wp_w_sls_units, sum(w_gm_dollars) as wp_w_gm_dollars, sum(post_md_written_sales) as wp_post_md_written_sales, 
					sum(pre_md_written_sales) as wp_pre_md_written_sales, sum(post_md_written_units) as wp_post_md_written_units, sum(pre_md_written_units) as wp_pre_md_written_units, 
					sum(d_sls_dollars) as wp_d_sls_dollars, sum(d_sls_units) as wp_d_sls_units, sum(d_gm) as wp_d_gm, avg(d_aur) as wp_d_aur,
					sum(aoh_fwos_units) as wp_aoh_fwos_units, sum(total_receipt_cost) as wp_total_receipt_cost, 
					sum(total_receipt_units) as wp_total_receipt_units, sum(atp_fwos_units) as wp_atp_fwos_units,
					sum(on_order_placed_total_unit) as wp_oo_u_ttl_p
					from wp_data
					group by 1,2,3,4,5,6,7,8,9), wp as (select dept, channel, year, month, wp_store_count, wp_sku_count, w_air, w_auc, w_dr_perc,
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    wp_w_sls_dollars / NULLIF(wp_w_sls_dollars, 0)
					  ELSE 0
					END AS wp_w_sls_ecom_perc,
					wp_pre_md_written_sales, wp_post_md_written_sales, wp_pre_md_written_units, wp_post_md_written_units,
					wp_w_sls_dollars, wp_w_gm_dollars, wp_d_sls_dollars, wp_d_sls_units,no_of_months,
					avg(wp_w_sls_dollars) over
					(partition by dept, channel) as avg_monthly_sls_dollars,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_sls_dollars_3m_avg,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_sls_dollars_6m_avg,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_sls_dollars_9m_avg,
					wp_w_sls_units,
					avg(wp_w_sls_units) over
					(partition by dept, channel) as avg_monthly_sls_units,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_sls_units_3m_avg,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_sls_units_6m_avg,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_sls_units_9m_avg,
					w_aur,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_aur_3m_avg,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_aur_6m_avg,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_aur_9m_avg,
					wp_d_gm, d_aur, wp_aoh_units, wp_aoh_fwos_units, wp_atp_units, wp_atp_fwos_units,
					wp_total_receipt_cost, wp_total_receipt_units, wp_eop_cost, wp_eop_units, wp_oo_u_ttl_p
					from wp_agg), op_base_data AS (
					    SELECT 
					        mv.l1_name AS Division,
					        om.dept,
					        collection_name AS collection,
					        channel,
					        om.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
  							-- (
   						-- 	 SELECT SUM((value)::INT)
   						-- 	 FROM json_each_text(isku.tier_store_count::json)
  							-- ) AS store_count,
							CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					        --store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM (' || op_union_sql || ') om
					    left join (' || union_sql || ') isku on om.hierarchy_code=isku.hierarchy_code and isku.current_week = om.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON om.dept = mv.l2_name AND om.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month, fiscal_week FROM "global".fiscal_date_mapping) fdm ON fdm.fiscal_year_week = om.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON om.hierarchy_code = is2.hierarchy_code AND om.dept = is2.dept
					    WHERE om.dept IN ('||dept_name ||') and fiscal_year = '||fis_year ||'
							AND om.current_week between '||sweek ||' and '||tweek ||' 
					), op_data as (SELECT
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    op_aoh_units,
					    op_atp_units,
					    op_eop_cost,
					    op_eop_units,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    round(SUM(store_count*written_sales_units) / NULLIF(SUM(written_sales_units), 0)) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM op_base_data
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
					), op_agg as (select dept, channel, fiscal_year as year, fiscal_month as month, 
					op_aoh_units, op_atp_units, op_eop_cost, op_eop_units,
					avg(store_count) as op_store_count, count(distinct hierarchy_code) as op_sku_count, avg(w_air) as op_w_air, 
					avg(w_auc) as op_w_auc, avg(w_aur) as op_w_aur, avg(w_dr_perc) as op_w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
					--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
					sum(w_sls_dollars) as op_w_sls_dollars, avg(w_sls_ecom_perc) as op_w_sls_ecom_perc, 
					sum(w_sls_units) as op_w_sls_units, sum(w_gm_dollars) as op_w_gm_dollars, sum(post_md_written_sales) as op_post_md_written_sales, 
					sum(pre_md_written_sales) as op_pre_md_written_sales, sum(post_md_written_units) as op_post_md_written_units, sum(pre_md_written_units) as op_pre_md_written_units, 
					sum(d_sls_dollars) as op_d_sls_dollars, sum(d_sls_units) as op_d_sls_units, sum(d_gm) as op_d_gm, avg(d_aur) as op_d_aur,
					sum(aoh_fwos_units) as op_aoh_fwos_units, sum(atp_fwos_units) as op_atp_fwos_units,
					sum(total_receipt_cost) as op_total_receipt_cost, sum(total_receipt_units) as op_total_receipt_units, 
					sum(on_order_placed_total_unit) as op_oo_u_ttl_p
					from op_data
					group by 1,2,3,4,5,6,7,8), op as (select dept, channel, year, month, op_store_count, op_sku_count, w_air, w_auc, w_dr_perc,
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    op_w_sls_dollars / NULLIF(op_w_sls_dollars, 0)
					  ELSE 0
					END AS op_w_sls_ecom_perc,
					op_pre_md_written_sales, op_post_md_written_sales, op_pre_md_written_units, op_post_md_written_units,
					op_w_sls_dollars, op_w_gm_dollars,op_d_sls_dollars,op_d_sls_units,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_sls_dollars_3m_avg,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_sls_dollars_6m_avg,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_sls_dollars_9m_avg,
					op_w_sls_units,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_sls_units_3m_avg,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_sls_units_6m_avg,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_sls_units_9m_avg,
					op_w_aur,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_aur_3m_avg,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_aur_6m_avg,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_aur_9m_avg,
					op_d_gm, op_d_aur, op_aoh_units, op_aoh_fwos_units, op_atp_units, op_atp_fwos_units, op_total_receipt_cost, 
					op_total_receipt_units, op_eop_cost, op_eop_units, op_oo_u_ttl_p
					from op_agg), ly_base_data AS (
					    SELECT 
					        mv.l1_name AS Division,
					        lm.dept,
					        collection_name AS collection,
					        channel,
					        lm.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ly_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ly_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
  							-- (
   						-- 	 SELECT SUM((value)::INT)
   						-- 	 FROM json_each_text(isku.tier_store_count::json)
  							-- ) AS store_count,
							CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					     --   store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM item_smart.ly_master lm
					    left join (' || union_sql || ') isku on lm.hierarchy_code=isku.hierarchy_code and isku.current_week = lm.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON lm.dept = mv.l2_name AND lm.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month, fiscal_week FROM "global".fiscal_date_mapping) fdm ON fdm.fiscal_year_week = lm.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON lm.hierarchy_code = is2.hierarchy_code AND lm.dept = is2.dept
					    WHERE lm.dept IN ('||dept_name ||') and fiscal_year = '||fis_year ||'
						 AND lm.current_week between '||sweek ||' and '||tweek ||' 
					), ly_data as (SELECT
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    ly_aoh_units,
					    ly_atp_units,
					    ly_eop_cost,
					    ly_eop_units,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    AVG(store_count) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM ly_base_data
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
					), ly_agg as (select dept, channel, fiscal_year as year, fiscal_month as month, 
					ly_aoh_units, ly_atp_units, ly_eop_cost, ly_eop_units,
					avg(store_count) as store_count, count(distinct hierarchy_code) as sku_count, avg(w_air) as w_air, 
					avg(w_auc) as w_auc, avg(w_aur) as w_aur, avg(w_dr_perc) as w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_aur,
					--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_dr_perc,
					sum(w_sls_dollars) as w_sls_dollars, avg(w_sls_ecom_perc) as w_sls_ecom_perc, 
					sum(w_sls_units) as w_sls_units, sum(w_gm_dollars) as w_gm_dollars, sum(post_md_written_sales) as post_md_written_sales, 
					sum(pre_md_written_sales) as pre_md_written_sales, sum(post_md_written_units) as post_md_written_units, sum(pre_md_written_units) as pre_md_written_units, 
					sum(d_sls_dollars) as d_sls_dollars, sum(d_sls_units) as d_sls_units, sum(d_gm) as d_gm, avg(d_aur) as d_aur,
					sum(aoh_fwos_units) as aoh_fwos_units, sum(atp_fwos_units) as atp_fwos_units,
					sum(total_receipt_cost) as total_receipt_cost, sum(total_receipt_units) as total_receipt_units, sum(on_order_placed_total_unit) as oo_u_ttl_p
					from ly_data
					group by 1,2,3,4,5,6,7,8), 
					ly as (select dept, channel, year, month, store_count, sku_count, ly_w_air, ly_w_auc, ly_w_dr_perc, 
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    w_sls_dollars / NULLIF(w_sls_dollars, 0)
					  ELSE 0
					END AS w_sls_ecom_perc,
					pre_md_written_sales, post_md_written_sales, pre_md_written_units, post_md_written_units,
					w_sls_dollars, w_gm_dollars, d_sls_dollars, d_sls_units,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_sls_dollars_3m_avg,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_sls_dollars_6m_avg,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_sls_dollars_9m_avg,
					w_sls_units,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_sls_units_3m_avg,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_sls_units_6m_avg,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_sls_units_9m_avg,
					ly_w_aur,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_aur_3m_avg,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_aur_6m_avg,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_aur_9m_avg,
					d_gm, d_aur, ly_aoh_units, aoh_fwos_units, ly_atp_units, atp_fwos_units,
					total_receipt_cost, total_receipt_units, oo_u_ttl_p, ly_eop_cost, ly_eop_units
					from ly_agg
					), final_data as (select dept, channel, year, month, CAST(COALESCE(wp_store_count, 0) AS INT) AS wp_store_count,
					CAST(wp_sku_count AS INT) AS wp_sku_count, wp.w_air, wp.w_auc,
					no_of_months, avg_monthly_sls_dollars, wp_w_sls_dollars_3m_avg, wp_w_sls_dollars_6m_avg, wp_w_sls_dollars_9m_avg,
					avg_monthly_sls_units, wp_w_sls_units_3m_avg, wp_w_sls_units_6m_avg, wp_w_sls_units_9m_avg,
					wp_w_sls_dollars, wp_pre_md_written_sales, wp_post_md_written_sales, 
					wp_w_sls_ecom_perc, op_w_sls_dollars, op_pre_md_written_sales, op_post_md_written_sales,
					op_w_sls_ecom_perc, (wp_w_sls_dollars - op_w_sls_dollars) as w_sls_dollars_wp_op_var,
					(wp_pre_md_written_sales - op_pre_md_written_sales) as pre_md_w_sls_dollars_wp_op_var,
					(wp_post_md_written_sales - op_post_md_written_sales) as post_md_w_sls_dollars_wp_op_var,
					(wp_w_sls_dollars - op_w_sls_dollars) / NULLIF(op_w_sls_dollars, 0) as w_sls_dollars_wp_op_var_perc,
					(wp_pre_md_written_sales - op_pre_md_written_sales) / NULLIF(op_pre_md_written_sales, 0) as pre_md_w_sls_dollars_wp_op_var_perc,
					(wp_post_md_written_sales - op_post_md_written_sales) / NULLIF(op_post_md_written_sales, 0) as post_md_w_sls_dollars_wp_op_var_perc,
					ly.w_sls_dollars as ly_w_sls_dollars, ly.pre_md_written_sales as ly_pre_md_written_sales, ly.post_md_written_sales as ly_post_md_written_sales,
					ly.w_sls_ecom_perc as ly_w_sls_ecom_perc, (wp_w_sls_dollars - ly.w_sls_dollars) as w_sls_dollars_wp_ly_var,
					(wp_pre_md_written_sales - ly.pre_md_written_sales) as pre_md_w_sls_dollars_wp_ly_var,
					(wp_post_md_written_sales - ly.post_md_written_sales) as post_md_w_sls_dollars_wp_ly_var,
					(wp_w_sls_dollars - ly.w_sls_dollars) / NULLIF(ly.w_sls_dollars, 0) as w_sls_dollars_wp_ly_var_perc,
					(wp_pre_md_written_sales - ly.pre_md_written_sales) / NULLIF(ly.pre_md_written_sales, 0) as pre_md_w_sls_dollars_wp_ly_var_perc,
					(wp_post_md_written_sales - ly.post_md_written_sales) / NULLIF(ly.post_md_written_sales, 0) as post_md_w_sls_dollars_wp_ly_var_perc,
					wp_w_sls_units, wp_pre_md_written_units, wp_post_md_written_units,
					op_w_sls_units, op_pre_md_written_units, op_post_md_written_units,
					(wp_w_sls_units - op_w_sls_units) as w_sls_units_wp_op_var,
					(wp_pre_md_written_units - op_pre_md_written_units) as pre_md_w_sls_units_wp_op_var,
					(wp_post_md_written_units - op_post_md_written_units) as post_md_w_sls_units_wp_op_var,
					(wp_w_sls_units - op_w_sls_units) / NULLIF(op_w_sls_units, 0) as w_sls_units_wp_op_var_perc,
					(wp_pre_md_written_units - op_pre_md_written_units) / NULLIF(op_pre_md_written_units, 0) as pre_md_w_sls_units_wp_op_var_perc,
					(wp_post_md_written_units - op_post_md_written_units) / NULLIF(op_post_md_written_units, 0) as post_md_w_sls_units_wp_op_var_perc,
					ly.w_sls_units as ly_w_sls_units, ly.pre_md_written_units as ly_pre_md_written_units, ly.post_md_written_units as ly_post_md_written_units,
					(wp_w_sls_units - ly.w_sls_units) as w_sls_units_wp_ly_var,
					(wp_pre_md_written_units - ly.pre_md_written_units) as pre_md_w_sls_units_wp_ly_var,
					(wp_post_md_written_units - ly.post_md_written_units) as post_md_w_sls_units_wp_ly_var,
					(wp_w_sls_units - ly.w_sls_dollars) / NULLIF(ly.w_sls_units, 0) as w_sls_units_wp_ly_var_perc,
					(wp_pre_md_written_units - ly.pre_md_written_units) / NULLIF(ly.pre_md_written_units, 0) as pre_md_w_sls_units_wp_ly_var_perc,
					(wp_post_md_written_units - ly.post_md_written_units) / NULLIF(ly.post_md_written_units, 0) as post_md_w_sls_units_wp_ly_var_perc,
					wp.w_aur, wp_w_aur_3m_avg, wp_w_aur_6m_avg, wp_w_aur_9m_avg, op_w_aur, ly_w_aur,
					wp.w_dr_perc as wp_w_dr_perc, op.w_dr_perc as op_w_dr_perc, ly_w_dr_perc,
					wp_w_gm_dollars, NULLIF(wp_w_gm_dollars, 0) / NULLIF(wp_w_sls_dollars, 0) as wp_w_gm_perc, 
					op_w_gm_dollars, NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0) as op_w_gm_perc,
					(wp_w_gm_dollars - op_w_gm_dollars) as w_gm_dollars_wp_op_var,
					((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)))/(NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)) as w_gm_perc_wp_op_var,
					(wp_w_gm_dollars - op_w_gm_dollars) / NULLIF(op_w_gm_dollars, 0) as w_gm_dollars_wp_op_var_perc,
					ly.w_gm_dollars as ly_w_gm_dollars, NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0) as ly_w_gm_perc,
					(wp_w_gm_dollars - ly.w_gm_dollars) as w_gm_dollars_wp_ly_var,
					((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0)))/(NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0)) as w_gm_perc_wp_ly_var,
					(wp_w_gm_dollars - ly.w_gm_dollars) / NULLIF(ly.w_gm_dollars, 0) as w_gm_dollars_wp_ly_var_perc,
					wp_aoh_units, wp_aoh_fwos_units, op_aoh_units, op_aoh_fwos_units,
					ly_aoh_units, ly.aoh_fwos_units as ly_aoh_fwos_units,
					wp_total_receipt_units, op_total_receipt_units, 
					(wp_total_receipt_units - op_total_receipt_units) as total_receipt_units_wp_op_var,
					(wp_total_receipt_units - op_total_receipt_units) / NULLIF(op_total_receipt_units, 0) as total_receipt_units_wp_op_var_perc,
					ly.total_receipt_units as ly_total_receipt_units,
					(wp_total_receipt_units - ly.total_receipt_units) as total_receipt_units_wp_ly_var,
					(wp_total_receipt_units - ly.total_receipt_units) / NULLIF(ly.total_receipt_units, 0) as total_receipt_units_wp_ly_var_perc,
					wp_oo_u_ttl_p, op_oo_u_ttl_p,
					(wp_oo_u_ttl_p - op_oo_u_ttl_p) as oo_u_ttl_p_wp_op_var,
					(wp_oo_u_ttl_p - op_oo_u_ttl_p)/NULLIF(op_oo_u_ttl_p, 0) as oo_u_ttl_p_wp_op_var_perc,
					oo_u_ttl_p, (wp_oo_u_ttl_p - oo_u_ttl_p) as oo_u_ttl_p_wp_ly_var,
					(wp_oo_u_ttl_p - oo_u_ttl_p)/NULLIF(oo_u_ttl_p, 0) as oo_u_ttl_p_wp_ly_var_perc,
					wp_atp_units, wp_atp_fwos_units, op_atp_units, op_atp_fwos_units, ly_atp_units, ly.atp_fwos_units,
					wp_d_sls_dollars, op_d_sls_dollars,
					(wp_d_sls_dollars - op_d_sls_dollars) as d_sls_dollars_wp_op_var,
					(wp_d_sls_dollars - op_d_sls_dollars)/NULLIF(op_d_sls_dollars, 0) as d_sls_dollars_wp_op_var_perc,
					ly.d_sls_dollars, 
					(wp_d_sls_dollars - ly.d_sls_dollars) as d_sls_dollars_wp_ly_var,
					(wp_d_sls_dollars - ly.d_sls_dollars)/NULLIF(ly.d_sls_dollars, 0) as d_sls_dollars_wp_ly_var_perc,
					wp_d_sls_units, op_d_sls_units,
					(wp_d_sls_units - op_d_sls_units) as d_sls_units_wp_op_var,
					(wp_d_sls_units - op_d_sls_units)/NULLIF(op_d_sls_units, 0) as d_sls_units_wp_op_var_perc,
					ly.d_sls_units, 
					(wp_d_sls_units - ly.d_sls_units) as d_sls_units_wp_ly_var,
					(wp_d_sls_units - ly.d_sls_units)/NULLIF(ly.d_sls_units, 0) as d_sls_units_wp_ly_var_perc,
					wp.d_aur as wp_d_aur, op_d_aur, ly.d_aur as ly_d_aur,
					wp_d_gm, NULLIF(wp_d_gm, 0) / NULLIF(wp_d_sls_dollars, 0) as wp_d_gm_perc, 
					op_d_gm, NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0) as op_d_gm_perc,
					(wp_d_gm - op_d_gm) as d_gm_wp_op_var,
					((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)))/(NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)) as d_gm_perc_wp_op_var,
					(wp_d_gm - op_d_gm) / NULLIF(op_d_gm, 0) as d_gm_wp_op_var_perc,
					ly.d_gm as ly_d_gm, NULLIF(ly.d_gm, 0) / NULLIF(ly.w_sls_dollars, 0) as ly_d_gm_perc,
					(wp_d_gm - ly.d_gm) as d_gm_wp_ly_var,
					((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(ly.d_gm, 0) / NULLIF(ly.d_sls_dollars, 0)))/(NULLIF(ly.d_gm, 0) / NULLIF(ly.d_sls_dollars, 0)) as d_gm_perc_wp_ly_var,
					(wp_d_gm - ly.d_gm) / NULLIF(ly.d_gm, 0) as d_gm_wp_ly_var_perc,
					wp_eop_cost, op_eop_cost,
					(wp_eop_cost - op_eop_cost) as eop_cost_wp_op_var,
					(wp_eop_cost - op_eop_cost) / NULLIF(op_eop_cost, 0) as eop_cost_wp_op_var_perc,
					ly_eop_cost,
					(wp_eop_cost - ly_eop_cost) as eop_cost_wp_ly_var,
					(wp_eop_cost - ly_eop_cost) / NULLIF(ly_eop_cost, 0) as eop_cost_wp_ly_var_perc,
					wp_eop_units, op_eop_units,
					(wp_eop_units - op_eop_units) as eop_units_wp_op_var,
					(wp_eop_units - op_eop_units) / NULLIF(op_eop_units, 0) as eop_units_wp_op_var_perc,
					ly_eop_units,
					(wp_eop_units - ly_eop_units) as eop_units_wp_ly_var,
					(wp_eop_units - ly_eop_units) / NULLIF(ly_eop_units, 0) as eop_units_wp_ly_var_perc
					from wp
					left join op using (dept, channel, year, month)
					left join ly using (dept, channel, year, month)
					order by year, month), omni_channel AS (
					    SELECT
					        dept,
					        ''Omni'' AS channel,
					        year,
					        month,
					        CAST(COALESCE(SUM(wp_store_count), 0) AS INT) AS wp_store_count,
					CAST(COALESCE(SUM(wp_sku_count), 0)AS INT) AS wp_sku_count,
					COALESCE(AVG(w_air), 0) AS w_air,
					COALESCE(AVG(w_auc), 0) AS w_auc,
					COALESCE(MAX(no_of_months), 0) AS no_of_months,
					COALESCE(SUM(avg_monthly_sls_dollars), 0) AS avg_monthly_sls_dollars,
					COALESCE(AVG(wp_w_sls_dollars_3m_avg), 0) AS wp_w_sls_dollars_3m_avg,
					COALESCE(AVG(wp_w_sls_dollars_6m_avg), 0) AS wp_w_sls_dollars_6m_avg,
					COALESCE(AVG(wp_w_sls_dollars_9m_avg), 0) AS wp_w_sls_dollars_9m_avg,
					COALESCE(SUM(avg_monthly_sls_units), 0) AS avg_monthly_sls_units,
					COALESCE(AVG(wp_w_sls_units_3m_avg), 0) AS wp_w_sls_units_3m_avg,
					COALESCE(AVG(wp_w_sls_units_6m_avg), 0) AS wp_w_sls_units_6m_avg,
					COALESCE(AVG(wp_w_sls_units_9m_avg), 0) AS wp_w_sls_units_9m_avg,
					COALESCE(SUM(wp_w_sls_dollars), 0) AS wp_w_sls_dollars,
					COALESCE(SUM(wp_pre_md_written_sales), 0) AS wp_pre_md_written_sales,
					COALESCE(SUM(wp_post_md_written_sales), 0) AS wp_post_md_written_sales,
					COALESCE(SUM(wp_w_sls_ecom_perc * wp_w_sls_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0), 0) AS wp_w_sls_ecom_perc,
					COALESCE(SUM(op_w_sls_dollars), 0) AS op_w_sls_dollars,
					COALESCE(SUM(op_pre_md_written_sales), 0) AS op_pre_md_written_sales,
					COALESCE(SUM(op_post_md_written_sales), 0) AS op_post_md_written_sales,
					COALESCE(SUM(op_w_sls_ecom_perc * op_w_sls_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS op_w_sls_ecom_perc,
					COALESCE(SUM(w_sls_dollars_wp_op_var), 0) AS w_sls_dollars_wp_op_var,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var), 0) AS pre_md_w_sls_dollars_wp_op_var,
					COALESCE(SUM(post_md_w_sls_dollars_wp_op_var), 0) AS post_md_w_sls_dollars_wp_op_var,
					COALESCE(SUM(w_sls_dollars_wp_op_var) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var) / NULLIF(SUM(op_pre_md_written_sales), 0), 0) AS pre_md_w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(post_md_w_sls_dollars_wp_op_var) / NULLIF(SUM(op_post_md_written_sales), 0), 0) AS post_md_w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(ly_w_sls_dollars), 0) AS ly_w_sls_dollars,
					COALESCE(SUM(ly_pre_md_written_sales), 0) AS ly_pre_md_written_sales,
					COALESCE(SUM(ly_post_md_written_sales), 0) AS ly_post_md_written_sales,
					COALESCE(SUM(ly_w_sls_ecom_perc * ly_w_sls_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS ly_w_sls_ecom_perc,
					COALESCE(SUM(w_sls_dollars_wp_ly_var), 0) AS w_sls_dollars_wp_ly_var,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var), 0) AS pre_md_w_sls_dollars_wp_ly_var,
					COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var), 0) AS post_md_w_sls_dollars_wp_ly_var,
					COALESCE(SUM(w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_pre_md_written_sales), 0), 0) AS pre_md_w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_post_md_written_sales), 0), 0) AS post_md_w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_w_sls_units), 0) AS wp_w_sls_units,
					COALESCE(SUM(wp_pre_md_written_units), 0) AS wp_pre_md_written_units,
					COALESCE(SUM(wp_post_md_written_units), 0) AS wp_post_md_written_units,
					COALESCE(SUM(op_w_sls_units), 0) AS op_w_sls_units,
					COALESCE(SUM(op_pre_md_written_units), 0) AS op_pre_md_written_units,
					COALESCE(SUM(op_post_md_written_units), 0) AS op_post_md_written_units,
					COALESCE(SUM(w_sls_units_wp_op_var), 0) AS w_sls_units_wp_op_var,
					COALESCE(SUM(pre_md_w_sls_units_wp_op_var), 0) AS pre_md_w_sls_units_wp_op_var,
					COALESCE(SUM(post_md_w_sls_units_wp_op_var), 0) AS post_md_w_sls_units_wp_op_var,
					COALESCE(SUM(w_sls_units_wp_op_var) / NULLIF(SUM(op_w_sls_units), 0), 0) AS w_sls_units_wp_op_var_perc,
					COALESCE(SUM(pre_md_w_sls_units_wp_op_var) / NULLIF(SUM(op_pre_md_written_units), 0), 0) AS pre_md_w_sls_units_wp_op_var_perc,
					COALESCE(SUM(post_md_w_sls_units_wp_op_var) / NULLIF(SUM(op_post_md_written_units), 0), 0) AS post_md_w_sls_units_wp_op_var_perc,
					COALESCE(SUM(ly_w_sls_units), 0) AS ly_w_sls_units,
					COALESCE(SUM(ly_pre_md_written_units), 0) AS ly_pre_md_written_units,
					COALESCE(SUM(ly_post_md_written_units), 0) AS ly_post_md_written_units,
					COALESCE(SUM(w_sls_units_wp_ly_var), 0) AS w_sls_units_wp_ly_var,
					COALESCE(SUM(pre_md_w_sls_units_wp_ly_var), 0) AS pre_md_w_sls_units_wp_ly_var,
					COALESCE(SUM(post_md_w_sls_units_wp_ly_var), 0) AS post_md_w_sls_units_wp_ly_var,
					COALESCE(SUM(w_sls_units_wp_ly_var) / NULLIF(SUM(ly_w_sls_units), 0), 0) AS w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(pre_md_w_sls_units_wp_ly_var) / NULLIF(SUM(ly_pre_md_written_units), 0), 0) AS pre_md_w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(post_md_w_sls_units_wp_ly_var) / NULLIF(SUM(ly_post_md_written_units), 0), 0) AS post_md_w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(wp_w_sls_dollars) / NULLIF(SUM(wp_w_sls_units), 0), 0) AS w_aur,
					COALESCE(AVG(wp_w_aur_3m_avg), 0) AS wp_w_aur_3m_avg,
					COALESCE(AVG(wp_w_aur_6m_avg), 0) AS wp_w_aur_6m_avg,
					COALESCE(AVG(wp_w_aur_9m_avg), 0) AS wp_w_aur_9m_avg,
					COALESCE(SUM(op_w_sls_dollars) / NULLIF(SUM(op_w_sls_units), 0), 0) AS op_w_aur,
					COALESCE(SUM(ly_w_sls_dollars) / NULLIF(SUM(ly_w_sls_units), 0), 0) AS ly_w_aur,
					COALESCE(AVG(wp_w_dr_perc), 0) AS wp_w_dr_perc,
					COALESCE(AVG(op_w_dr_perc), 0) AS op_w_dr_perc,
					COALESCE(AVG(ly_w_dr_perc), 0) AS ly_w_dr_perc,
					COALESCE(SUM(wp_w_gm_dollars), 0) AS wp_w_gm_dollars,
					COALESCE(SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0), 0) AS wp_w_gm_perc,
					COALESCE(SUM(op_w_gm_dollars), 0) AS op_w_gm_dollars,
					COALESCE(SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS op_w_gm_perc,
					COALESCE(SUM(w_gm_dollars_wp_op_var), 0) AS w_gm_dollars_wp_op_var,
					COALESCE((SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0) - SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0)) / NULLIF(SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0), 0) AS w_gm_perc_wp_op_var,
					COALESCE(SUM(w_gm_dollars_wp_op_var) / NULLIF(SUM(op_w_gm_dollars), 0), 0) AS w_gm_dollars_wp_op_var_perc,
					COALESCE(SUM(ly_w_gm_dollars), 0) AS ly_w_gm_dollars,
					COALESCE(SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS ly_w_gm_perc,
					COALESCE(SUM(w_gm_dollars_wp_ly_var), 0) AS w_gm_dollars_wp_ly_var,
					COALESCE((SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0) - SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0)) / NULLIF(SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0), 0) AS w_gm_perc_wp_ly_var,
					COALESCE(SUM(w_gm_dollars_wp_ly_var) / NULLIF(SUM(ly_w_gm_dollars), 0), 0) AS w_gm_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_aoh_units), 0) AS wp_aoh_units,
					COALESCE(SUM(wp_aoh_fwos_units), 0) AS wp_aoh_fwos_units,
					COALESCE(SUM(op_aoh_units), 0) AS op_aoh_units,
					COALESCE(SUM(op_aoh_fwos_units), 0) AS op_aoh_fwos_units,
					COALESCE(SUM(ly_aoh_units), 0) AS ly_aoh_units,
					COALESCE(SUM(ly_aoh_fwos_units), 0) AS ly_aoh_fwos_units,
					COALESCE(SUM(wp_total_receipt_units), 0) AS wp_total_receipt_units,
					COALESCE(SUM(op_total_receipt_units), 0) AS op_total_receipt_units,
					COALESCE(SUM(total_receipt_units_wp_op_var), 0) AS total_receipt_units_wp_op_var,
					COALESCE(SUM(total_receipt_units_wp_op_var) / NULLIF(SUM(op_total_receipt_units), 0), 0) AS total_receipt_units_wp_op_var_perc,
					COALESCE(SUM(ly_total_receipt_units), 0) AS ly_total_receipt_units,
					COALESCE(SUM(total_receipt_units_wp_ly_var), 0) AS total_receipt_units_wp_ly_var,
					COALESCE(SUM(total_receipt_units_wp_ly_var) / NULLIF(SUM(ly_total_receipt_units), 0), 0) AS total_receipt_units_wp_ly_var_perc,
					COALESCE(SUM(wp_oo_u_ttl_p), 0) AS wp_oo_u_ttl_p,
					COALESCE(SUM(op_oo_u_ttl_p), 0) AS op_oo_u_ttl_p,
					COALESCE(SUM(oo_u_ttl_p_wp_op_var), 0) AS oo_u_ttl_p_wp_op_var,
					COALESCE(SUM(oo_u_ttl_p_wp_op_var) / NULLIF(SUM(op_oo_u_ttl_p), 0), 0) AS oo_u_ttl_p_wp_op_var_perc,
					COALESCE(SUM(oo_u_ttl_p), 0) AS oo_u_ttl_p,
					COALESCE(SUM(oo_u_ttl_p_wp_ly_var), 0) AS oo_u_ttl_p_wp_ly_var,
					COALESCE(SUM(oo_u_ttl_p_wp_ly_var) / NULLIF(SUM(oo_u_ttl_p), 0), 0) AS oo_u_ttl_p_wp_ly_var_perc,
					COALESCE(SUM(wp_atp_units), 0) AS wp_atp_units,
					COALESCE(SUM(wp_atp_fwos_units), 0) AS wp_atp_fwos_units,
					COALESCE(SUM(op_atp_units), 0) AS op_atp_units,
					COALESCE(SUM(op_atp_fwos_units), 0) AS op_atp_fwos_units,
					COALESCE(SUM(ly_atp_units), 0) AS ly_atp_units,
					COALESCE(SUM(atp_fwos_units), 0) AS atp_fwos_units,
					COALESCE(SUM(wp_d_sls_dollars), 0) AS wp_d_sls_dollars,
					COALESCE(SUM(op_d_sls_dollars), 0) AS op_d_sls_dollars,
					COALESCE(SUM(d_sls_dollars_wp_op_var), 0) AS d_sls_dollars_wp_op_var,
					COALESCE(SUM(d_sls_dollars_wp_op_var) / NULLIF(SUM(op_d_sls_dollars), 0), 0) AS d_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(d_sls_dollars), 0) AS d_sls_dollars,
					COALESCE(SUM(d_sls_dollars_wp_ly_var), 0) AS d_sls_dollars_wp_ly_var,
					COALESCE(SUM(d_sls_dollars_wp_ly_var) / NULLIF(SUM(d_sls_dollars), 0), 0) AS d_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_d_sls_units), 0) AS wp_d_sls_units,
					COALESCE(SUM(op_d_sls_units), 0) AS op_d_sls_units,
					COALESCE(SUM(d_sls_units_wp_op_var), 0) AS d_sls_units_wp_op_var,
					COALESCE(SUM(d_sls_units_wp_op_var) / NULLIF(SUM(op_d_sls_units), 0), 0) AS d_sls_units_wp_op_var_perc,
					COALESCE(SUM(d_sls_units), 0) AS d_sls_units,
					COALESCE(SUM(d_sls_units_wp_ly_var), 0) AS d_sls_units_wp_ly_var,
					COALESCE(SUM(d_sls_units_wp_ly_var) / NULLIF(SUM(d_sls_units), 0), 0) AS d_sls_units_wp_ly_var_perc,
					COALESCE(AVG(wp_d_aur), 0) AS wp_d_aur,
					COALESCE(AVG(op_d_aur), 0) AS op_d_aur,
					COALESCE(AVG(ly_d_aur), 0) AS ly_d_aur,
					COALESCE(SUM(wp_d_gm), 0) AS wp_d_gm,
					COALESCE(SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0), 0) AS wp_d_gm_perc,
					COALESCE(SUM(op_d_gm), 0) AS op_d_gm,
					COALESCE(SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0), 0) AS op_d_gm_perc,
					COALESCE(SUM(d_gm_wp_op_var), 0) AS d_gm_wp_op_var,
					COALESCE((SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0) - SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0)) / NULLIF(SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0), 0), 0) AS d_gm_perc_wp_op_var,
					COALESCE(SUM(d_gm_wp_op_var) / NULLIF(SUM(op_d_gm), 0), 0) AS d_gm_wp_op_var_perc,
					COALESCE(SUM(ly_d_gm), 0) AS ly_d_gm,
					COALESCE(SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0), 0) AS ly_d_gm_perc,
					COALESCE(SUM(d_gm_wp_ly_var), 0) AS d_gm_wp_ly_var,
					COALESCE((SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0) - SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0)) / NULLIF(SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0), 0), 0) AS d_gm_perc_wp_ly_var,
					COALESCE(SUM(d_gm_wp_ly_var) / NULLIF(SUM(ly_d_gm), 0), 0) AS d_gm_wp_ly_var_perc,
					COALESCE(SUM(wp_eop_cost), 0) AS wp_eop_cost,
					COALESCE(SUM(op_eop_cost), 0) AS op_eop_cost,
					COALESCE(SUM(eop_cost_wp_op_var), 0) AS eop_cost_wp_op_var,
					COALESCE(SUM(eop_cost_wp_op_var) / NULLIF(SUM(op_eop_cost), 0), 0) AS eop_cost_wp_op_var_perc,
					COALESCE(SUM(ly_eop_cost), 0) AS ly_eop_cost,
					COALESCE(SUM(eop_cost_wp_ly_var), 0) AS eop_cost_wp_ly_var,
					COALESCE(SUM(eop_cost_wp_ly_var) / NULLIF(SUM(ly_eop_cost), 0), 0) AS eop_cost_wp_ly_var_perc,
					COALESCE(SUM(wp_eop_units), 0) AS wp_eop_units,
					COALESCE(SUM(op_eop_units), 0) AS op_eop_units,
					COALESCE(SUM(eop_units_wp_op_var), 0) AS eop_units_wp_op_var,
					COALESCE(SUM(eop_units_wp_op_var) / NULLIF(SUM(op_eop_units), 0), 0) AS eop_units_wp_op_var_perc,
					COALESCE(SUM(ly_eop_units), 0) AS ly_eop_units,
					COALESCE(SUM(eop_units_wp_ly_var), 0) AS eop_units_wp_ly_var,
					COALESCE(SUM(eop_units_wp_ly_var) / NULLIF(SUM(ly_eop_units), 0), 0) AS eop_units_wp_ly_var
					        from final_data
					        group by 1,2,3,4
					        order by year, month
					),final_report as
			(SELECT * from final_data
			union all
			select *from omni_channel
			order by year, month
			)

			Select 
				'||report_type||' as "' || INITCAP(report_type) || '",
				channel as "Channel"  ,
	--	year as "YEAR"  ,
	--	month as "MONTH"  ,
	COALESCE(wp_store_count, 0) as "Store Count"  ,
	COALESCE(wp_sku_count, 0) as "# of SKUs",
	CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_air, 0)::NUMERIC, 2), ''FM999999990.00'')) as "AIR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_auc, 0)::NUMERIC, 2), ''FM999999990.00'')) as "AUC",
COALESCE(no_of_months, 0) as "WP # of Months w/Sls",

CONCAT(''$'', TO_CHAR(ROUND(COALESCE(avg_monthly_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Avg Monthly W Sls$",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_3m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "3 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_6m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "6 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_9m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "9 mo Avg Month W Sls $",
TRUNC(COALESCE(avg_monthly_sls_units, 0)) as "WP Avg Monthly W U Sls",
TRUNC(COALESCE(wp_w_sls_units_3m_avg, 0)) as "3 mo Avg Month W Sls U",
TRUNC(COALESCE(wp_w_sls_units_6m_avg, 0)) as "6 mo Avg Month W Sls U",
TRUNC(COALESCE(wp_w_sls_units_9m_avg, 0)) as "9 mo Avg Month W Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_pre_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_post_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_pre_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_post_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PreMD Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ % Var  to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - PreMD % Var  to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - PostMD % Var  to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_pre_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_post_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PreMD Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - PreMD % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - PostMD % Var to LY",
TRUNC(COALESCE(wp_w_sls_units, 0)) as "WP W Sls U",
TRUNC(COALESCE(wp_pre_md_written_units, 0)) as "WP W Sls U - PreMD",
TRUNC(COALESCE(wp_post_md_written_units, 0)) as "WP W Sls U - PostMD",
TRUNC(COALESCE(op_w_sls_units, 0)) as "OP W Sls U",
TRUNC(COALESCE(op_pre_md_written_units, 0)) as "OP W Sls U - PreMD",
TRUNC(COALESCE(op_post_md_written_units, 0)) as "OP W Sls U - PostMD",
TRUNC(COALESCE(w_sls_units_wp_op_var, 0)) as "WP W Sls U Var to OP",
TRUNC(COALESCE(pre_md_w_sls_units_wp_op_var, 0)) as "WP W Sls U - PreMD Var to OP",
TRUNC(COALESCE(post_md_w_sls_units_wp_op_var, 0)) as "WP W Sls U - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U - PreMD % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U - PostMD % Var to OP",
TRUNC(COALESCE(ly_w_sls_units, 0)) as "LY W Sls U",
TRUNC(COALESCE(ly_pre_md_written_units, 0)) as "LY W Sls U - PreMD",
TRUNC(COALESCE(ly_post_md_written_units, 0)) as "LY W Sls U - PostMD",
TRUNC(COALESCE(w_sls_units_wp_ly_var, 0)) as "WP W Sls U Var to LY",
TRUNC(COALESCE(pre_md_w_sls_units_wp_ly_var, 0)) as "WP W Sls U - PreMD Var to LY",
TRUNC(COALESCE(post_md_w_sls_units_wp_ly_var, 0)) as "WP W Sls U - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U - PreMD % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U - PostMD % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_3m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "3 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_6m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "6 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_9m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "9 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W AUR",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY W DR%",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_perc_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_perc_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM $ % Var to LY",
TRUNC(COALESCE(wp_aoh_units, 0)) as "WP AOH U",
TRUNC(COALESCE(wp_aoh_fwos_units, 0)) as "WP AOH FWOS U",
TRUNC(COALESCE(op_aoh_units, 0)) as "OP AOH U",
TRUNC(COALESCE(op_aoh_fwos_units, 0)) as "OP AOH FWOS U",
TRUNC(COALESCE(ly_aoh_units, 0)) as "LY AOH U",
TRUNC(COALESCE(ly_aoh_fwos_units, 0)) as "LY AOH FWOS U",
TRUNC(COALESCE(wp_total_receipt_units, 0)) as "WP Ttl Rcpt U",
TRUNC(COALESCE(op_total_receipt_units, 0)) as "OP Ttl Rcpt U",
TRUNC(COALESCE(total_receipt_units_wp_op_var, 0)) as "WP Ttl Rcpt U Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(total_receipt_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP Ttl Rcpt U % Var to OP",
TRUNC(COALESCE(ly_total_receipt_units, 0)) as "LY Ttl Rcpt U",
TRUNC(COALESCE(total_receipt_units_wp_ly_var, 0)) as "WP Ttl Rcpt U Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(total_receipt_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP Ttl Rcpt U % Var to LY",
TRUNC(COALESCE(wp_oo_u_ttl_p, 0)) as "WP OO U (TTL-P)",
TRUNC(COALESCE(op_oo_u_ttl_p, 0)) as "OP OO U (TTL-P)",
TRUNC(COALESCE(oo_u_ttl_p_wp_op_var, 0)) as "WP OO U (TTL-P) Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(oo_u_ttl_p_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP OO U (TTL-P) % Var to OP",
TRUNC(COALESCE(oo_u_ttl_p, 0)) as "LY OO U (TTL-P)",
TRUNC(COALESCE(oo_u_ttl_p_wp_ly_var, 0)) as "WP OO U (TTL-P) Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(oo_u_ttl_p_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP OO U (TTL-P) % Var to LY",
TRUNC(COALESCE(wp_atp_units, 0)) as "WP ATP U",
TRUNC(COALESCE(wp_atp_fwos_units, 0)) as "WP ATP FWOS U",
TRUNC(COALESCE(op_atp_units, 0)) as "OP ATP U",
TRUNC(COALESCE(op_atp_fwos_units, 0)) as "OP ATP FWOS U",
TRUNC(COALESCE(ly_atp_units, 0)) as "LY ATP U",
TRUNC(COALESCE(atp_fwos_units, 0)) as "LY ATP FWOS U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to OP D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to LY D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY D Sls $",
TRUNC(COALESCE(wp_d_sls_units, 0)) as "WP D Sls U",
TRUNC(COALESCE(op_d_sls_units, 0)) as "OP D Sls U",
TRUNC(COALESCE(d_sls_units_wp_op_var, 0)) as "WP Var to OP D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP D Sls U",
TRUNC(COALESCE(d_sls_units, 0)) as "LY D Sls U",
TRUNC(COALESCE(d_sls_units_wp_ly_var, 0)) as "WP Var to LY D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY D Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(op_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_gm_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_perc_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_gm_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_perc_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM $ % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(eop_cost_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to OP EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_cost_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(eop_cost_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to LY EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_cost_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY EOP $",
TRUNC(COALESCE(wp_eop_units, 0)) as "WP EOP U",
TRUNC(COALESCE(op_eop_units, 0)) as "OP EOP U",
TRUNC(COALESCE(eop_units_wp_op_var, 0)) as "WP Var to OP EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP EOP U",
TRUNC(COALESCE(ly_eop_units, 0)) as "LY EOP U",
TRUNC(COALESCE(eop_units_wp_ly_var, 0)) as "WP Var to LY EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY EOP U"

			from final_report where channel<>''Warehouse''

			 ;' ;

elsif report_type in('class') THEN

			_query_combine := 'WITH wp_base_data AS (
					    SELECT 
							mv.l3_name as class,
					        mv.l1_name AS Division,
					        wm.dept,
					        collection_name AS collection,
					        channel,
					        wm.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                          CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					     --  store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM (' || wp_union_sql || ')  wm
					    left join (' || union_sql || ') isku on wm.hierarchy_code=isku.hierarchy_code and wm.current_week=isku.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
					    WHERE wm.dept IN ('||dept_name ||') and fiscal_year = '||fis_year ||'
						AND wm.current_week between '||sweek ||' and '||tweek ||' and channel<>''Warehouse''
					
				--	

					), 
					wp_data as (SELECT
						class,
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					   -- count(distinct hierarchy_code) cnt_hierarchy,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    wp_aoh_units,
					    wp_atp_units,
					    wp_eop_cost,
					    wp_eop_units,
					    COUNT(DISTINCT (fiscal_year, fiscal_month)) AS no_of_months,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    AVG(store_count) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM wp_base_data
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,14
					), wp_agg as (select class,dept, channel, fiscal_year as year, fiscal_month as month, no_of_months,
					wp_aoh_units, wp_atp_units, wp_eop_cost, wp_eop_units,
					avg(store_count) as wp_store_count, count(distinct hierarchy_code) as wp_sku_count, avg(w_air) as wp_w_air, 
					avg(w_auc) as wp_w_auc, avg(w_aur) as wp_w_aur, avg(w_dr_perc) as wp_w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
					nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_sls_units),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
					sum(w_sls_dollars) as wp_w_sls_dollars, avg(w_sls_ecom_perc) as wp_w_sls_ecom_perc, 
					sum(w_sls_units) as wp_w_sls_units, sum(w_gm_dollars) as wp_w_gm_dollars, sum(post_md_written_sales) as wp_post_md_written_sales, 
					sum(pre_md_written_sales) as wp_pre_md_written_sales, sum(post_md_written_units) as wp_post_md_written_units, sum(pre_md_written_units) as wp_pre_md_written_units, 
					sum(d_sls_dollars) as wp_d_sls_dollars, sum(d_sls_units) as wp_d_sls_units, sum(d_gm) as wp_d_gm, avg(d_aur) as wp_d_aur,
					sum(aoh_fwos_units) as wp_aoh_fwos_units, sum(total_receipt_cost) as wp_total_receipt_cost, 
					sum(total_receipt_units) as wp_total_receipt_units, sum(atp_fwos_units) as wp_atp_fwos_units,
					sum(on_order_placed_total_unit) as wp_oo_u_ttl_p
					from wp_data
					where class IN (' || cls_name || ')
					group by 1,2,3,4,5,6,7,8,9,10), wp as (select class,dept, channel, year, month, wp_store_count, wp_sku_count, w_air, w_auc, w_dr_perc,
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    wp_w_sls_dollars / NULLIF(wp_w_sls_dollars, 0)
					  ELSE 0
					END AS wp_w_sls_ecom_perc,
					wp_pre_md_written_sales, wp_post_md_written_sales, wp_pre_md_written_units, wp_post_md_written_units,
					wp_w_sls_dollars, wp_w_gm_dollars, wp_d_sls_dollars, wp_d_sls_units,no_of_months,
					avg(wp_w_sls_dollars) over
					(partition by dept, channel) as avg_monthly_sls_dollars,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_sls_dollars_3m_avg,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_sls_dollars_6m_avg,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_sls_dollars_9m_avg,
					wp_w_sls_units,
					avg(wp_w_sls_units) over
					(partition by dept, channel) as avg_monthly_sls_units,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_sls_units_3m_avg,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_sls_units_6m_avg,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_sls_units_9m_avg,
					w_aur,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_aur_3m_avg,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_aur_6m_avg,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_aur_9m_avg,
					wp_d_gm, d_aur, wp_aoh_units, wp_aoh_fwos_units, wp_atp_units, wp_atp_fwos_units,
					wp_total_receipt_cost, wp_total_receipt_units, wp_eop_cost, wp_eop_units, wp_oo_u_ttl_p
					from wp_agg), op_base_data AS (
					    SELECT 
							mv.l3_name as class,
					        mv.l1_name AS Division,
					        om.dept,
					        collection_name AS collection,
					        channel,
					        om.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                            CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					        --store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM (' || op_union_sql || ') om
					    left join (' || union_sql || ') isku on om.hierarchy_code=isku.hierarchy_code and isku.current_week = om.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON om.dept = mv.l2_name AND om.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month, fiscal_week FROM "global".fiscal_date_mapping) fdm ON fdm.fiscal_year_week = om.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON om.hierarchy_code = is2.hierarchy_code AND om.dept = is2.dept
					    WHERE om.dept IN ('||dept_name ||') and fiscal_year = '||fis_year ||'
							AND om.current_week between '||sweek ||' and '||tweek ||' 
					), op_data as (SELECT
				class,
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    op_aoh_units,
					    op_atp_units,
					    op_eop_cost,
					    op_eop_units,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    round(SUM(store_count*written_sales_units) / NULLIF(SUM(written_sales_units), 0)) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM op_base_data
					where class IN (' || cls_name || ')
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,14
					), op_agg as (
					select class,dept, channel, fiscal_year as year, fiscal_month as month, 
					op_aoh_units, op_atp_units, op_eop_cost, op_eop_units,
					avg(store_count) as op_store_count, count(distinct hierarchy_code) as op_sku_count, avg(w_air) as op_w_air, 
					avg(w_auc) as op_w_auc, avg(w_aur) as op_w_aur, avg(w_dr_perc) as op_w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
					--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
					sum(w_sls_dollars) as op_w_sls_dollars, avg(w_sls_ecom_perc) as op_w_sls_ecom_perc, 
					sum(w_sls_units) as op_w_sls_units, sum(w_gm_dollars) as op_w_gm_dollars, sum(post_md_written_sales) as op_post_md_written_sales, 
					sum(pre_md_written_sales) as op_pre_md_written_sales, sum(post_md_written_units) as op_post_md_written_units, sum(pre_md_written_units) as op_pre_md_written_units, 
					sum(d_sls_dollars) as op_d_sls_dollars, sum(d_sls_units) as op_d_sls_units, sum(d_gm) as op_d_gm, avg(d_aur) as op_d_aur,
					sum(aoh_fwos_units) as op_aoh_fwos_units, sum(atp_fwos_units) as op_atp_fwos_units,
					sum(total_receipt_cost) as op_total_receipt_cost, sum(total_receipt_units) as op_total_receipt_units, 
					sum(on_order_placed_total_unit) as op_oo_u_ttl_p
					from op_data
					group by 1,2,3,4,5,6,7,8,9), op as (select class,dept, channel, year, month, op_store_count, op_sku_count, w_air, w_auc, w_dr_perc,
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    op_w_sls_dollars / NULLIF(op_w_sls_dollars, 0)
					  ELSE 0
					END AS op_w_sls_ecom_perc,
					op_pre_md_written_sales, op_post_md_written_sales, op_pre_md_written_units, op_post_md_written_units,
					op_w_sls_dollars, op_w_gm_dollars,op_d_sls_dollars,op_d_sls_units,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_sls_dollars_3m_avg,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_sls_dollars_6m_avg,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_sls_dollars_9m_avg,
					op_w_sls_units,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_sls_units_3m_avg,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_sls_units_6m_avg,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_sls_units_9m_avg,
					op_w_aur,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_aur_3m_avg,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_aur_6m_avg,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_aur_9m_avg,
					op_d_gm, op_d_aur, op_aoh_units, op_aoh_fwos_units, op_atp_units, op_atp_fwos_units, op_total_receipt_cost, 
					op_total_receipt_units, op_eop_cost, op_eop_units, op_oo_u_ttl_p
					from op_agg), ly_base_data AS (
					    SELECT 
						mv.l3_name as class,
					        mv.l1_name AS Division,
					        lm.dept,
					        collection_name AS collection,
					        channel,
					        lm.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ly_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ly_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                         CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					     --   store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM item_smart.ly_master lm
					    left join (' || union_sql || ') isku on lm.hierarchy_code=isku.hierarchy_code and isku.current_week = lm.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON lm.dept = mv.l2_name AND lm.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month, fiscal_week FROM "global".fiscal_date_mapping) fdm ON fdm.fiscal_year_week = lm.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON lm.hierarchy_code = is2.hierarchy_code AND lm.dept = is2.dept
					    WHERE lm.dept IN ('||dept_name ||') and fiscal_year = '||fis_year ||'
						 AND lm.current_week between '||sweek ||' and '||tweek ||' 
					), ly_data as (SELECT
						class,
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    ly_aoh_units,
					    ly_atp_units,
					    ly_eop_cost,
					    ly_eop_units,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    AVG(store_count) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM ly_base_data
			where class IN (' || cls_name || ')
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,14
					), ly_agg as (select class,dept, channel, fiscal_year as year, fiscal_month as month, 
					ly_aoh_units, ly_atp_units, ly_eop_cost, ly_eop_units,
					avg(store_count) as store_count, count(distinct hierarchy_code) as sku_count, avg(w_air) as w_air, 
					avg(w_auc) as w_auc, avg(w_aur) as w_aur, avg(w_dr_perc) as w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_aur,
					--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_dr_perc,
					sum(w_sls_dollars) as w_sls_dollars, avg(w_sls_ecom_perc) as w_sls_ecom_perc, 
					sum(w_sls_units) as w_sls_units, sum(w_gm_dollars) as w_gm_dollars, sum(post_md_written_sales) as post_md_written_sales, 
					sum(pre_md_written_sales) as pre_md_written_sales, sum(post_md_written_units) as post_md_written_units, sum(pre_md_written_units) as pre_md_written_units, 
					sum(d_sls_dollars) as d_sls_dollars, sum(d_sls_units) as d_sls_units, sum(d_gm) as d_gm, avg(d_aur) as d_aur,
					sum(aoh_fwos_units) as aoh_fwos_units, sum(atp_fwos_units) as atp_fwos_units,
					sum(total_receipt_cost) as total_receipt_cost, sum(total_receipt_units) as total_receipt_units, sum(on_order_placed_total_unit) as oo_u_ttl_p
					from ly_data
					group by 1,2,3,4,5,6,7,8,9), 
					ly as (select class,dept, channel, year, month, store_count, sku_count, ly_w_air, ly_w_auc, ly_w_dr_perc, 
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    w_sls_dollars / NULLIF(w_sls_dollars, 0)
					  ELSE 0
					END AS w_sls_ecom_perc,
					pre_md_written_sales, post_md_written_sales, pre_md_written_units, post_md_written_units,
					w_sls_dollars, w_gm_dollars, d_sls_dollars, d_sls_units,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_sls_dollars_3m_avg,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_sls_dollars_6m_avg,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_sls_dollars_9m_avg,
					w_sls_units,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_sls_units_3m_avg,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_sls_units_6m_avg,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_sls_units_9m_avg,
					ly_w_aur,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_aur_3m_avg,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_aur_6m_avg,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_aur_9m_avg,
					d_gm, d_aur, ly_aoh_units, aoh_fwos_units, ly_atp_units, atp_fwos_units,
					total_receipt_cost, total_receipt_units, oo_u_ttl_p, ly_eop_cost, ly_eop_units
					from ly_agg
					), final_data as (select wp.class,dept, channel, year, month, CAST(COALESCE(wp_store_count, 0) AS INT) AS wp_store_count,
					CAST(wp_sku_count AS INT) AS wp_sku_count, wp.w_air, wp.w_auc,
					no_of_months, avg_monthly_sls_dollars, wp_w_sls_dollars_3m_avg, wp_w_sls_dollars_6m_avg, wp_w_sls_dollars_9m_avg,
					avg_monthly_sls_units, wp_w_sls_units_3m_avg, wp_w_sls_units_6m_avg, wp_w_sls_units_9m_avg,
					wp_w_sls_dollars, wp_pre_md_written_sales, wp_post_md_written_sales, 
					wp_w_sls_ecom_perc, op_w_sls_dollars, op_pre_md_written_sales, op_post_md_written_sales,
					op_w_sls_ecom_perc, (wp_w_sls_dollars - op_w_sls_dollars) as w_sls_dollars_wp_op_var,
					(wp_pre_md_written_sales - op_pre_md_written_sales) as pre_md_w_sls_dollars_wp_op_var,
					(wp_post_md_written_sales - op_post_md_written_sales) as post_md_w_sls_dollars_wp_op_var,
					(wp_w_sls_dollars - op_w_sls_dollars) / NULLIF(op_w_sls_dollars, 0) as w_sls_dollars_wp_op_var_perc,
					(wp_pre_md_written_sales - op_pre_md_written_sales) / NULLIF(op_pre_md_written_sales, 0) as pre_md_w_sls_dollars_wp_op_var_perc,
					(wp_post_md_written_sales - op_post_md_written_sales) / NULLIF(op_post_md_written_sales, 0) as post_md_w_sls_dollars_wp_op_var_perc,
					ly.w_sls_dollars as ly_w_sls_dollars, ly.pre_md_written_sales as ly_pre_md_written_sales, ly.post_md_written_sales as ly_post_md_written_sales,
					ly.w_sls_ecom_perc as ly_w_sls_ecom_perc, (wp_w_sls_dollars - ly.w_sls_dollars) as w_sls_dollars_wp_ly_var,
					(wp_pre_md_written_sales - ly.pre_md_written_sales) as pre_md_w_sls_dollars_wp_ly_var,
					(wp_post_md_written_sales - ly.post_md_written_sales) as post_md_w_sls_dollars_wp_ly_var,
					(wp_w_sls_dollars - ly.w_sls_dollars) / NULLIF(ly.w_sls_dollars, 0) as w_sls_dollars_wp_ly_var_perc,
					(wp_pre_md_written_sales - ly.pre_md_written_sales) / NULLIF(ly.pre_md_written_sales, 0) as pre_md_w_sls_dollars_wp_ly_var_perc,
					(wp_post_md_written_sales - ly.post_md_written_sales) / NULLIF(ly.post_md_written_sales, 0) as post_md_w_sls_dollars_wp_ly_var_perc,
					wp_w_sls_units, wp_pre_md_written_units, wp_post_md_written_units,
					op_w_sls_units, op_pre_md_written_units, op_post_md_written_units,
					(wp_w_sls_units - op_w_sls_units) as w_sls_units_wp_op_var,
					(wp_pre_md_written_units - op_pre_md_written_units) as pre_md_w_sls_units_wp_op_var,
					(wp_post_md_written_units - op_post_md_written_units) as post_md_w_sls_units_wp_op_var,
					(wp_w_sls_units - op_w_sls_units) / NULLIF(op_w_sls_units, 0) as w_sls_units_wp_op_var_perc,
					(wp_pre_md_written_units - op_pre_md_written_units) / NULLIF(op_pre_md_written_units, 0) as pre_md_w_sls_units_wp_op_var_perc,
					(wp_post_md_written_units - op_post_md_written_units) / NULLIF(op_post_md_written_units, 0) as post_md_w_sls_units_wp_op_var_perc,
					ly.w_sls_units as ly_w_sls_units, ly.pre_md_written_units as ly_pre_md_written_units, ly.post_md_written_units as ly_post_md_written_units,
					(wp_w_sls_units - ly.w_sls_units) as w_sls_units_wp_ly_var,
					(wp_pre_md_written_units - ly.pre_md_written_units) as pre_md_w_sls_units_wp_ly_var,
					(wp_post_md_written_units - ly.post_md_written_units) as post_md_w_sls_units_wp_ly_var,
					(wp_w_sls_units - ly.w_sls_dollars) / NULLIF(ly.w_sls_units, 0) as w_sls_units_wp_ly_var_perc,
					(wp_pre_md_written_units - ly.pre_md_written_units) / NULLIF(ly.pre_md_written_units, 0) as pre_md_w_sls_units_wp_ly_var_perc,
					(wp_post_md_written_units - ly.post_md_written_units) / NULLIF(ly.post_md_written_units, 0) as post_md_w_sls_units_wp_ly_var_perc,
					wp.w_aur, wp_w_aur_3m_avg, wp_w_aur_6m_avg, wp_w_aur_9m_avg, op_w_aur, ly_w_aur,
					wp.w_dr_perc as wp_w_dr_perc, op.w_dr_perc as op_w_dr_perc, ly_w_dr_perc,
					wp_w_gm_dollars, NULLIF(wp_w_gm_dollars, 0) / NULLIF(wp_w_sls_dollars, 0) as wp_w_gm_perc, 
					op_w_gm_dollars, NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0) as op_w_gm_perc,
					(wp_w_gm_dollars - op_w_gm_dollars) as w_gm_dollars_wp_op_var,
					((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)))/(NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)) as w_gm_perc_wp_op_var,
					(wp_w_gm_dollars - op_w_gm_dollars) / NULLIF(op_w_gm_dollars, 0) as w_gm_dollars_wp_op_var_perc,
					ly.w_gm_dollars as ly_w_gm_dollars, NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0) as ly_w_gm_perc,
					(wp_w_gm_dollars - ly.w_gm_dollars) as w_gm_dollars_wp_ly_var,
					((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0)))/(NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0)) as w_gm_perc_wp_ly_var,
					(wp_w_gm_dollars - ly.w_gm_dollars) / NULLIF(ly.w_gm_dollars, 0) as w_gm_dollars_wp_ly_var_perc,
					wp_aoh_units, wp_aoh_fwos_units, op_aoh_units, op_aoh_fwos_units,
					ly_aoh_units, ly.aoh_fwos_units as ly_aoh_fwos_units,
					wp_total_receipt_units, op_total_receipt_units, 
					(wp_total_receipt_units - op_total_receipt_units) as total_receipt_units_wp_op_var,
					(wp_total_receipt_units - op_total_receipt_units) / NULLIF(op_total_receipt_units, 0) as total_receipt_units_wp_op_var_perc,
					ly.total_receipt_units as ly_total_receipt_units,
					(wp_total_receipt_units - ly.total_receipt_units) as total_receipt_units_wp_ly_var,
					(wp_total_receipt_units - ly.total_receipt_units) / NULLIF(ly.total_receipt_units, 0) as total_receipt_units_wp_ly_var_perc,
					wp_oo_u_ttl_p, op_oo_u_ttl_p,
					(wp_oo_u_ttl_p - op_oo_u_ttl_p) as oo_u_ttl_p_wp_op_var,
					(wp_oo_u_ttl_p - op_oo_u_ttl_p)/NULLIF(op_oo_u_ttl_p, 0) as oo_u_ttl_p_wp_op_var_perc,
					oo_u_ttl_p, (wp_oo_u_ttl_p - oo_u_ttl_p) as oo_u_ttl_p_wp_ly_var,
					(wp_oo_u_ttl_p - oo_u_ttl_p)/NULLIF(oo_u_ttl_p, 0) as oo_u_ttl_p_wp_ly_var_perc,
					wp_atp_units, wp_atp_fwos_units, op_atp_units, op_atp_fwos_units, ly_atp_units, ly.atp_fwos_units,
					wp_d_sls_dollars, op_d_sls_dollars,
					(wp_d_sls_dollars - op_d_sls_dollars) as d_sls_dollars_wp_op_var,
					(wp_d_sls_dollars - op_d_sls_dollars)/NULLIF(op_d_sls_dollars, 0) as d_sls_dollars_wp_op_var_perc,
					ly.d_sls_dollars, 
					(wp_d_sls_dollars - ly.d_sls_dollars) as d_sls_dollars_wp_ly_var,
					(wp_d_sls_dollars - ly.d_sls_dollars)/NULLIF(ly.d_sls_dollars, 0) as d_sls_dollars_wp_ly_var_perc,
					wp_d_sls_units, op_d_sls_units,
					(wp_d_sls_units - op_d_sls_units) as d_sls_units_wp_op_var,
					(wp_d_sls_units - op_d_sls_units)/NULLIF(op_d_sls_units, 0) as d_sls_units_wp_op_var_perc,
					ly.d_sls_units, 
					(wp_d_sls_units - ly.d_sls_units) as d_sls_units_wp_ly_var,
					(wp_d_sls_units - ly.d_sls_units)/NULLIF(ly.d_sls_units, 0) as d_sls_units_wp_ly_var_perc,
					wp.d_aur as wp_d_aur, op_d_aur, ly.d_aur as ly_d_aur,
					wp_d_gm, NULLIF(wp_d_gm, 0) / NULLIF(wp_d_sls_dollars, 0) as wp_d_gm_perc, 
					op_d_gm, NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0) as op_d_gm_perc,
					(wp_d_gm - op_d_gm) as d_gm_wp_op_var,
					((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)))/(NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)) as d_gm_perc_wp_op_var,
					(wp_d_gm - op_d_gm) / NULLIF(op_d_gm, 0) as d_gm_wp_op_var_perc,
					ly.d_gm as ly_d_gm, NULLIF(ly.d_gm, 0) / NULLIF(ly.w_sls_dollars, 0) as ly_d_gm_perc,
					(wp_d_gm - ly.d_gm) as d_gm_wp_ly_var,
					((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(ly.d_gm, 0) / NULLIF(ly.d_sls_dollars, 0)))/(NULLIF(ly.d_gm, 0) / NULLIF(ly.d_sls_dollars, 0)) as d_gm_perc_wp_ly_var,
					(wp_d_gm - ly.d_gm) / NULLIF(ly.d_gm, 0) as d_gm_wp_ly_var_perc,
					wp_eop_cost, op_eop_cost,
					(wp_eop_cost - op_eop_cost) as eop_cost_wp_op_var,
					(wp_eop_cost - op_eop_cost) / NULLIF(op_eop_cost, 0) as eop_cost_wp_op_var_perc,
					ly_eop_cost,
					(wp_eop_cost - ly_eop_cost) as eop_cost_wp_ly_var,
					(wp_eop_cost - ly_eop_cost) / NULLIF(ly_eop_cost, 0) as eop_cost_wp_ly_var_perc,
					wp_eop_units, op_eop_units,
					(wp_eop_units - op_eop_units) as eop_units_wp_op_var,
					(wp_eop_units - op_eop_units) / NULLIF(op_eop_units, 0) as eop_units_wp_op_var_perc,
					ly_eop_units,
					(wp_eop_units - ly_eop_units) as eop_units_wp_ly_var,
					(wp_eop_units - ly_eop_units) / NULLIF(ly_eop_units, 0) as eop_units_wp_ly_var_perc
					from wp
					left join op using (dept, channel, year, month)
					left join ly using (dept, channel, year, month)
					order by year, month), omni_channel AS (
					    SELECT
						class,
					        dept,
					        ''Omni'' AS channel,
					        year,
					        month,
					        CAST(COALESCE(SUM(wp_store_count), 0) AS INT) AS wp_store_count,
					CAST(COALESCE(SUM(wp_sku_count), 0)AS INT) AS wp_sku_count,
					COALESCE(AVG(w_air), 0) AS w_air,
					COALESCE(AVG(w_auc), 0) AS w_auc,
					COALESCE(MAX(no_of_months), 0) AS no_of_months,
					COALESCE(SUM(avg_monthly_sls_dollars), 0) AS avg_monthly_sls_dollars,
					COALESCE(AVG(wp_w_sls_dollars_3m_avg), 0) AS wp_w_sls_dollars_3m_avg,
					COALESCE(AVG(wp_w_sls_dollars_6m_avg), 0) AS wp_w_sls_dollars_6m_avg,
					COALESCE(AVG(wp_w_sls_dollars_9m_avg), 0) AS wp_w_sls_dollars_9m_avg,
					COALESCE(SUM(avg_monthly_sls_units), 0) AS avg_monthly_sls_units,
					COALESCE(AVG(wp_w_sls_units_3m_avg), 0) AS wp_w_sls_units_3m_avg,
					COALESCE(AVG(wp_w_sls_units_6m_avg), 0) AS wp_w_sls_units_6m_avg,
					COALESCE(AVG(wp_w_sls_units_9m_avg), 0) AS wp_w_sls_units_9m_avg,
					COALESCE(SUM(wp_w_sls_dollars), 0) AS wp_w_sls_dollars,
					COALESCE(SUM(wp_pre_md_written_sales), 0) AS wp_pre_md_written_sales,
					COALESCE(SUM(wp_post_md_written_sales), 0) AS wp_post_md_written_sales,
					COALESCE(SUM(wp_w_sls_ecom_perc * wp_w_sls_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0), 0) AS wp_w_sls_ecom_perc,
					COALESCE(SUM(op_w_sls_dollars), 0) AS op_w_sls_dollars,
					COALESCE(SUM(op_pre_md_written_sales), 0) AS op_pre_md_written_sales,
					COALESCE(SUM(op_post_md_written_sales), 0) AS op_post_md_written_sales,
					COALESCE(SUM(op_w_sls_ecom_perc * op_w_sls_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS op_w_sls_ecom_perc,
					COALESCE(SUM(w_sls_dollars_wp_op_var), 0) AS w_sls_dollars_wp_op_var,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var), 0) AS pre_md_w_sls_dollars_wp_op_var,
					COALESCE(SUM(post_md_w_sls_dollars_wp_op_var), 0) AS post_md_w_sls_dollars_wp_op_var,
					COALESCE(SUM(w_sls_dollars_wp_op_var) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var) / NULLIF(SUM(op_pre_md_written_sales), 0), 0) AS pre_md_w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(post_md_w_sls_dollars_wp_op_var) / NULLIF(SUM(op_post_md_written_sales), 0), 0) AS post_md_w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(ly_w_sls_dollars), 0) AS ly_w_sls_dollars,
					COALESCE(SUM(ly_pre_md_written_sales), 0) AS ly_pre_md_written_sales,
					COALESCE(SUM(ly_post_md_written_sales), 0) AS ly_post_md_written_sales,
					COALESCE(SUM(ly_w_sls_ecom_perc * ly_w_sls_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS ly_w_sls_ecom_perc,
					COALESCE(SUM(w_sls_dollars_wp_ly_var), 0) AS w_sls_dollars_wp_ly_var,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var), 0) AS pre_md_w_sls_dollars_wp_ly_var,
					COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var), 0) AS post_md_w_sls_dollars_wp_ly_var,
					COALESCE(SUM(w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_pre_md_written_sales), 0), 0) AS pre_md_w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_post_md_written_sales), 0), 0) AS post_md_w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_w_sls_units), 0) AS wp_w_sls_units,
					COALESCE(SUM(wp_pre_md_written_units), 0) AS wp_pre_md_written_units,
					COALESCE(SUM(wp_post_md_written_units), 0) AS wp_post_md_written_units,
					COALESCE(SUM(op_w_sls_units), 0) AS op_w_sls_units,
					COALESCE(SUM(op_pre_md_written_units), 0) AS op_pre_md_written_units,
					COALESCE(SUM(op_post_md_written_units), 0) AS op_post_md_written_units,
					COALESCE(SUM(w_sls_units_wp_op_var), 0) AS w_sls_units_wp_op_var,
					COALESCE(SUM(pre_md_w_sls_units_wp_op_var), 0) AS pre_md_w_sls_units_wp_op_var,
					COALESCE(SUM(post_md_w_sls_units_wp_op_var), 0) AS post_md_w_sls_units_wp_op_var,
					COALESCE(SUM(w_sls_units_wp_op_var) / NULLIF(SUM(op_w_sls_units), 0), 0) AS w_sls_units_wp_op_var_perc,
					COALESCE(SUM(pre_md_w_sls_units_wp_op_var) / NULLIF(SUM(op_pre_md_written_units), 0), 0) AS pre_md_w_sls_units_wp_op_var_perc,
					COALESCE(SUM(post_md_w_sls_units_wp_op_var) / NULLIF(SUM(op_post_md_written_units), 0), 0) AS post_md_w_sls_units_wp_op_var_perc,
					COALESCE(SUM(ly_w_sls_units), 0) AS ly_w_sls_units,
					COALESCE(SUM(ly_pre_md_written_units), 0) AS ly_pre_md_written_units,
					COALESCE(SUM(ly_post_md_written_units), 0) AS ly_post_md_written_units,
					COALESCE(SUM(w_sls_units_wp_ly_var), 0) AS w_sls_units_wp_ly_var,
					COALESCE(SUM(pre_md_w_sls_units_wp_ly_var), 0) AS pre_md_w_sls_units_wp_ly_var,
					COALESCE(SUM(post_md_w_sls_units_wp_ly_var), 0) AS post_md_w_sls_units_wp_ly_var,
					COALESCE(SUM(w_sls_units_wp_ly_var) / NULLIF(SUM(ly_w_sls_units), 0), 0) AS w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(pre_md_w_sls_units_wp_ly_var) / NULLIF(SUM(ly_pre_md_written_units), 0), 0) AS pre_md_w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(post_md_w_sls_units_wp_ly_var) / NULLIF(SUM(ly_post_md_written_units), 0), 0) AS post_md_w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(wp_w_sls_dollars) / NULLIF(SUM(wp_w_sls_units), 0), 0) AS w_aur,
					COALESCE(AVG(wp_w_aur_3m_avg), 0) AS wp_w_aur_3m_avg,
					COALESCE(AVG(wp_w_aur_6m_avg), 0) AS wp_w_aur_6m_avg,
					COALESCE(AVG(wp_w_aur_9m_avg), 0) AS wp_w_aur_9m_avg,
					COALESCE(SUM(op_w_sls_dollars) / NULLIF(SUM(op_w_sls_units), 0), 0) AS op_w_aur,
					COALESCE(SUM(ly_w_sls_dollars) / NULLIF(SUM(ly_w_sls_units), 0), 0) AS ly_w_aur,
					COALESCE(AVG(wp_w_dr_perc), 0) AS wp_w_dr_perc,
					COALESCE(AVG(op_w_dr_perc), 0) AS op_w_dr_perc,
					COALESCE(AVG(ly_w_dr_perc), 0) AS ly_w_dr_perc,
					COALESCE(SUM(wp_w_gm_dollars), 0) AS wp_w_gm_dollars,
					COALESCE(SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0), 0) AS wp_w_gm_perc,
					COALESCE(SUM(op_w_gm_dollars), 0) AS op_w_gm_dollars,
					COALESCE(SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS op_w_gm_perc,
					COALESCE(SUM(w_gm_dollars_wp_op_var), 0) AS w_gm_dollars_wp_op_var,
					COALESCE((SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0) - SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0)) / NULLIF(SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0), 0) AS w_gm_perc_wp_op_var,
					COALESCE(SUM(w_gm_dollars_wp_op_var) / NULLIF(SUM(op_w_gm_dollars), 0), 0) AS w_gm_dollars_wp_op_var_perc,
					COALESCE(SUM(ly_w_gm_dollars), 0) AS ly_w_gm_dollars,
					COALESCE(SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS ly_w_gm_perc,
					COALESCE(SUM(w_gm_dollars_wp_ly_var), 0) AS w_gm_dollars_wp_ly_var,
					COALESCE((SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0) - SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0)) / NULLIF(SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0), 0) AS w_gm_perc_wp_ly_var,
					COALESCE(SUM(w_gm_dollars_wp_ly_var) / NULLIF(SUM(ly_w_gm_dollars), 0), 0) AS w_gm_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_aoh_units), 0) AS wp_aoh_units,
					COALESCE(SUM(wp_aoh_fwos_units), 0) AS wp_aoh_fwos_units,
					COALESCE(SUM(op_aoh_units), 0) AS op_aoh_units,
					COALESCE(SUM(op_aoh_fwos_units), 0) AS op_aoh_fwos_units,
					COALESCE(SUM(ly_aoh_units), 0) AS ly_aoh_units,
					COALESCE(SUM(ly_aoh_fwos_units), 0) AS ly_aoh_fwos_units,
					COALESCE(SUM(wp_total_receipt_units), 0) AS wp_total_receipt_units,
					COALESCE(SUM(op_total_receipt_units), 0) AS op_total_receipt_units,
					COALESCE(SUM(total_receipt_units_wp_op_var), 0) AS total_receipt_units_wp_op_var,
					COALESCE(SUM(total_receipt_units_wp_op_var) / NULLIF(SUM(op_total_receipt_units), 0), 0) AS total_receipt_units_wp_op_var_perc,
					COALESCE(SUM(ly_total_receipt_units), 0) AS ly_total_receipt_units,
					COALESCE(SUM(total_receipt_units_wp_ly_var), 0) AS total_receipt_units_wp_ly_var,
					COALESCE(SUM(total_receipt_units_wp_ly_var) / NULLIF(SUM(ly_total_receipt_units), 0), 0) AS total_receipt_units_wp_ly_var_perc,
					COALESCE(SUM(wp_oo_u_ttl_p), 0) AS wp_oo_u_ttl_p,
					COALESCE(SUM(op_oo_u_ttl_p), 0) AS op_oo_u_ttl_p,
					COALESCE(SUM(oo_u_ttl_p_wp_op_var), 0) AS oo_u_ttl_p_wp_op_var,
					COALESCE(SUM(oo_u_ttl_p_wp_op_var) / NULLIF(SUM(op_oo_u_ttl_p), 0), 0) AS oo_u_ttl_p_wp_op_var_perc,
					COALESCE(SUM(oo_u_ttl_p), 0) AS oo_u_ttl_p,
					COALESCE(SUM(oo_u_ttl_p_wp_ly_var), 0) AS oo_u_ttl_p_wp_ly_var,
					COALESCE(SUM(oo_u_ttl_p_wp_ly_var) / NULLIF(SUM(oo_u_ttl_p), 0), 0) AS oo_u_ttl_p_wp_ly_var_perc,
					COALESCE(SUM(wp_atp_units), 0) AS wp_atp_units,
					COALESCE(SUM(wp_atp_fwos_units), 0) AS wp_atp_fwos_units,
					COALESCE(SUM(op_atp_units), 0) AS op_atp_units,
					COALESCE(SUM(op_atp_fwos_units), 0) AS op_atp_fwos_units,
					COALESCE(SUM(ly_atp_units), 0) AS ly_atp_units,
					COALESCE(SUM(atp_fwos_units), 0) AS atp_fwos_units,
					COALESCE(SUM(wp_d_sls_dollars), 0) AS wp_d_sls_dollars,
					COALESCE(SUM(op_d_sls_dollars), 0) AS op_d_sls_dollars,
					COALESCE(SUM(d_sls_dollars_wp_op_var), 0) AS d_sls_dollars_wp_op_var,
					COALESCE(SUM(d_sls_dollars_wp_op_var) / NULLIF(SUM(op_d_sls_dollars), 0), 0) AS d_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(d_sls_dollars), 0) AS d_sls_dollars,
					COALESCE(SUM(d_sls_dollars_wp_ly_var), 0) AS d_sls_dollars_wp_ly_var,
					COALESCE(SUM(d_sls_dollars_wp_ly_var) / NULLIF(SUM(d_sls_dollars), 0), 0) AS d_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_d_sls_units), 0) AS wp_d_sls_units,
					COALESCE(SUM(op_d_sls_units), 0) AS op_d_sls_units,
					COALESCE(SUM(d_sls_units_wp_op_var), 0) AS d_sls_units_wp_op_var,
					COALESCE(SUM(d_sls_units_wp_op_var) / NULLIF(SUM(op_d_sls_units), 0), 0) AS d_sls_units_wp_op_var_perc,
					COALESCE(SUM(d_sls_units), 0) AS d_sls_units,
					COALESCE(SUM(d_sls_units_wp_ly_var), 0) AS d_sls_units_wp_ly_var,
					COALESCE(SUM(d_sls_units_wp_ly_var) / NULLIF(SUM(d_sls_units), 0), 0) AS d_sls_units_wp_ly_var_perc,
					COALESCE(AVG(wp_d_aur), 0) AS wp_d_aur,
					COALESCE(AVG(op_d_aur), 0) AS op_d_aur,
					COALESCE(AVG(ly_d_aur), 0) AS ly_d_aur,
					COALESCE(SUM(wp_d_gm), 0) AS wp_d_gm,
					COALESCE(SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0), 0) AS wp_d_gm_perc,
					COALESCE(SUM(op_d_gm), 0) AS op_d_gm,
					COALESCE(SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0), 0) AS op_d_gm_perc,
					COALESCE(SUM(d_gm_wp_op_var), 0) AS d_gm_wp_op_var,
					COALESCE((SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0) - SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0)) / NULLIF(SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0), 0), 0) AS d_gm_perc_wp_op_var,
					COALESCE(SUM(d_gm_wp_op_var) / NULLIF(SUM(op_d_gm), 0), 0) AS d_gm_wp_op_var_perc,
					COALESCE(SUM(ly_d_gm), 0) AS ly_d_gm,
					COALESCE(SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0), 0) AS ly_d_gm_perc,
					COALESCE(SUM(d_gm_wp_ly_var), 0) AS d_gm_wp_ly_var,
					COALESCE((SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0) - SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0)) / NULLIF(SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0), 0), 0) AS d_gm_perc_wp_ly_var,
					COALESCE(SUM(d_gm_wp_ly_var) / NULLIF(SUM(ly_d_gm), 0), 0) AS d_gm_wp_ly_var_perc,
					COALESCE(SUM(wp_eop_cost), 0) AS wp_eop_cost,
					COALESCE(SUM(op_eop_cost), 0) AS op_eop_cost,
					COALESCE(SUM(eop_cost_wp_op_var), 0) AS eop_cost_wp_op_var,
					COALESCE(SUM(eop_cost_wp_op_var) / NULLIF(SUM(op_eop_cost), 0), 0) AS eop_cost_wp_op_var_perc,
					COALESCE(SUM(ly_eop_cost), 0) AS ly_eop_cost,
					COALESCE(SUM(eop_cost_wp_ly_var), 0) AS eop_cost_wp_ly_var,
					COALESCE(SUM(eop_cost_wp_ly_var) / NULLIF(SUM(ly_eop_cost), 0), 0) AS eop_cost_wp_ly_var_perc,
					COALESCE(SUM(wp_eop_units), 0) AS wp_eop_units,
					COALESCE(SUM(op_eop_units), 0) AS op_eop_units,
					COALESCE(SUM(eop_units_wp_op_var), 0) AS eop_units_wp_op_var,
					COALESCE(SUM(eop_units_wp_op_var) / NULLIF(SUM(op_eop_units), 0), 0) AS eop_units_wp_op_var_perc,
					COALESCE(SUM(ly_eop_units), 0) AS ly_eop_units,
					COALESCE(SUM(eop_units_wp_ly_var), 0) AS eop_units_wp_ly_var,
					COALESCE(SUM(eop_units_wp_ly_var) / NULLIF(SUM(ly_eop_units), 0), 0) AS eop_units_wp_ly_var
					        from final_data
					        group by 1,2,3,4,5
					        order by year, month
					),final_report as
			(SELECT * from final_data
			union all
			select *from omni_channel
			order by year, month
			)

			Select 
				distinct
				class as "Class",
				channel as "Channel"  ,
			--	year as "YEAR"  ,
			--	month as "MONTH"  ,
				wp_store_count as "Store Count",
wp_sku_count as "# of SKUs",
CONCAT(''$'', ROUND(COALESCE(w_air, 0)::NUMERIC, 2)) as "AIR",
CONCAT(''$'', ROUND(COALESCE(w_auc, 0)::NUMERIC, 2)) as "AUC",
COALESCE(no_of_months, 0) as "WP # of Months w/Sls",

CONCAT(''$'', TO_CHAR(ROUND(COALESCE(avg_monthly_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Avg Monthly W Sls$",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_3m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "3 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_6m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "6 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_9m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "9 mo Avg Month W Sls $",
TRUNC(COALESCE(avg_monthly_sls_units, 0)) as "WP Avg Monthly W U Sls",
TRUNC(COALESCE(wp_w_sls_units_3m_avg, 0)) as "3 mo Avg Month W Sls U",
TRUNC(COALESCE(wp_w_sls_units_6m_avg, 0)) as "6 mo Avg Month W Sls U",
TRUNC(COALESCE(wp_w_sls_units_9m_avg, 0)) as "9 mo Avg Month W Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_pre_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_post_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_pre_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_post_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PreMD Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ % Var  to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - PreMD % Var  to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - PostMD % Var  to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_pre_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_post_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PreMD Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - PreMD % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - PostMD % Var to LY",
TRUNC(COALESCE(wp_w_sls_units, 0)) as "WP W Sls U",
TRUNC(COALESCE(wp_pre_md_written_units, 0)) as "WP W Sls U - PreMD",
TRUNC(COALESCE(wp_post_md_written_units, 0)) as "WP W Sls U - PostMD",
TRUNC(COALESCE(op_w_sls_units, 0)) as "OP W Sls U",
TRUNC(COALESCE(op_pre_md_written_units, 0)) as "OP W Sls U - PreMD",
TRUNC(COALESCE(op_post_md_written_units, 0)) as "OP W Sls U - PostMD",
TRUNC(COALESCE(w_sls_units_wp_op_var, 0)) as "WP W Sls U Var to OP",
TRUNC(COALESCE(pre_md_w_sls_units_wp_op_var, 0)) as "WP W Sls U - PreMD Var to OP",
TRUNC(COALESCE(post_md_w_sls_units_wp_op_var, 0)) as "WP W Sls U - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U - PreMD % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U - PostMD % Var to OP",
TRUNC(COALESCE(ly_w_sls_units, 0)) as "LY W Sls U",
TRUNC(COALESCE(ly_pre_md_written_units, 0)) as "LY W Sls U - PreMD",
TRUNC(COALESCE(ly_post_md_written_units, 0)) as "LY W Sls U - PostMD",
TRUNC(COALESCE(w_sls_units_wp_ly_var, 0)) as "WP W Sls U Var to LY",
TRUNC(COALESCE(pre_md_w_sls_units_wp_ly_var, 0)) as "WP W Sls U - PreMD Var to LY",
TRUNC(COALESCE(post_md_w_sls_units_wp_ly_var, 0)) as "WP W Sls U - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U - PreMD % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U - PostMD % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_3m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "3 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_6m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "6 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_9m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "9 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W AUR",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY W DR%",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_perc_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_perc_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM $ % Var to LY",
TRUNC(COALESCE(wp_aoh_units, 0)) as "WP AOH U",
TRUNC(COALESCE(wp_aoh_fwos_units, 0)) as "WP AOH FWOS U",
TRUNC(COALESCE(op_aoh_units, 0)) as "OP AOH U",
TRUNC(COALESCE(op_aoh_fwos_units, 0)) as "OP AOH FWOS U",
TRUNC(COALESCE(ly_aoh_units, 0)) as "LY AOH U",
TRUNC(COALESCE(ly_aoh_fwos_units, 0)) as "LY AOH FWOS U",
TRUNC(COALESCE(wp_total_receipt_units, 0)) as "WP Ttl Rcpt U",
TRUNC(COALESCE(op_total_receipt_units, 0)) as "OP Ttl Rcpt U",
TRUNC(COALESCE(total_receipt_units_wp_op_var, 0)) as "WP Ttl Rcpt U Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(total_receipt_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP Ttl Rcpt U % Var to OP",
TRUNC(COALESCE(ly_total_receipt_units, 0)) as "LY Ttl Rcpt U",
TRUNC(COALESCE(total_receipt_units_wp_ly_var, 0)) as "WP Ttl Rcpt U Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(total_receipt_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP Ttl Rcpt U % Var to LY",
TRUNC(COALESCE(wp_oo_u_ttl_p, 0)) as "WP OO U (TTL-P)",
TRUNC(COALESCE(op_oo_u_ttl_p, 0)) as "OP OO U (TTL-P)",
TRUNC(COALESCE(oo_u_ttl_p_wp_op_var, 0)) as "WP OO U (TTL-P) Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(oo_u_ttl_p_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP OO U (TTL-P) % Var to OP",
TRUNC(COALESCE(oo_u_ttl_p, 0)) as "LY OO U (TTL-P)",
TRUNC(COALESCE(oo_u_ttl_p_wp_ly_var, 0)) as "WP OO U (TTL-P) Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(oo_u_ttl_p_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP OO U (TTL-P) % Var to LY",
TRUNC(COALESCE(wp_atp_units, 0)) as "WP ATP U",
TRUNC(COALESCE(wp_atp_fwos_units, 0)) as "WP ATP FWOS U",
TRUNC(COALESCE(op_atp_units, 0)) as "OP ATP U",
TRUNC(COALESCE(op_atp_fwos_units, 0)) as "OP ATP FWOS U",
TRUNC(COALESCE(ly_atp_units, 0)) as "LY ATP U",
TRUNC(COALESCE(atp_fwos_units, 0)) as "LY ATP FWOS U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to OP D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to LY D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY D Sls $",
TRUNC(COALESCE(wp_d_sls_units, 0)) as "WP D Sls U",
TRUNC(COALESCE(op_d_sls_units, 0)) as "OP D Sls U",
TRUNC(COALESCE(d_sls_units_wp_op_var, 0)) as "WP Var to OP D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP D Sls U",
TRUNC(COALESCE(d_sls_units, 0)) as "LY D Sls U",
TRUNC(COALESCE(d_sls_units_wp_ly_var, 0)) as "WP Var to LY D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY D Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(op_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_gm_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_perc_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_gm_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_perc_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM $ % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(eop_cost_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to OP EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_cost_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(eop_cost_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to LY EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_cost_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY EOP $",
TRUNC(COALESCE(wp_eop_units, 0)) as "WP EOP U",
TRUNC(COALESCE(op_eop_units, 0)) as "OP EOP U",
TRUNC(COALESCE(eop_units_wp_op_var, 0)) as "WP Var to OP EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP EOP U",
TRUNC(COALESCE(ly_eop_units, 0)) as "LY EOP U",
TRUNC(COALESCE(eop_units_wp_ly_var, 0)) as "WP Var to LY EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY EOP U"

			from final_report where channel<>''Warehouse''

			 ;' ;

ELSIF report_type = 'collection' THEN

			_query_combine := 'WITH wp_base_data AS (
					    SELECT 
					        mv.l1_name AS Division,
					        wm.dept,
					        collection_name AS collection,
					        channel,
					        wm.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                          CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					     --  store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM (' || wp_union_sql || ')  wm
					    left join (' || union_sql || ') isku on wm.hierarchy_code=isku.hierarchy_code and wm.current_week=isku.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
					    WHERE wm.dept IN ('||dept_name ||') and fiscal_year = '||fis_year ||'
						AND wm.current_week between '||sweek ||' and '||tweek ||' and channel<>''Warehouse''
						
					), 
					wp_data as (SELECT
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					   -- count(distinct hierarchy_code) cnt_hierarchy,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    wp_aoh_units,
					    wp_atp_units,
					    wp_eop_cost,
					    wp_eop_units,
					    COUNT(DISTINCT (fiscal_year, fiscal_month)) AS no_of_months,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    AVG(store_count) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM wp_base_data
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
					), wp_agg as (select Division,collection,dept, channel, fiscal_year as year, fiscal_month as month, no_of_months,
					wp_aoh_units, wp_atp_units, wp_eop_cost, wp_eop_units,
					avg(store_count) as wp_store_count, count(distinct hierarchy_code) as wp_sku_count, avg(w_air) as wp_w_air, 
					avg(w_auc) as wp_w_auc, avg(w_aur) as wp_w_aur, avg(w_dr_perc) as wp_w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
					nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_sls_units),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
					sum(w_sls_dollars) as wp_w_sls_dollars, avg(w_sls_ecom_perc) as wp_w_sls_ecom_perc, 
					sum(w_sls_units) as wp_w_sls_units, sum(w_gm_dollars) as wp_w_gm_dollars, sum(post_md_written_sales) as wp_post_md_written_sales, 
					sum(pre_md_written_sales) as wp_pre_md_written_sales, sum(post_md_written_units) as wp_post_md_written_units, sum(pre_md_written_units) as wp_pre_md_written_units, 
					sum(d_sls_dollars) as wp_d_sls_dollars, sum(d_sls_units) as wp_d_sls_units, sum(d_gm) as wp_d_gm, avg(d_aur) as wp_d_aur,
					sum(aoh_fwos_units) as wp_aoh_fwos_units, sum(total_receipt_cost) as wp_total_receipt_cost, 
					sum(total_receipt_units) as wp_total_receipt_units, sum(atp_fwos_units) as wp_atp_fwos_units,
					sum(on_order_placed_total_unit) as wp_oo_u_ttl_p
					from wp_data where  collection in ('||coll_name ||')
					group by 1,2,3,4,5,6,7,8,9,10,11), wp as (select division,collection,dept, channel, year, month, wp_store_count, wp_sku_count, w_air, w_auc, w_dr_perc,
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    wp_w_sls_dollars / NULLIF(wp_w_sls_dollars, 0)
					  ELSE 0
					END AS wp_w_sls_ecom_perc,
					wp_pre_md_written_sales, wp_post_md_written_sales, wp_pre_md_written_units, wp_post_md_written_units,
					wp_w_sls_dollars, wp_w_gm_dollars, wp_d_sls_dollars, wp_d_sls_units,no_of_months,
					avg(wp_w_sls_dollars) over
					(partition by dept, channel) as avg_monthly_sls_dollars,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_sls_dollars_3m_avg,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_sls_dollars_6m_avg,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_sls_dollars_9m_avg,
					wp_w_sls_units,
					avg(wp_w_sls_units) over
					(partition by dept, channel) as avg_monthly_sls_units,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_sls_units_3m_avg,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_sls_units_6m_avg,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_sls_units_9m_avg,
					w_aur,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_aur_3m_avg,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_aur_6m_avg,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_aur_9m_avg,
					wp_d_gm, d_aur, wp_aoh_units, wp_aoh_fwos_units, wp_atp_units, wp_atp_fwos_units,
					wp_total_receipt_cost, wp_total_receipt_units, wp_eop_cost, wp_eop_units, wp_oo_u_ttl_p
					from wp_agg), op_base_data AS (
					    SELECT 
					        mv.l1_name AS Division,
					        om.dept,
					        collection_name AS collection,
					        channel,
					        om.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                            CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					        --store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM (' || op_union_sql || ') om
					    left join (' || union_sql || ') isku on om.hierarchy_code=isku.hierarchy_code and isku.current_week = om.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON om.dept = mv.l2_name AND om.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month, fiscal_week FROM "global".fiscal_date_mapping) fdm ON fdm.fiscal_year_week = om.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON om.hierarchy_code = is2.hierarchy_code AND om.dept = is2.dept
					    WHERE om.dept IN ('||dept_name ||') and fiscal_year = '||fis_year ||'
							AND om.current_week between '||sweek ||' and '||tweek ||' 
					), op_data as (SELECT
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    op_aoh_units,
					    op_atp_units,
					    op_eop_cost,
					    op_eop_units,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    round(SUM(store_count*written_sales_units) / NULLIF(SUM(written_sales_units), 0)) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM op_base_data  where collection in ('||coll_name ||')
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
					), op_agg as (select Division,collection,dept, channel, fiscal_year as year, fiscal_month as month, 
					op_aoh_units, op_atp_units, op_eop_cost, op_eop_units,
					avg(store_count) as op_store_count, count(distinct hierarchy_code) as op_sku_count, avg(w_air) as op_w_air, 
					avg(w_auc) as op_w_auc, avg(w_aur) as op_w_aur, avg(w_dr_perc) as op_w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
					--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
					sum(w_sls_dollars) as op_w_sls_dollars, avg(w_sls_ecom_perc) as op_w_sls_ecom_perc, 
					sum(w_sls_units) as op_w_sls_units, sum(w_gm_dollars) as op_w_gm_dollars, sum(post_md_written_sales) as op_post_md_written_sales, 
					sum(pre_md_written_sales) as op_pre_md_written_sales, sum(post_md_written_units) as op_post_md_written_units, sum(pre_md_written_units) as op_pre_md_written_units, 
					sum(d_sls_dollars) as op_d_sls_dollars, sum(d_sls_units) as op_d_sls_units, sum(d_gm) as op_d_gm, avg(d_aur) as op_d_aur,
					sum(aoh_fwos_units) as op_aoh_fwos_units, sum(atp_fwos_units) as op_atp_fwos_units,
					sum(total_receipt_cost) as op_total_receipt_cost, sum(total_receipt_units) as op_total_receipt_units, 
					sum(on_order_placed_total_unit) as op_oo_u_ttl_p
					from op_data 
					group by 1,2,3,4,5,6,7,8,9,10), op as (select 
				collection,Division,
				dept, channel, year, month, op_store_count, op_sku_count, w_air, w_auc, w_dr_perc,
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    op_w_sls_dollars / NULLIF(op_w_sls_dollars, 0)
					  ELSE 0
					END AS op_w_sls_ecom_perc,
					op_pre_md_written_sales, op_post_md_written_sales, op_pre_md_written_units, op_post_md_written_units,
					op_w_sls_dollars, op_w_gm_dollars,op_d_sls_dollars,op_d_sls_units,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_sls_dollars_3m_avg,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_sls_dollars_6m_avg,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_sls_dollars_9m_avg,
					op_w_sls_units,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_sls_units_3m_avg,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_sls_units_6m_avg,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_sls_units_9m_avg,
					op_w_aur,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_aur_3m_avg,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_aur_6m_avg,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_aur_9m_avg,
					op_d_gm, op_d_aur, op_aoh_units, op_aoh_fwos_units, op_atp_units, op_atp_fwos_units, op_total_receipt_cost, 
					op_total_receipt_units, op_eop_cost, op_eop_units, op_oo_u_ttl_p
					from op_agg), ly_base_data AS (
					    SELECT 
					        mv.l1_name AS Division,
					        lm.dept,
					        collection_name AS collection,
					        channel,
					        lm.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ly_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ly_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                         CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					     --   store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM item_smart.ly_master lm
					    left join (' || union_sql || ') isku on lm.hierarchy_code=isku.hierarchy_code and isku.current_week = lm.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON lm.dept = mv.l2_name AND lm.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month, fiscal_week FROM "global".fiscal_date_mapping) fdm ON fdm.fiscal_year_week = lm.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON lm.hierarchy_code = is2.hierarchy_code AND lm.dept = is2.dept
					    WHERE lm.dept IN ('||dept_name ||') and fiscal_year = '||fis_year ||'
						 AND lm.current_week between '||sweek ||' and '||tweek ||'
					), ly_data as (SELECT
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    ly_aoh_units,
					    ly_atp_units,
					    ly_eop_cost,
					    ly_eop_units,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    AVG(store_count) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM ly_base_data  where collection in ('||coll_name ||')
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
					), ly_agg as (select collection,dept, channel, fiscal_year as year, fiscal_month as month, 
					ly_aoh_units, ly_atp_units, ly_eop_cost, ly_eop_units,
					avg(store_count) as store_count, count(distinct hierarchy_code) as sku_count, avg(w_air) as w_air, 
					avg(w_auc) as w_auc, avg(w_aur) as w_aur, avg(w_dr_perc) as w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_aur,
					--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_dr_perc,
					sum(w_sls_dollars) as w_sls_dollars, avg(w_sls_ecom_perc) as w_sls_ecom_perc, 
					sum(w_sls_units) as w_sls_units, sum(w_gm_dollars) as w_gm_dollars, sum(post_md_written_sales) as post_md_written_sales, 
					sum(pre_md_written_sales) as pre_md_written_sales, sum(post_md_written_units) as post_md_written_units, sum(pre_md_written_units) as pre_md_written_units, 
					sum(d_sls_dollars) as d_sls_dollars, sum(d_sls_units) as d_sls_units, sum(d_gm) as d_gm, avg(d_aur) as d_aur,
					sum(aoh_fwos_units) as aoh_fwos_units, sum(atp_fwos_units) as atp_fwos_units,
					sum(total_receipt_cost) as total_receipt_cost, sum(total_receipt_units) as total_receipt_units, sum(on_order_placed_total_unit) as oo_u_ttl_p
					from ly_data
					group by 1,2,3,4,5,6,7,8,9), 
					ly as (select collection,dept, channel, year, month, store_count, sku_count, ly_w_air, ly_w_auc, ly_w_dr_perc, 
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    w_sls_dollars / NULLIF(w_sls_dollars, 0)
					  ELSE 0
					END AS w_sls_ecom_perc,
					pre_md_written_sales, post_md_written_sales, pre_md_written_units, post_md_written_units,
					w_sls_dollars, w_gm_dollars, d_sls_dollars, d_sls_units,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_sls_dollars_3m_avg,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_sls_dollars_6m_avg,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_sls_dollars_9m_avg,
					w_sls_units,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_sls_units_3m_avg,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_sls_units_6m_avg,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_sls_units_9m_avg,
					ly_w_aur,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_aur_3m_avg,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_aur_6m_avg,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_aur_9m_avg,
					d_gm, d_aur, ly_aoh_units, aoh_fwos_units, ly_atp_units, atp_fwos_units,
					total_receipt_cost, total_receipt_units, oo_u_ttl_p, ly_eop_cost, ly_eop_units
					from ly_agg
					), final_data as (select wp.Division,wp.collection,dept, channel, year, month, CAST(COALESCE(wp_store_count, 0) AS INT) AS wp_store_count,
					CAST(wp_sku_count AS INT) AS wp_sku_count, wp.w_air, wp.w_auc,
					no_of_months, avg_monthly_sls_dollars, wp_w_sls_dollars_3m_avg, wp_w_sls_dollars_6m_avg, wp_w_sls_dollars_9m_avg,
					avg_monthly_sls_units, wp_w_sls_units_3m_avg, wp_w_sls_units_6m_avg, wp_w_sls_units_9m_avg,
					wp_w_sls_dollars, wp_pre_md_written_sales, wp_post_md_written_sales, 
					wp_w_sls_ecom_perc, op_w_sls_dollars, op_pre_md_written_sales, op_post_md_written_sales,
					op_w_sls_ecom_perc, (wp_w_sls_dollars - op_w_sls_dollars) as w_sls_dollars_wp_op_var,
					(wp_pre_md_written_sales - op_pre_md_written_sales) as pre_md_w_sls_dollars_wp_op_var,
					(wp_post_md_written_sales - op_post_md_written_sales) as post_md_w_sls_dollars_wp_op_var,
					(wp_w_sls_dollars - op_w_sls_dollars) / NULLIF(op_w_sls_dollars, 0) as w_sls_dollars_wp_op_var_perc,
					(wp_pre_md_written_sales - op_pre_md_written_sales) / NULLIF(op_pre_md_written_sales, 0) as pre_md_w_sls_dollars_wp_op_var_perc,
					(wp_post_md_written_sales - op_post_md_written_sales) / NULLIF(op_post_md_written_sales, 0) as post_md_w_sls_dollars_wp_op_var_perc,
					ly.w_sls_dollars as ly_w_sls_dollars, ly.pre_md_written_sales as ly_pre_md_written_sales, ly.post_md_written_sales as ly_post_md_written_sales,
					ly.w_sls_ecom_perc as ly_w_sls_ecom_perc, (wp_w_sls_dollars - ly.w_sls_dollars) as w_sls_dollars_wp_ly_var,
					(wp_pre_md_written_sales - ly.pre_md_written_sales) as pre_md_w_sls_dollars_wp_ly_var,
					(wp_post_md_written_sales - ly.post_md_written_sales) as post_md_w_sls_dollars_wp_ly_var,
					(wp_w_sls_dollars - ly.w_sls_dollars) / NULLIF(ly.w_sls_dollars, 0) as w_sls_dollars_wp_ly_var_perc,
					(wp_pre_md_written_sales - ly.pre_md_written_sales) / NULLIF(ly.pre_md_written_sales, 0) as pre_md_w_sls_dollars_wp_ly_var_perc,
					(wp_post_md_written_sales - ly.post_md_written_sales) / NULLIF(ly.post_md_written_sales, 0) as post_md_w_sls_dollars_wp_ly_var_perc,
					wp_w_sls_units, wp_pre_md_written_units, wp_post_md_written_units,
					op_w_sls_units, op_pre_md_written_units, op_post_md_written_units,
					(wp_w_sls_units - op_w_sls_units) as w_sls_units_wp_op_var,
					(wp_pre_md_written_units - op_pre_md_written_units) as pre_md_w_sls_units_wp_op_var,
					(wp_post_md_written_units - op_post_md_written_units) as post_md_w_sls_units_wp_op_var,
					(wp_w_sls_units - op_w_sls_units) / NULLIF(op_w_sls_units, 0) as w_sls_units_wp_op_var_perc,
					(wp_pre_md_written_units - op_pre_md_written_units) / NULLIF(op_pre_md_written_units, 0) as pre_md_w_sls_units_wp_op_var_perc,
					(wp_post_md_written_units - op_post_md_written_units) / NULLIF(op_post_md_written_units, 0) as post_md_w_sls_units_wp_op_var_perc,
					ly.w_sls_units as ly_w_sls_units, ly.pre_md_written_units as ly_pre_md_written_units, ly.post_md_written_units as ly_post_md_written_units,
					(wp_w_sls_units - ly.w_sls_units) as w_sls_units_wp_ly_var,
					(wp_pre_md_written_units - ly.pre_md_written_units) as pre_md_w_sls_units_wp_ly_var,
					(wp_post_md_written_units - ly.post_md_written_units) as post_md_w_sls_units_wp_ly_var,
					(wp_w_sls_units - ly.w_sls_dollars) / NULLIF(ly.w_sls_units, 0) as w_sls_units_wp_ly_var_perc,
					(wp_pre_md_written_units - ly.pre_md_written_units) / NULLIF(ly.pre_md_written_units, 0) as pre_md_w_sls_units_wp_ly_var_perc,
					(wp_post_md_written_units - ly.post_md_written_units) / NULLIF(ly.post_md_written_units, 0) as post_md_w_sls_units_wp_ly_var_perc,
					wp.w_aur, wp_w_aur_3m_avg, wp_w_aur_6m_avg, wp_w_aur_9m_avg, op_w_aur, ly_w_aur,
					wp.w_dr_perc as wp_w_dr_perc, op.w_dr_perc as op_w_dr_perc, ly_w_dr_perc,
					wp_w_gm_dollars, NULLIF(wp_w_gm_dollars, 0) / NULLIF(wp_w_sls_dollars, 0) as wp_w_gm_perc, 
					op_w_gm_dollars, NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0) as op_w_gm_perc,
					(wp_w_gm_dollars - op_w_gm_dollars) as w_gm_dollars_wp_op_var,
					((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)))/(NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)) as w_gm_perc_wp_op_var,
					(wp_w_gm_dollars - op_w_gm_dollars) / NULLIF(op_w_gm_dollars, 0) as w_gm_dollars_wp_op_var_perc,
					ly.w_gm_dollars as ly_w_gm_dollars, NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0) as ly_w_gm_perc,
					(wp_w_gm_dollars - ly.w_gm_dollars) as w_gm_dollars_wp_ly_var,
					((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0)))/(NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0)) as w_gm_perc_wp_ly_var,
					(wp_w_gm_dollars - ly.w_gm_dollars) / NULLIF(ly.w_gm_dollars, 0) as w_gm_dollars_wp_ly_var_perc,
					wp_aoh_units, wp_aoh_fwos_units, op_aoh_units, op_aoh_fwos_units,
					ly_aoh_units, ly.aoh_fwos_units as ly_aoh_fwos_units,
					wp_total_receipt_units, op_total_receipt_units, 
					(wp_total_receipt_units - op_total_receipt_units) as total_receipt_units_wp_op_var,
					(wp_total_receipt_units - op_total_receipt_units) / NULLIF(op_total_receipt_units, 0) as total_receipt_units_wp_op_var_perc,
					ly.total_receipt_units as ly_total_receipt_units,
					(wp_total_receipt_units - ly.total_receipt_units) as total_receipt_units_wp_ly_var,
					(wp_total_receipt_units - ly.total_receipt_units) / NULLIF(ly.total_receipt_units, 0) as total_receipt_units_wp_ly_var_perc,
					wp_oo_u_ttl_p, op_oo_u_ttl_p,
					(wp_oo_u_ttl_p - op_oo_u_ttl_p) as oo_u_ttl_p_wp_op_var,
					(wp_oo_u_ttl_p - op_oo_u_ttl_p)/NULLIF(op_oo_u_ttl_p, 0) as oo_u_ttl_p_wp_op_var_perc,
					oo_u_ttl_p, (wp_oo_u_ttl_p - oo_u_ttl_p) as oo_u_ttl_p_wp_ly_var,
					(wp_oo_u_ttl_p - oo_u_ttl_p)/NULLIF(oo_u_ttl_p, 0) as oo_u_ttl_p_wp_ly_var_perc,
					wp_atp_units, wp_atp_fwos_units, op_atp_units, op_atp_fwos_units, ly_atp_units, ly.atp_fwos_units,
					wp_d_sls_dollars, op_d_sls_dollars,
					(wp_d_sls_dollars - op_d_sls_dollars) as d_sls_dollars_wp_op_var,
					(wp_d_sls_dollars - op_d_sls_dollars)/NULLIF(op_d_sls_dollars, 0) as d_sls_dollars_wp_op_var_perc,
					ly.d_sls_dollars, 
					(wp_d_sls_dollars - ly.d_sls_dollars) as d_sls_dollars_wp_ly_var,
					(wp_d_sls_dollars - ly.d_sls_dollars)/NULLIF(ly.d_sls_dollars, 0) as d_sls_dollars_wp_ly_var_perc,
					wp_d_sls_units, op_d_sls_units,
					(wp_d_sls_units - op_d_sls_units) as d_sls_units_wp_op_var,
					(wp_d_sls_units - op_d_sls_units)/NULLIF(op_d_sls_units, 0) as d_sls_units_wp_op_var_perc,
					ly.d_sls_units, 
					(wp_d_sls_units - ly.d_sls_units) as d_sls_units_wp_ly_var,
					(wp_d_sls_units - ly.d_sls_units)/NULLIF(ly.d_sls_units, 0) as d_sls_units_wp_ly_var_perc,
					wp.d_aur as wp_d_aur, op_d_aur, ly.d_aur as ly_d_aur,
					wp_d_gm, NULLIF(wp_d_gm, 0) / NULLIF(wp_d_sls_dollars, 0) as wp_d_gm_perc, 
					op_d_gm, NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0) as op_d_gm_perc,
					(wp_d_gm - op_d_gm) as d_gm_wp_op_var,
					((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)))/(NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)) as d_gm_perc_wp_op_var,
					(wp_d_gm - op_d_gm) / NULLIF(op_d_gm, 0) as d_gm_wp_op_var_perc,
					ly.d_gm as ly_d_gm, NULLIF(ly.d_gm, 0) / NULLIF(ly.w_sls_dollars, 0) as ly_d_gm_perc,
					(wp_d_gm - ly.d_gm) as d_gm_wp_ly_var,
					((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(ly.d_gm, 0) / NULLIF(ly.d_sls_dollars, 0)))/(NULLIF(ly.d_gm, 0) / NULLIF(ly.d_sls_dollars, 0)) as d_gm_perc_wp_ly_var,
					(wp_d_gm - ly.d_gm) / NULLIF(ly.d_gm, 0) as d_gm_wp_ly_var_perc,
					wp_eop_cost, op_eop_cost,
					(wp_eop_cost - op_eop_cost) as eop_cost_wp_op_var,
					(wp_eop_cost - op_eop_cost) / NULLIF(op_eop_cost, 0) as eop_cost_wp_op_var_perc,
					ly_eop_cost,
					(wp_eop_cost - ly_eop_cost) as eop_cost_wp_ly_var,
					(wp_eop_cost - ly_eop_cost) / NULLIF(ly_eop_cost, 0) as eop_cost_wp_ly_var_perc,
					wp_eop_units, op_eop_units,
					(wp_eop_units - op_eop_units) as eop_units_wp_op_var,
					(wp_eop_units - op_eop_units) / NULLIF(op_eop_units, 0) as eop_units_wp_op_var_perc,
					ly_eop_units,
					(wp_eop_units - ly_eop_units) as eop_units_wp_ly_var,
					(wp_eop_units - ly_eop_units) / NULLIF(ly_eop_units, 0) as eop_units_wp_ly_var_perc
					from wp
					left join op using (dept, channel, year, month)
					left join ly using (dept, channel, year, month)
					order by year, month), omni_channel AS (
					    SELECT
				Division,
					collection,
					        dept,
					        ''Omni'' AS channel,
					        year,
					        month,
					        CAST(COALESCE(SUM(wp_store_count), 0) AS INT) AS wp_store_count,
					CAST(COALESCE(SUM(wp_sku_count), 0)AS INT) AS wp_sku_count,
					COALESCE(AVG(w_air), 0) AS w_air,
					COALESCE(AVG(w_auc), 0) AS w_auc,
					COALESCE(MAX(no_of_months), 0) AS no_of_months,
					COALESCE(SUM(avg_monthly_sls_dollars), 0) AS avg_monthly_sls_dollars,
					COALESCE(AVG(wp_w_sls_dollars_3m_avg), 0) AS wp_w_sls_dollars_3m_avg,
					COALESCE(AVG(wp_w_sls_dollars_6m_avg), 0) AS wp_w_sls_dollars_6m_avg,
					COALESCE(AVG(wp_w_sls_dollars_9m_avg), 0) AS wp_w_sls_dollars_9m_avg,
					COALESCE(SUM(avg_monthly_sls_units), 0) AS avg_monthly_sls_units,
					COALESCE(AVG(wp_w_sls_units_3m_avg), 0) AS wp_w_sls_units_3m_avg,
					COALESCE(AVG(wp_w_sls_units_6m_avg), 0) AS wp_w_sls_units_6m_avg,
					COALESCE(AVG(wp_w_sls_units_9m_avg), 0) AS wp_w_sls_units_9m_avg,
					COALESCE(SUM(wp_w_sls_dollars), 0) AS wp_w_sls_dollars,
					COALESCE(SUM(wp_pre_md_written_sales), 0) AS wp_pre_md_written_sales,
					COALESCE(SUM(wp_post_md_written_sales), 0) AS wp_post_md_written_sales,
					COALESCE(SUM(wp_w_sls_ecom_perc * wp_w_sls_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0), 0) AS wp_w_sls_ecom_perc,
					COALESCE(SUM(op_w_sls_dollars), 0) AS op_w_sls_dollars,
					COALESCE(SUM(op_pre_md_written_sales), 0) AS op_pre_md_written_sales,
					COALESCE(SUM(op_post_md_written_sales), 0) AS op_post_md_written_sales,
					COALESCE(SUM(op_w_sls_ecom_perc * op_w_sls_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS op_w_sls_ecom_perc,
					COALESCE(SUM(w_sls_dollars_wp_op_var), 0) AS w_sls_dollars_wp_op_var,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var), 0) AS pre_md_w_sls_dollars_wp_op_var,
					COALESCE(SUM(post_md_w_sls_dollars_wp_op_var), 0) AS post_md_w_sls_dollars_wp_op_var,
					COALESCE(SUM(w_sls_dollars_wp_op_var) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var) / NULLIF(SUM(op_pre_md_written_sales), 0), 0) AS pre_md_w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(post_md_w_sls_dollars_wp_op_var) / NULLIF(SUM(op_post_md_written_sales), 0), 0) AS post_md_w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(ly_w_sls_dollars), 0) AS ly_w_sls_dollars,
					COALESCE(SUM(ly_pre_md_written_sales), 0) AS ly_pre_md_written_sales,
					COALESCE(SUM(ly_post_md_written_sales), 0) AS ly_post_md_written_sales,
					COALESCE(SUM(ly_w_sls_ecom_perc * ly_w_sls_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS ly_w_sls_ecom_perc,
					COALESCE(SUM(w_sls_dollars_wp_ly_var), 0) AS w_sls_dollars_wp_ly_var,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var), 0) AS pre_md_w_sls_dollars_wp_ly_var,
					COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var), 0) AS post_md_w_sls_dollars_wp_ly_var,
					COALESCE(SUM(w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_pre_md_written_sales), 0), 0) AS pre_md_w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_post_md_written_sales), 0), 0) AS post_md_w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_w_sls_units), 0) AS wp_w_sls_units,
					COALESCE(SUM(wp_pre_md_written_units), 0) AS wp_pre_md_written_units,
					COALESCE(SUM(wp_post_md_written_units), 0) AS wp_post_md_written_units,
					COALESCE(SUM(op_w_sls_units), 0) AS op_w_sls_units,
					COALESCE(SUM(op_pre_md_written_units), 0) AS op_pre_md_written_units,
					COALESCE(SUM(op_post_md_written_units), 0) AS op_post_md_written_units,
					COALESCE(SUM(w_sls_units_wp_op_var), 0) AS w_sls_units_wp_op_var,
					COALESCE(SUM(pre_md_w_sls_units_wp_op_var), 0) AS pre_md_w_sls_units_wp_op_var,
					COALESCE(SUM(post_md_w_sls_units_wp_op_var), 0) AS post_md_w_sls_units_wp_op_var,
					COALESCE(SUM(w_sls_units_wp_op_var) / NULLIF(SUM(op_w_sls_units), 0), 0) AS w_sls_units_wp_op_var_perc,
					COALESCE(SUM(pre_md_w_sls_units_wp_op_var) / NULLIF(SUM(op_pre_md_written_units), 0), 0) AS pre_md_w_sls_units_wp_op_var_perc,
					COALESCE(SUM(post_md_w_sls_units_wp_op_var) / NULLIF(SUM(op_post_md_written_units), 0), 0) AS post_md_w_sls_units_wp_op_var_perc,
					COALESCE(SUM(ly_w_sls_units), 0) AS ly_w_sls_units,
					COALESCE(SUM(ly_pre_md_written_units), 0) AS ly_pre_md_written_units,
					COALESCE(SUM(ly_post_md_written_units), 0) AS ly_post_md_written_units,
					COALESCE(SUM(w_sls_units_wp_ly_var), 0) AS w_sls_units_wp_ly_var,
					COALESCE(SUM(pre_md_w_sls_units_wp_ly_var), 0) AS pre_md_w_sls_units_wp_ly_var,
					COALESCE(SUM(post_md_w_sls_units_wp_ly_var), 0) AS post_md_w_sls_units_wp_ly_var,
					COALESCE(SUM(w_sls_units_wp_ly_var) / NULLIF(SUM(ly_w_sls_units), 0), 0) AS w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(pre_md_w_sls_units_wp_ly_var) / NULLIF(SUM(ly_pre_md_written_units), 0), 0) AS pre_md_w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(post_md_w_sls_units_wp_ly_var) / NULLIF(SUM(ly_post_md_written_units), 0), 0) AS post_md_w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(wp_w_sls_dollars) / NULLIF(SUM(wp_w_sls_units), 0), 0) AS w_aur,
					COALESCE(AVG(wp_w_aur_3m_avg), 0) AS wp_w_aur_3m_avg,
					COALESCE(AVG(wp_w_aur_6m_avg), 0) AS wp_w_aur_6m_avg,
					COALESCE(AVG(wp_w_aur_9m_avg), 0) AS wp_w_aur_9m_avg,
					COALESCE(SUM(op_w_sls_dollars) / NULLIF(SUM(op_w_sls_units), 0), 0) AS op_w_aur,
					COALESCE(SUM(ly_w_sls_dollars) / NULLIF(SUM(ly_w_sls_units), 0), 0) AS ly_w_aur,
					COALESCE(AVG(wp_w_dr_perc), 0) AS wp_w_dr_perc,
					COALESCE(AVG(op_w_dr_perc), 0) AS op_w_dr_perc,
					COALESCE(AVG(ly_w_dr_perc), 0) AS ly_w_dr_perc,
					COALESCE(SUM(wp_w_gm_dollars), 0) AS wp_w_gm_dollars,
					COALESCE(SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0), 0) AS wp_w_gm_perc,
					COALESCE(SUM(op_w_gm_dollars), 0) AS op_w_gm_dollars,
					COALESCE(SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS op_w_gm_perc,
					COALESCE(SUM(w_gm_dollars_wp_op_var), 0) AS w_gm_dollars_wp_op_var,
					COALESCE((SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0) - SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0)) / NULLIF(SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0), 0) AS w_gm_perc_wp_op_var,
					COALESCE(SUM(w_gm_dollars_wp_op_var) / NULLIF(SUM(op_w_gm_dollars), 0), 0) AS w_gm_dollars_wp_op_var_perc,
					COALESCE(SUM(ly_w_gm_dollars), 0) AS ly_w_gm_dollars,
					COALESCE(SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS ly_w_gm_perc,
					COALESCE(SUM(w_gm_dollars_wp_ly_var), 0) AS w_gm_dollars_wp_ly_var,
					COALESCE((SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0) - SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0)) / NULLIF(SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0), 0) AS w_gm_perc_wp_ly_var,
					COALESCE(SUM(w_gm_dollars_wp_ly_var) / NULLIF(SUM(ly_w_gm_dollars), 0), 0) AS w_gm_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_aoh_units), 0) AS wp_aoh_units,
					COALESCE(SUM(wp_aoh_fwos_units), 0) AS wp_aoh_fwos_units,
					COALESCE(SUM(op_aoh_units), 0) AS op_aoh_units,
					COALESCE(SUM(op_aoh_fwos_units), 0) AS op_aoh_fwos_units,
					COALESCE(SUM(ly_aoh_units), 0) AS ly_aoh_units,
					COALESCE(SUM(ly_aoh_fwos_units), 0) AS ly_aoh_fwos_units,
					COALESCE(SUM(wp_total_receipt_units), 0) AS wp_total_receipt_units,
					COALESCE(SUM(op_total_receipt_units), 0) AS op_total_receipt_units,
					COALESCE(SUM(total_receipt_units_wp_op_var), 0) AS total_receipt_units_wp_op_var,
					COALESCE(SUM(total_receipt_units_wp_op_var) / NULLIF(SUM(op_total_receipt_units), 0), 0) AS total_receipt_units_wp_op_var_perc,
					COALESCE(SUM(ly_total_receipt_units), 0) AS ly_total_receipt_units,
					COALESCE(SUM(total_receipt_units_wp_ly_var), 0) AS total_receipt_units_wp_ly_var,
					COALESCE(SUM(total_receipt_units_wp_ly_var) / NULLIF(SUM(ly_total_receipt_units), 0), 0) AS total_receipt_units_wp_ly_var_perc,
					COALESCE(SUM(wp_oo_u_ttl_p), 0) AS wp_oo_u_ttl_p,
					COALESCE(SUM(op_oo_u_ttl_p), 0) AS op_oo_u_ttl_p,
					COALESCE(SUM(oo_u_ttl_p_wp_op_var), 0) AS oo_u_ttl_p_wp_op_var,
					COALESCE(SUM(oo_u_ttl_p_wp_op_var) / NULLIF(SUM(op_oo_u_ttl_p), 0), 0) AS oo_u_ttl_p_wp_op_var_perc,
					COALESCE(SUM(oo_u_ttl_p), 0) AS oo_u_ttl_p,
					COALESCE(SUM(oo_u_ttl_p_wp_ly_var), 0) AS oo_u_ttl_p_wp_ly_var,
					COALESCE(SUM(oo_u_ttl_p_wp_ly_var) / NULLIF(SUM(oo_u_ttl_p), 0), 0) AS oo_u_ttl_p_wp_ly_var_perc,
					COALESCE(SUM(wp_atp_units), 0) AS wp_atp_units,
					COALESCE(SUM(wp_atp_fwos_units), 0) AS wp_atp_fwos_units,
					COALESCE(SUM(op_atp_units), 0) AS op_atp_units,
					COALESCE(SUM(op_atp_fwos_units), 0) AS op_atp_fwos_units,
					COALESCE(SUM(ly_atp_units), 0) AS ly_atp_units,
					COALESCE(SUM(atp_fwos_units), 0) AS atp_fwos_units,
					COALESCE(SUM(wp_d_sls_dollars), 0) AS wp_d_sls_dollars,
					COALESCE(SUM(op_d_sls_dollars), 0) AS op_d_sls_dollars,
					COALESCE(SUM(d_sls_dollars_wp_op_var), 0) AS d_sls_dollars_wp_op_var,
					COALESCE(SUM(d_sls_dollars_wp_op_var) / NULLIF(SUM(op_d_sls_dollars), 0), 0) AS d_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(d_sls_dollars), 0) AS d_sls_dollars,
					COALESCE(SUM(d_sls_dollars_wp_ly_var), 0) AS d_sls_dollars_wp_ly_var,
					COALESCE(SUM(d_sls_dollars_wp_ly_var) / NULLIF(SUM(d_sls_dollars), 0), 0) AS d_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_d_sls_units), 0) AS wp_d_sls_units,
					COALESCE(SUM(op_d_sls_units), 0) AS op_d_sls_units,
					COALESCE(SUM(d_sls_units_wp_op_var), 0) AS d_sls_units_wp_op_var,
					COALESCE(SUM(d_sls_units_wp_op_var) / NULLIF(SUM(op_d_sls_units), 0), 0) AS d_sls_units_wp_op_var_perc,
					COALESCE(SUM(d_sls_units), 0) AS d_sls_units,
					COALESCE(SUM(d_sls_units_wp_ly_var), 0) AS d_sls_units_wp_ly_var,
					COALESCE(SUM(d_sls_units_wp_ly_var) / NULLIF(SUM(d_sls_units), 0), 0) AS d_sls_units_wp_ly_var_perc,
					COALESCE(AVG(wp_d_aur), 0) AS wp_d_aur,
					COALESCE(AVG(op_d_aur), 0) AS op_d_aur,
					COALESCE(AVG(ly_d_aur), 0) AS ly_d_aur,
					COALESCE(SUM(wp_d_gm), 0) AS wp_d_gm,
					COALESCE(SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0), 0) AS wp_d_gm_perc,
					COALESCE(SUM(op_d_gm), 0) AS op_d_gm,
					COALESCE(SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0), 0) AS op_d_gm_perc,
					COALESCE(SUM(d_gm_wp_op_var), 0) AS d_gm_wp_op_var,
					COALESCE((SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0) - SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0)) / NULLIF(SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0), 0), 0) AS d_gm_perc_wp_op_var,
					COALESCE(SUM(d_gm_wp_op_var) / NULLIF(SUM(op_d_gm), 0), 0) AS d_gm_wp_op_var_perc,
					COALESCE(SUM(ly_d_gm), 0) AS ly_d_gm,
					COALESCE(SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0), 0) AS ly_d_gm_perc,
					COALESCE(SUM(d_gm_wp_ly_var), 0) AS d_gm_wp_ly_var,
					COALESCE((SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0) - SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0)) / NULLIF(SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0), 0), 0) AS d_gm_perc_wp_ly_var,
					COALESCE(SUM(d_gm_wp_ly_var) / NULLIF(SUM(ly_d_gm), 0), 0) AS d_gm_wp_ly_var_perc,
					COALESCE(SUM(wp_eop_cost), 0) AS wp_eop_cost,
					COALESCE(SUM(op_eop_cost), 0) AS op_eop_cost,
					COALESCE(SUM(eop_cost_wp_op_var), 0) AS eop_cost_wp_op_var,
					COALESCE(SUM(eop_cost_wp_op_var) / NULLIF(SUM(op_eop_cost), 0), 0) AS eop_cost_wp_op_var_perc,
					COALESCE(SUM(ly_eop_cost), 0) AS ly_eop_cost,
					COALESCE(SUM(eop_cost_wp_ly_var), 0) AS eop_cost_wp_ly_var,
					COALESCE(SUM(eop_cost_wp_ly_var) / NULLIF(SUM(ly_eop_cost), 0), 0) AS eop_cost_wp_ly_var_perc,
					COALESCE(SUM(wp_eop_units), 0) AS wp_eop_units,
					COALESCE(SUM(op_eop_units), 0) AS op_eop_units,
					COALESCE(SUM(eop_units_wp_op_var), 0) AS eop_units_wp_op_var,
					COALESCE(SUM(eop_units_wp_op_var) / NULLIF(SUM(op_eop_units), 0), 0) AS eop_units_wp_op_var_perc,
					COALESCE(SUM(ly_eop_units), 0) AS ly_eop_units,
					COALESCE(SUM(eop_units_wp_ly_var), 0) AS eop_units_wp_ly_var,
					COALESCE(SUM(eop_units_wp_ly_var) / NULLIF(SUM(ly_eop_units), 0), 0) AS eop_units_wp_ly_var
					        from final_data
					        group by 1,2,3,4,5,6
					        order by year, month
					),final_report as
			(SELECT * from final_data
			union all
			select *from omni_channel
			order by year, month
			)
-----collection final--------
SELECT
    distinct '||report_type||' as "' || INITCAP(report_type) || '",
    channel AS "Channel",
COALESCE(SUM(wp_store_count), 0) AS "Store Count",
COALESCE(SUM(wp_sku_count), 0) AS "# of SKUs",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_air), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "AIR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_auc), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "AUC",
COALESCE(SUM(no_of_months), 0) AS "WP # of Months w/Sls",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(avg_monthly_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Avg Monthly W Sls$",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_dollars_3m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "3 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_dollars_6m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "6 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_dollars_9m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "9 mo Avg Month W Sls $",
TRUNC(COALESCE(SUM(avg_monthly_sls_units), 0)) AS "WP Avg Monthly W U Sls",
TRUNC(COALESCE(SUM(wp_w_sls_units_3m_avg), 0)) AS "3 mo Avg Month W Sls U",
TRUNC(COALESCE(SUM(wp_w_sls_units_6m_avg), 0)) AS "6 mo Avg Month W Sls U",
TRUNC(COALESCE(SUM(wp_w_sls_units_9m_avg), 0)) AS "9 mo Avg Month W Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_pre_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_post_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_ecom_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_w_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_pre_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_post_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(op_w_sls_ecom_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_sls_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PreMD Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_sls_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PreMD % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PostMD % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_w_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_pre_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_post_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(ly_w_sls_ecom_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_sls_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PreMD Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_sls_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PreMD % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PostMD % Var to LY",
TRUNC(COALESCE(SUM(wp_w_sls_units), 0)) AS "WP W Sls U",
TRUNC(COALESCE(SUM(wp_pre_md_written_units), 0)) AS "WP W Sls U - PreMD",
TRUNC(COALESCE(SUM(wp_post_md_written_units), 0)) AS "WP W Sls U - PostMD",
TRUNC(COALESCE(SUM(op_w_sls_units), 0)) AS "OP W Sls U",
TRUNC(COALESCE(SUM(op_pre_md_written_units), 0)) AS "OP W Sls U - PreMD",
TRUNC(COALESCE(SUM(op_post_md_written_units), 0)) AS "OP W Sls U - PostMD",
TRUNC(COALESCE(SUM(w_sls_units_wp_op_var), 0)) AS "WP W Sls U Var to OP",
TRUNC(COALESCE(SUM(pre_md_w_sls_units_wp_op_var), 0)) AS "WP W Sls U - PreMD Var to OP",
TRUNC(COALESCE(SUM(post_md_w_sls_units_wp_op_var), 0)) AS "WP W Sls U - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_sls_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PreMD % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PostMD % Var to OP",
TRUNC(COALESCE(SUM(ly_w_sls_units), 0)) AS "LY W Sls U",
TRUNC(COALESCE(SUM(ly_pre_md_written_units), 0)) AS "LY W Sls U - PreMD",
TRUNC(COALESCE(SUM(ly_post_md_written_units), 0)) AS "LY W Sls U - PostMD",
TRUNC(COALESCE(SUM(w_sls_units_wp_ly_var), 0)) AS "WP W Sls U Var to LY",
TRUNC(COALESCE(SUM(pre_md_w_sls_units_wp_ly_var), 0)) AS "WP W Sls U - PreMD Var to LY",
TRUNC(COALESCE(SUM(post_md_w_sls_units_wp_ly_var), 0)) AS "WP W Sls U - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_sls_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PreMD % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PostMD % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_aur), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_aur_3m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "3 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_aur_6m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "6 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_aur_9m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "9 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_w_aur), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_w_aur), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W AUR",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(wp_w_dr_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(op_w_dr_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(ly_w_dr_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY W DR%",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_gm_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(wp_w_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_w_gm_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(op_w_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_gm_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_gm_perc_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_gm_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_w_gm_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(ly_w_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_gm_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_gm_perc_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_gm_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM $ % Var to LY",
TRUNC(COALESCE(SUM(wp_aoh_units), 0)) AS "WP AOH U",
TRUNC(COALESCE(SUM(wp_aoh_fwos_units), 0)) AS "WP AOH FWOS U",
TRUNC(COALESCE(SUM(op_aoh_units), 0)) AS "OP AOH U",
TRUNC(COALESCE(SUM(op_aoh_fwos_units), 0)) AS "OP AOH FWOS U",
TRUNC(COALESCE(SUM(ly_aoh_units), 0)) AS "LY AOH U",
TRUNC(COALESCE(SUM(ly_aoh_fwos_units), 0)) AS "LY AOH FWOS U",
TRUNC(COALESCE(SUM(wp_total_receipt_units), 0)) AS "WP Ttl Rcpt U",
TRUNC(COALESCE(SUM(op_total_receipt_units), 0)) AS "OP Ttl Rcpt U",
TRUNC(COALESCE(SUM(total_receipt_units_wp_op_var), 0)) AS "WP Ttl Rcpt U Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(total_receipt_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP Ttl Rcpt U % Var to OP",
TRUNC(COALESCE(SUM(ly_total_receipt_units), 0)) AS "LY Ttl Rcpt U",
TRUNC(COALESCE(SUM(total_receipt_units_wp_ly_var), 0)) AS "WP Ttl Rcpt U Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(total_receipt_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP Ttl Rcpt U % Var to LY",
TRUNC(COALESCE(SUM(wp_oo_u_ttl_p), 0)) AS "WP OO U (TTL-P)",
TRUNC(COALESCE(SUM(op_oo_u_ttl_p), 0)) AS "OP OO U (TTL-P)",
TRUNC(COALESCE(SUM(oo_u_ttl_p_wp_op_var), 0)) AS "WP OO U (TTL-P) Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(oo_u_ttl_p_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP OO U (TTL-P) % Var to OP",
TRUNC(COALESCE(SUM(oo_u_ttl_p), 0)) AS "LY OO U (TTL-P)",
TRUNC(COALESCE(SUM(oo_u_ttl_p_wp_ly_var), 0)) AS "WP OO U (TTL-P) Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(oo_u_ttl_p_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP OO U (TTL-P) % Var to LY",
TRUNC(COALESCE(SUM(wp_atp_units), 0)) AS "WP ATP U",
TRUNC(COALESCE(SUM(wp_atp_fwos_units), 0)) AS "WP ATP FWOS U",
TRUNC(COALESCE(SUM(op_atp_units), 0)) AS "OP ATP U",
TRUNC(COALESCE(SUM(op_atp_fwos_units), 0)) AS "OP ATP FWOS U",
TRUNC(COALESCE(SUM(ly_atp_units), 0)) AS "LY ATP U",
TRUNC(COALESCE(SUM(atp_fwos_units), 0)) AS "LY ATP FWOS U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_d_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_d_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to OP D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to LY D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY D Sls $",
TRUNC(COALESCE(SUM(wp_d_sls_units), 0)) AS "WP D Sls U",
TRUNC(COALESCE(SUM(op_d_sls_units), 0)) AS "OP D Sls U",
TRUNC(COALESCE(SUM(d_sls_units_wp_op_var), 0)) AS "WP Var to OP D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_sls_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP D Sls U",
TRUNC(COALESCE(SUM(d_sls_units), 0)) AS "LY D Sls U",
TRUNC(COALESCE(SUM(d_sls_units_wp_ly_var), 0)) AS "WP Var to LY D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_sls_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY D Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_d_aur), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_d_aur), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_d_aur), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_d_gm), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(wp_d_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_d_gm), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(op_d_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_gm_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_gm_perc_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_gm_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_d_gm), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(ly_d_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_gm_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_gm_perc_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_gm_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM $ % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_eop_cost), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_eop_cost), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(eop_cost_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to OP EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(eop_cost_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_eop_cost), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(eop_cost_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to LY EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(eop_cost_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY EOP $",
TRUNC(COALESCE(SUM(wp_eop_units), 0)) AS "WP EOP U",
TRUNC(COALESCE(SUM(op_eop_units), 0)) AS "OP EOP U",
TRUNC(COALESCE(SUM(eop_units_wp_op_var), 0)) AS "WP Var to OP EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(eop_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP EOP U",
TRUNC(COALESCE(SUM(ly_eop_units), 0)) AS "LY EOP U",
TRUNC(COALESCE(SUM(eop_units_wp_ly_var), 0)) AS "WP Var to LY EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(eop_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY EOP U"
FROM
    final_report
WHERE
    channel <> ''Warehouse'' and  collection in ('||coll_name ||')
GROUP BY
    '||report_type||' ,
    channel;' ;
	
	elsif report_type = 'division' THEN

			_query_combine := 'WITH wp_base_data AS (
					    SELECT 
					        mv.l1_name AS Division,
					        wm.dept,
					        collection_name AS collection,
					        channel,
					        wm.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                           CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					     --  store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM (' || wp_union_sql || ') wm
					    left join (' || union_sql || ') isku on wm.hierarchy_code=isku.hierarchy_code and wm.current_week=isku.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
					    WHERE wm.dept IN ('||dept_name ||') and fiscal_year = '||fis_year ||'
						AND wm.current_week between '||sweek ||' and '||tweek ||' and channel<>''Warehouse''
					), 
					wp_data as (SELECT
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					   -- count(distinct hierarchy_code) cnt_hierarchy,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    wp_aoh_units,
					    wp_atp_units,
					    wp_eop_cost,
					    wp_eop_units,
					    COUNT(DISTINCT (fiscal_year, fiscal_month)) AS no_of_months,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    AVG(store_count) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM wp_base_data
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
					), wp_agg as (select division,dept, channel, fiscal_year as year, fiscal_month as month, no_of_months,
					wp_aoh_units, wp_atp_units, wp_eop_cost, wp_eop_units,
					avg(store_count) as wp_store_count, count(distinct hierarchy_code) as wp_sku_count, avg(w_air) as wp_w_air, 
					avg(w_auc) as wp_w_auc, avg(w_aur) as wp_w_aur, avg(w_dr_perc) as wp_w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
					nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_sls_units),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
					sum(w_sls_dollars) as wp_w_sls_dollars, avg(w_sls_ecom_perc) as wp_w_sls_ecom_perc, 
					sum(w_sls_units) as wp_w_sls_units, sum(w_gm_dollars) as wp_w_gm_dollars, sum(post_md_written_sales) as wp_post_md_written_sales, 
					sum(pre_md_written_sales) as wp_pre_md_written_sales, sum(post_md_written_units) as wp_post_md_written_units, sum(pre_md_written_units) as wp_pre_md_written_units, 
					sum(d_sls_dollars) as wp_d_sls_dollars, sum(d_sls_units) as wp_d_sls_units, sum(d_gm) as wp_d_gm, avg(d_aur) as wp_d_aur,
					sum(aoh_fwos_units) as wp_aoh_fwos_units, sum(total_receipt_cost) as wp_total_receipt_cost, 
					sum(total_receipt_units) as wp_total_receipt_units, sum(atp_fwos_units) as wp_atp_fwos_units,
					sum(on_order_placed_total_unit) as wp_oo_u_ttl_p
					from wp_data
					group by 1,2,3,4,5,6,7,8,9,10), wp as (select division,dept, channel, year, month, wp_store_count, wp_sku_count, w_air, w_auc, w_dr_perc,
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    wp_w_sls_dollars / NULLIF(wp_w_sls_dollars, 0)
					  ELSE 0
					END AS wp_w_sls_ecom_perc,
					wp_pre_md_written_sales, wp_post_md_written_sales, wp_pre_md_written_units, wp_post_md_written_units,
					wp_w_sls_dollars, wp_w_gm_dollars, wp_d_sls_dollars, wp_d_sls_units,no_of_months,
					avg(wp_w_sls_dollars) over
					(partition by dept, channel) as avg_monthly_sls_dollars,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_sls_dollars_3m_avg,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_sls_dollars_6m_avg,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_sls_dollars_9m_avg,
					wp_w_sls_units,
					avg(wp_w_sls_units) over
					(partition by dept, channel) as avg_monthly_sls_units,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_sls_units_3m_avg,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_sls_units_6m_avg,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_sls_units_9m_avg,
					w_aur,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_aur_3m_avg,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_aur_6m_avg,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_aur_9m_avg,
					wp_d_gm, d_aur, wp_aoh_units, wp_aoh_fwos_units, wp_atp_units, wp_atp_fwos_units,
					wp_total_receipt_cost, wp_total_receipt_units, wp_eop_cost, wp_eop_units, wp_oo_u_ttl_p
					from wp_agg), op_base_data AS (
					    SELECT 
					        mv.l1_name AS Division,
					        om.dept,
					        collection_name AS collection,
					        channel,
					        om.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                           CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					        --store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM  (' || op_union_sql || ') om
					    left join (' || union_sql || ') isku on om.hierarchy_code=isku.hierarchy_code and isku.current_week = om.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON om.dept = mv.l2_name AND om.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month, fiscal_week FROM "global".fiscal_date_mapping) fdm ON fdm.fiscal_year_week = om.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON om.hierarchy_code = is2.hierarchy_code AND om.dept = is2.dept
					    WHERE  om.dept IN ('||dept_name ||') and fiscal_year = '||fis_year ||'
							AND om.current_week between '||sweek ||' and '||tweek ||' 
					), op_data as (SELECT
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    op_aoh_units,
					    op_atp_units,
					    op_eop_cost,
					    op_eop_units,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    round(SUM(store_count*written_sales_units) / NULLIF(SUM(written_sales_units), 0)) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM op_base_data
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
					), op_agg as (select dept, channel, fiscal_year as year, fiscal_month as month, 
					op_aoh_units, op_atp_units, op_eop_cost, op_eop_units,
					avg(store_count) as op_store_count, count(distinct hierarchy_code) as op_sku_count, avg(w_air) as op_w_air, 
					avg(w_auc) as op_w_auc, avg(w_aur) as op_w_aur, avg(w_dr_perc) as op_w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
					--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
					sum(w_sls_dollars) as op_w_sls_dollars, avg(w_sls_ecom_perc) as op_w_sls_ecom_perc, 
					sum(w_sls_units) as op_w_sls_units, sum(w_gm_dollars) as op_w_gm_dollars, sum(post_md_written_sales) as op_post_md_written_sales, 
					sum(pre_md_written_sales) as op_pre_md_written_sales, sum(post_md_written_units) as op_post_md_written_units, sum(pre_md_written_units) as op_pre_md_written_units, 
					sum(d_sls_dollars) as op_d_sls_dollars, sum(d_sls_units) as op_d_sls_units, sum(d_gm) as op_d_gm, avg(d_aur) as op_d_aur,
					sum(aoh_fwos_units) as op_aoh_fwos_units, sum(atp_fwos_units) as op_atp_fwos_units,
					sum(total_receipt_cost) as op_total_receipt_cost, sum(total_receipt_units) as op_total_receipt_units, 
					sum(on_order_placed_total_unit) as op_oo_u_ttl_p
					from op_data
					group by 1,2,3,4,5,6,7,8), op as (select dept, channel, year, month, op_store_count, op_sku_count, w_air, w_auc, w_dr_perc,
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    op_w_sls_dollars / NULLIF(op_w_sls_dollars, 0)
					  ELSE 0
					END AS op_w_sls_ecom_perc,
					op_pre_md_written_sales, op_post_md_written_sales, op_pre_md_written_units, op_post_md_written_units,
					op_w_sls_dollars, op_w_gm_dollars,op_d_sls_dollars,op_d_sls_units,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_sls_dollars_3m_avg,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_sls_dollars_6m_avg,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_sls_dollars_9m_avg,
					op_w_sls_units,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_sls_units_3m_avg,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_sls_units_6m_avg,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_sls_units_9m_avg,
					op_w_aur,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_aur_3m_avg,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_aur_6m_avg,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_aur_9m_avg,
					op_d_gm, op_d_aur, op_aoh_units, op_aoh_fwos_units, op_atp_units, op_atp_fwos_units, op_total_receipt_cost, 
					op_total_receipt_units, op_eop_cost, op_eop_units, op_oo_u_ttl_p
					from op_agg), ly_base_data AS (
					    SELECT 
					        mv.l1_name AS Division,
					        lm.dept,
					        collection_name AS collection,
					        channel,
					        lm.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ly_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ly_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                         CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					     --   store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM item_smart.ly_master lm
					    left join (' || union_sql || ') isku on lm.hierarchy_code=isku.hierarchy_code and isku.current_week = lm.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON lm.dept = mv.l2_name AND lm.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month, fiscal_week FROM "global".fiscal_date_mapping) fdm ON fdm.fiscal_year_week = lm.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON lm.hierarchy_code = is2.hierarchy_code AND lm.dept = is2.dept
					    WHERE  lm.dept IN ('||dept_name ||')  and fiscal_year = '||fis_year ||'
						 AND lm.current_week between '||sweek ||' and '||tweek ||' 
					), ly_data as (SELECT
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    ly_aoh_units,
					    ly_atp_units,
					    ly_eop_cost,
					    ly_eop_units,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    AVG(store_count) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM ly_base_data
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
					), ly_agg as (select dept, channel, fiscal_year as year, fiscal_month as month, 
					ly_aoh_units, ly_atp_units, ly_eop_cost, ly_eop_units,
					avg(store_count) as store_count, count(distinct hierarchy_code) as sku_count, avg(w_air) as w_air, 
					avg(w_auc) as w_auc, avg(w_aur) as w_aur, avg(w_dr_perc) as w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_aur,
					--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_dr_perc,
					sum(w_sls_dollars) as w_sls_dollars, avg(w_sls_ecom_perc) as w_sls_ecom_perc, 
					sum(w_sls_units) as w_sls_units, sum(w_gm_dollars) as w_gm_dollars, sum(post_md_written_sales) as post_md_written_sales, 
					sum(pre_md_written_sales) as pre_md_written_sales, sum(post_md_written_units) as post_md_written_units, sum(pre_md_written_units) as pre_md_written_units, 
					sum(d_sls_dollars) as d_sls_dollars, sum(d_sls_units) as d_sls_units, sum(d_gm) as d_gm, avg(d_aur) as d_aur,
					sum(aoh_fwos_units) as aoh_fwos_units, sum(atp_fwos_units) as atp_fwos_units,
					sum(total_receipt_cost) as total_receipt_cost, sum(total_receipt_units) as total_receipt_units, sum(on_order_placed_total_unit) as oo_u_ttl_p
					from ly_data
					group by 1,2,3,4,5,6,7,8), 
					ly as (select dept, channel, year, month, store_count, sku_count, ly_w_air, ly_w_auc, ly_w_dr_perc, 
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    w_sls_dollars / NULLIF(w_sls_dollars, 0)
					  ELSE 0
					END AS w_sls_ecom_perc,
					pre_md_written_sales, post_md_written_sales, pre_md_written_units, post_md_written_units,
					w_sls_dollars, w_gm_dollars, d_sls_dollars, d_sls_units,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_sls_dollars_3m_avg,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_sls_dollars_6m_avg,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_sls_dollars_9m_avg,
					w_sls_units,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_sls_units_3m_avg,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_sls_units_6m_avg,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_sls_units_9m_avg,
					ly_w_aur,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_aur_3m_avg,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_aur_6m_avg,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_aur_9m_avg,
					d_gm, d_aur, ly_aoh_units, aoh_fwos_units, ly_atp_units, atp_fwos_units,
					total_receipt_cost, total_receipt_units, oo_u_ttl_p, ly_eop_cost, ly_eop_units
					from ly_agg
					), final_data as (
select division,dept, channel, year, month, CAST(COALESCE(wp_store_count, 0) AS INT) AS wp_store_count,
					CAST(wp_sku_count AS INT) AS wp_sku_count, wp.w_air, wp.w_auc,
					no_of_months, avg_monthly_sls_dollars, wp_w_sls_dollars_3m_avg, wp_w_sls_dollars_6m_avg, wp_w_sls_dollars_9m_avg,
					avg_monthly_sls_units, wp_w_sls_units_3m_avg, wp_w_sls_units_6m_avg, wp_w_sls_units_9m_avg,
					wp_w_sls_dollars, wp_pre_md_written_sales, wp_post_md_written_sales, 
					wp_w_sls_ecom_perc, op_w_sls_dollars, op_pre_md_written_sales, op_post_md_written_sales,
					op_w_sls_ecom_perc, (wp_w_sls_dollars - op_w_sls_dollars) as w_sls_dollars_wp_op_var,
					(wp_pre_md_written_sales - op_pre_md_written_sales) as pre_md_w_sls_dollars_wp_op_var,
					(wp_post_md_written_sales - op_post_md_written_sales) as post_md_w_sls_dollars_wp_op_var,
					(wp_w_sls_dollars - op_w_sls_dollars) / NULLIF(op_w_sls_dollars, 0) as w_sls_dollars_wp_op_var_perc,
					(wp_pre_md_written_sales - op_pre_md_written_sales) / NULLIF(op_pre_md_written_sales, 0) as pre_md_w_sls_dollars_wp_op_var_perc,
					(wp_post_md_written_sales - op_post_md_written_sales) / NULLIF(op_post_md_written_sales, 0) as post_md_w_sls_dollars_wp_op_var_perc,
					ly.w_sls_dollars as ly_w_sls_dollars, ly.pre_md_written_sales as ly_pre_md_written_sales, ly.post_md_written_sales as ly_post_md_written_sales,
					ly.w_sls_ecom_perc as ly_w_sls_ecom_perc, (wp_w_sls_dollars - ly.w_sls_dollars) as w_sls_dollars_wp_ly_var,
					(wp_pre_md_written_sales - ly.pre_md_written_sales) as pre_md_w_sls_dollars_wp_ly_var,
					(wp_post_md_written_sales - ly.post_md_written_sales) as post_md_w_sls_dollars_wp_ly_var,
					(wp_w_sls_dollars - ly.w_sls_dollars) / NULLIF(ly.w_sls_dollars, 0) as w_sls_dollars_wp_ly_var_perc,
					(wp_pre_md_written_sales - ly.pre_md_written_sales) / NULLIF(ly.pre_md_written_sales, 0) as pre_md_w_sls_dollars_wp_ly_var_perc,
					(wp_post_md_written_sales - ly.post_md_written_sales) / NULLIF(ly.post_md_written_sales, 0) as post_md_w_sls_dollars_wp_ly_var_perc,
					wp_w_sls_units, wp_pre_md_written_units, wp_post_md_written_units,
					op_w_sls_units, op_pre_md_written_units, op_post_md_written_units,
					(wp_w_sls_units - op_w_sls_units) as w_sls_units_wp_op_var,
					(wp_pre_md_written_units - op_pre_md_written_units) as pre_md_w_sls_units_wp_op_var,
					(wp_post_md_written_units - op_post_md_written_units) as post_md_w_sls_units_wp_op_var,
					(wp_w_sls_units - op_w_sls_units) / NULLIF(op_w_sls_units, 0) as w_sls_units_wp_op_var_perc,
					(wp_pre_md_written_units - op_pre_md_written_units) / NULLIF(op_pre_md_written_units, 0) as pre_md_w_sls_units_wp_op_var_perc,
					(wp_post_md_written_units - op_post_md_written_units) / NULLIF(op_post_md_written_units, 0) as post_md_w_sls_units_wp_op_var_perc,
					ly.w_sls_units as ly_w_sls_units, ly.pre_md_written_units as ly_pre_md_written_units, ly.post_md_written_units as ly_post_md_written_units,
					(wp_w_sls_units - ly.w_sls_units) as w_sls_units_wp_ly_var,
					(wp_pre_md_written_units - ly.pre_md_written_units) as pre_md_w_sls_units_wp_ly_var,
					(wp_post_md_written_units - ly.post_md_written_units) as post_md_w_sls_units_wp_ly_var,
					(wp_w_sls_units - ly.w_sls_dollars) / NULLIF(ly.w_sls_units, 0) as w_sls_units_wp_ly_var_perc,
					(wp_pre_md_written_units - ly.pre_md_written_units) / NULLIF(ly.pre_md_written_units, 0) as pre_md_w_sls_units_wp_ly_var_perc,
					(wp_post_md_written_units - ly.post_md_written_units) / NULLIF(ly.post_md_written_units, 0) as post_md_w_sls_units_wp_ly_var_perc,
					wp.w_aur, wp_w_aur_3m_avg, wp_w_aur_6m_avg, wp_w_aur_9m_avg, op_w_aur, ly_w_aur,
					wp.w_dr_perc as wp_w_dr_perc, op.w_dr_perc as op_w_dr_perc, ly_w_dr_perc,
					wp_w_gm_dollars, NULLIF(wp_w_gm_dollars, 0) / NULLIF(wp_w_sls_dollars, 0) as wp_w_gm_perc, 
					op_w_gm_dollars, NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0) as op_w_gm_perc,
					(wp_w_gm_dollars - op_w_gm_dollars) as w_gm_dollars_wp_op_var,
					((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)))/(NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)) as w_gm_perc_wp_op_var,
					(wp_w_gm_dollars - op_w_gm_dollars) / NULLIF(op_w_gm_dollars, 0) as w_gm_dollars_wp_op_var_perc,
					ly.w_gm_dollars as ly_w_gm_dollars, NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0) as ly_w_gm_perc,
					(wp_w_gm_dollars - ly.w_gm_dollars) as w_gm_dollars_wp_ly_var,
					((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0)))/(NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0)) as w_gm_perc_wp_ly_var,
					(wp_w_gm_dollars - ly.w_gm_dollars) / NULLIF(ly.w_gm_dollars, 0) as w_gm_dollars_wp_ly_var_perc,
					wp_aoh_units, wp_aoh_fwos_units, op_aoh_units, op_aoh_fwos_units,
					ly_aoh_units, ly.aoh_fwos_units as ly_aoh_fwos_units,
					wp_total_receipt_units, op_total_receipt_units, 
					(wp_total_receipt_units - op_total_receipt_units) as total_receipt_units_wp_op_var,
					(wp_total_receipt_units - op_total_receipt_units) / NULLIF(op_total_receipt_units, 0) as total_receipt_units_wp_op_var_perc,
					ly.total_receipt_units as ly_total_receipt_units,
					(wp_total_receipt_units - ly.total_receipt_units) as total_receipt_units_wp_ly_var,
					(wp_total_receipt_units - ly.total_receipt_units) / NULLIF(ly.total_receipt_units, 0) as total_receipt_units_wp_ly_var_perc,
					wp_oo_u_ttl_p, op_oo_u_ttl_p,
					(wp_oo_u_ttl_p - op_oo_u_ttl_p) as oo_u_ttl_p_wp_op_var,
					(wp_oo_u_ttl_p - op_oo_u_ttl_p)/NULLIF(op_oo_u_ttl_p, 0) as oo_u_ttl_p_wp_op_var_perc,
					oo_u_ttl_p, (wp_oo_u_ttl_p - oo_u_ttl_p) as oo_u_ttl_p_wp_ly_var,
					(wp_oo_u_ttl_p - oo_u_ttl_p)/NULLIF(oo_u_ttl_p, 0) as oo_u_ttl_p_wp_ly_var_perc,
					wp_atp_units, wp_atp_fwos_units, op_atp_units, op_atp_fwos_units, ly_atp_units, ly.atp_fwos_units,
					wp_d_sls_dollars, op_d_sls_dollars,
					(wp_d_sls_dollars - op_d_sls_dollars) as d_sls_dollars_wp_op_var,
					(wp_d_sls_dollars - op_d_sls_dollars)/NULLIF(op_d_sls_dollars, 0) as d_sls_dollars_wp_op_var_perc,
					ly.d_sls_dollars, 
					(wp_d_sls_dollars - ly.d_sls_dollars) as d_sls_dollars_wp_ly_var,
					(wp_d_sls_dollars - ly.d_sls_dollars)/NULLIF(ly.d_sls_dollars, 0) as d_sls_dollars_wp_ly_var_perc,
					wp_d_sls_units, op_d_sls_units,
					(wp_d_sls_units - op_d_sls_units) as d_sls_units_wp_op_var,
					(wp_d_sls_units - op_d_sls_units)/NULLIF(op_d_sls_units, 0) as d_sls_units_wp_op_var_perc,
					ly.d_sls_units, 
					(wp_d_sls_units - ly.d_sls_units) as d_sls_units_wp_ly_var,
					(wp_d_sls_units - ly.d_sls_units)/NULLIF(ly.d_sls_units, 0) as d_sls_units_wp_ly_var_perc,
					wp.d_aur as wp_d_aur, op_d_aur, ly.d_aur as ly_d_aur,
					wp_d_gm, NULLIF(wp_d_gm, 0) / NULLIF(wp_d_sls_dollars, 0) as wp_d_gm_perc, 
					op_d_gm, NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0) as op_d_gm_perc,
					(wp_d_gm - op_d_gm) as d_gm_wp_op_var,
					((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)))/(NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)) as d_gm_perc_wp_op_var,
					(wp_d_gm - op_d_gm) / NULLIF(op_d_gm, 0) as d_gm_wp_op_var_perc,
					ly.d_gm as ly_d_gm, NULLIF(ly.d_gm, 0) / NULLIF(ly.w_sls_dollars, 0) as ly_d_gm_perc,
					(wp_d_gm - ly.d_gm) as d_gm_wp_ly_var,
					((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(ly.d_gm, 0) / NULLIF(ly.d_sls_dollars, 0)))/(NULLIF(ly.d_gm, 0) / NULLIF(ly.d_sls_dollars, 0)) as d_gm_perc_wp_ly_var,
					(wp_d_gm - ly.d_gm) / NULLIF(ly.d_gm, 0) as d_gm_wp_ly_var_perc,
					wp_eop_cost, op_eop_cost,
					(wp_eop_cost - op_eop_cost) as eop_cost_wp_op_var,
					(wp_eop_cost - op_eop_cost) / NULLIF(op_eop_cost, 0) as eop_cost_wp_op_var_perc,
					ly_eop_cost,
					(wp_eop_cost - ly_eop_cost) as eop_cost_wp_ly_var,
					(wp_eop_cost - ly_eop_cost) / NULLIF(ly_eop_cost, 0) as eop_cost_wp_ly_var_perc,
					wp_eop_units, op_eop_units,
					(wp_eop_units - op_eop_units) as eop_units_wp_op_var,
					(wp_eop_units - op_eop_units) / NULLIF(op_eop_units, 0) as eop_units_wp_op_var_perc,
					ly_eop_units,
					(wp_eop_units - ly_eop_units) as eop_units_wp_ly_var,
					(wp_eop_units - ly_eop_units) / NULLIF(ly_eop_units, 0) as eop_units_wp_ly_var_perc
					from wp
					left join op using (dept, channel, year, month)
					left join ly using (dept, channel, year, month)
					order by year, month), omni_channel AS (
					    SELECT
				division,
					        dept,
					        ''Omni'' AS channel,
					        year,
					        month,
					        CAST(COALESCE(SUM(wp_store_count), 0) AS INT) AS wp_store_count,
					CAST(COALESCE(SUM(wp_sku_count), 0)AS INT) AS wp_sku_count,
					COALESCE(AVG(w_air), 0) AS w_air,
					COALESCE(AVG(w_auc), 0) AS w_auc,
					COALESCE(MAX(no_of_months), 0) AS no_of_months,
					COALESCE(SUM(avg_monthly_sls_dollars), 0) AS avg_monthly_sls_dollars,
					COALESCE(AVG(wp_w_sls_dollars_3m_avg), 0) AS wp_w_sls_dollars_3m_avg,
					COALESCE(AVG(wp_w_sls_dollars_6m_avg), 0) AS wp_w_sls_dollars_6m_avg,
					COALESCE(AVG(wp_w_sls_dollars_9m_avg), 0) AS wp_w_sls_dollars_9m_avg,
					COALESCE(SUM(avg_monthly_sls_units), 0) AS avg_monthly_sls_units,
					COALESCE(AVG(wp_w_sls_units_3m_avg), 0) AS wp_w_sls_units_3m_avg,
					COALESCE(AVG(wp_w_sls_units_6m_avg), 0) AS wp_w_sls_units_6m_avg,
					COALESCE(AVG(wp_w_sls_units_9m_avg), 0) AS wp_w_sls_units_9m_avg,
					COALESCE(SUM(wp_w_sls_dollars), 0) AS wp_w_sls_dollars,
					COALESCE(SUM(wp_pre_md_written_sales), 0) AS wp_pre_md_written_sales,
					COALESCE(SUM(wp_post_md_written_sales), 0) AS wp_post_md_written_sales,
					COALESCE(SUM(wp_w_sls_ecom_perc * wp_w_sls_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0), 0) AS wp_w_sls_ecom_perc,
					COALESCE(SUM(op_w_sls_dollars), 0) AS op_w_sls_dollars,
					COALESCE(SUM(op_pre_md_written_sales), 0) AS op_pre_md_written_sales,
					COALESCE(SUM(op_post_md_written_sales), 0) AS op_post_md_written_sales,
					COALESCE(SUM(op_w_sls_ecom_perc * op_w_sls_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS op_w_sls_ecom_perc,
					COALESCE(SUM(w_sls_dollars_wp_op_var), 0) AS w_sls_dollars_wp_op_var,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var), 0) AS pre_md_w_sls_dollars_wp_op_var,
					COALESCE(SUM(post_md_w_sls_dollars_wp_op_var), 0) AS post_md_w_sls_dollars_wp_op_var,
					COALESCE(SUM(w_sls_dollars_wp_op_var) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var) / NULLIF(SUM(op_pre_md_written_sales), 0), 0) AS pre_md_w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(post_md_w_sls_dollars_wp_op_var) / NULLIF(SUM(op_post_md_written_sales), 0), 0) AS post_md_w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(ly_w_sls_dollars), 0) AS ly_w_sls_dollars,
					COALESCE(SUM(ly_pre_md_written_sales), 0) AS ly_pre_md_written_sales,
					COALESCE(SUM(ly_post_md_written_sales), 0) AS ly_post_md_written_sales,
					COALESCE(SUM(ly_w_sls_ecom_perc * ly_w_sls_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS ly_w_sls_ecom_perc,
					COALESCE(SUM(w_sls_dollars_wp_ly_var), 0) AS w_sls_dollars_wp_ly_var,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var), 0) AS pre_md_w_sls_dollars_wp_ly_var,
					COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var), 0) AS post_md_w_sls_dollars_wp_ly_var,
					COALESCE(SUM(w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_pre_md_written_sales), 0), 0) AS pre_md_w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_post_md_written_sales), 0), 0) AS post_md_w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_w_sls_units), 0) AS wp_w_sls_units,
					COALESCE(SUM(wp_pre_md_written_units), 0) AS wp_pre_md_written_units,
					COALESCE(SUM(wp_post_md_written_units), 0) AS wp_post_md_written_units,
					COALESCE(SUM(op_w_sls_units), 0) AS op_w_sls_units,
					COALESCE(SUM(op_pre_md_written_units), 0) AS op_pre_md_written_units,
					COALESCE(SUM(op_post_md_written_units), 0) AS op_post_md_written_units,
					COALESCE(SUM(w_sls_units_wp_op_var), 0) AS w_sls_units_wp_op_var,
					COALESCE(SUM(pre_md_w_sls_units_wp_op_var), 0) AS pre_md_w_sls_units_wp_op_var,
					COALESCE(SUM(post_md_w_sls_units_wp_op_var), 0) AS post_md_w_sls_units_wp_op_var,
					COALESCE(SUM(w_sls_units_wp_op_var) / NULLIF(SUM(op_w_sls_units), 0), 0) AS w_sls_units_wp_op_var_perc,
					COALESCE(SUM(pre_md_w_sls_units_wp_op_var) / NULLIF(SUM(op_pre_md_written_units), 0), 0) AS pre_md_w_sls_units_wp_op_var_perc,
					COALESCE(SUM(post_md_w_sls_units_wp_op_var) / NULLIF(SUM(op_post_md_written_units), 0), 0) AS post_md_w_sls_units_wp_op_var_perc,
					COALESCE(SUM(ly_w_sls_units), 0) AS ly_w_sls_units,
					COALESCE(SUM(ly_pre_md_written_units), 0) AS ly_pre_md_written_units,
					COALESCE(SUM(ly_post_md_written_units), 0) AS ly_post_md_written_units,
					COALESCE(SUM(w_sls_units_wp_ly_var), 0) AS w_sls_units_wp_ly_var,
					COALESCE(SUM(pre_md_w_sls_units_wp_ly_var), 0) AS pre_md_w_sls_units_wp_ly_var,
					COALESCE(SUM(post_md_w_sls_units_wp_ly_var), 0) AS post_md_w_sls_units_wp_ly_var,
					COALESCE(SUM(w_sls_units_wp_ly_var) / NULLIF(SUM(ly_w_sls_units), 0), 0) AS w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(pre_md_w_sls_units_wp_ly_var) / NULLIF(SUM(ly_pre_md_written_units), 0), 0) AS pre_md_w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(post_md_w_sls_units_wp_ly_var) / NULLIF(SUM(ly_post_md_written_units), 0), 0) AS post_md_w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(wp_w_sls_dollars) / NULLIF(SUM(wp_w_sls_units), 0), 0) AS w_aur,
					COALESCE(AVG(wp_w_aur_3m_avg), 0) AS wp_w_aur_3m_avg,
					COALESCE(AVG(wp_w_aur_6m_avg), 0) AS wp_w_aur_6m_avg,
					COALESCE(AVG(wp_w_aur_9m_avg), 0) AS wp_w_aur_9m_avg,
					COALESCE(SUM(op_w_sls_dollars) / NULLIF(SUM(op_w_sls_units), 0), 0) AS op_w_aur,
					COALESCE(SUM(ly_w_sls_dollars) / NULLIF(SUM(ly_w_sls_units), 0), 0) AS ly_w_aur,
					COALESCE(AVG(wp_w_dr_perc), 0) AS wp_w_dr_perc,
					COALESCE(AVG(op_w_dr_perc), 0) AS op_w_dr_perc,
					COALESCE(AVG(ly_w_dr_perc), 0) AS ly_w_dr_perc,
					COALESCE(SUM(wp_w_gm_dollars), 0) AS wp_w_gm_dollars,
					COALESCE(SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0), 0) AS wp_w_gm_perc,
					COALESCE(SUM(op_w_gm_dollars), 0) AS op_w_gm_dollars,
					COALESCE(SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS op_w_gm_perc,
					COALESCE(SUM(w_gm_dollars_wp_op_var), 0) AS w_gm_dollars_wp_op_var,
					COALESCE((SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0) - SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0)) / NULLIF(SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0), 0) AS w_gm_perc_wp_op_var,
					COALESCE(SUM(w_gm_dollars_wp_op_var) / NULLIF(SUM(op_w_gm_dollars), 0), 0) AS w_gm_dollars_wp_op_var_perc,
					COALESCE(SUM(ly_w_gm_dollars), 0) AS ly_w_gm_dollars,
					COALESCE(SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS ly_w_gm_perc,
					COALESCE(SUM(w_gm_dollars_wp_ly_var), 0) AS w_gm_dollars_wp_ly_var,
					COALESCE((SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0) - SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0)) / NULLIF(SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0), 0) AS w_gm_perc_wp_ly_var,
					COALESCE(SUM(w_gm_dollars_wp_ly_var) / NULLIF(SUM(ly_w_gm_dollars), 0), 0) AS w_gm_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_aoh_units), 0) AS wp_aoh_units,
					COALESCE(SUM(wp_aoh_fwos_units), 0) AS wp_aoh_fwos_units,
					COALESCE(SUM(op_aoh_units), 0) AS op_aoh_units,
					COALESCE(SUM(op_aoh_fwos_units), 0) AS op_aoh_fwos_units,
					COALESCE(SUM(ly_aoh_units), 0) AS ly_aoh_units,
					COALESCE(SUM(ly_aoh_fwos_units), 0) AS ly_aoh_fwos_units,
					COALESCE(SUM(wp_total_receipt_units), 0) AS wp_total_receipt_units,
					COALESCE(SUM(op_total_receipt_units), 0) AS op_total_receipt_units,
					COALESCE(SUM(total_receipt_units_wp_op_var), 0) AS total_receipt_units_wp_op_var,
					COALESCE(SUM(total_receipt_units_wp_op_var) / NULLIF(SUM(op_total_receipt_units), 0), 0) AS total_receipt_units_wp_op_var_perc,
					COALESCE(SUM(ly_total_receipt_units), 0) AS ly_total_receipt_units,
					COALESCE(SUM(total_receipt_units_wp_ly_var), 0) AS total_receipt_units_wp_ly_var,
					COALESCE(SUM(total_receipt_units_wp_ly_var) / NULLIF(SUM(ly_total_receipt_units), 0), 0) AS total_receipt_units_wp_ly_var_perc,
					COALESCE(SUM(wp_oo_u_ttl_p), 0) AS wp_oo_u_ttl_p,
					COALESCE(SUM(op_oo_u_ttl_p), 0) AS op_oo_u_ttl_p,
					COALESCE(SUM(oo_u_ttl_p_wp_op_var), 0) AS oo_u_ttl_p_wp_op_var,
					COALESCE(SUM(oo_u_ttl_p_wp_op_var) / NULLIF(SUM(op_oo_u_ttl_p), 0), 0) AS oo_u_ttl_p_wp_op_var_perc,
					COALESCE(SUM(oo_u_ttl_p), 0) AS oo_u_ttl_p,
					COALESCE(SUM(oo_u_ttl_p_wp_ly_var), 0) AS oo_u_ttl_p_wp_ly_var,
					COALESCE(SUM(oo_u_ttl_p_wp_ly_var) / NULLIF(SUM(oo_u_ttl_p), 0), 0) AS oo_u_ttl_p_wp_ly_var_perc,
					COALESCE(SUM(wp_atp_units), 0) AS wp_atp_units,
					COALESCE(SUM(wp_atp_fwos_units), 0) AS wp_atp_fwos_units,
					COALESCE(SUM(op_atp_units), 0) AS op_atp_units,
					COALESCE(SUM(op_atp_fwos_units), 0) AS op_atp_fwos_units,
					COALESCE(SUM(ly_atp_units), 0) AS ly_atp_units,
					COALESCE(SUM(atp_fwos_units), 0) AS atp_fwos_units,
					COALESCE(SUM(wp_d_sls_dollars), 0) AS wp_d_sls_dollars,
					COALESCE(SUM(op_d_sls_dollars), 0) AS op_d_sls_dollars,
					COALESCE(SUM(d_sls_dollars_wp_op_var), 0) AS d_sls_dollars_wp_op_var,
					COALESCE(SUM(d_sls_dollars_wp_op_var) / NULLIF(SUM(op_d_sls_dollars), 0), 0) AS d_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(d_sls_dollars), 0) AS d_sls_dollars,
					COALESCE(SUM(d_sls_dollars_wp_ly_var), 0) AS d_sls_dollars_wp_ly_var,
					COALESCE(SUM(d_sls_dollars_wp_ly_var) / NULLIF(SUM(d_sls_dollars), 0), 0) AS d_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_d_sls_units), 0) AS wp_d_sls_units,
					COALESCE(SUM(op_d_sls_units), 0) AS op_d_sls_units,
					COALESCE(SUM(d_sls_units_wp_op_var), 0) AS d_sls_units_wp_op_var,
					COALESCE(SUM(d_sls_units_wp_op_var) / NULLIF(SUM(op_d_sls_units), 0), 0) AS d_sls_units_wp_op_var_perc,
					COALESCE(SUM(d_sls_units), 0) AS d_sls_units,
					COALESCE(SUM(d_sls_units_wp_ly_var), 0) AS d_sls_units_wp_ly_var,
					COALESCE(SUM(d_sls_units_wp_ly_var) / NULLIF(SUM(d_sls_units), 0), 0) AS d_sls_units_wp_ly_var_perc,
					COALESCE(AVG(wp_d_aur), 0) AS wp_d_aur,
					COALESCE(AVG(op_d_aur), 0) AS op_d_aur,
					COALESCE(AVG(ly_d_aur), 0) AS ly_d_aur,
					COALESCE(SUM(wp_d_gm), 0) AS wp_d_gm,
					COALESCE(SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0), 0) AS wp_d_gm_perc,
					COALESCE(SUM(op_d_gm), 0) AS op_d_gm,
					COALESCE(SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0), 0) AS op_d_gm_perc,
					COALESCE(SUM(d_gm_wp_op_var), 0) AS d_gm_wp_op_var,
					COALESCE((SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0) - SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0)) / NULLIF(SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0), 0), 0) AS d_gm_perc_wp_op_var,
					COALESCE(SUM(d_gm_wp_op_var) / NULLIF(SUM(op_d_gm), 0), 0) AS d_gm_wp_op_var_perc,
					COALESCE(SUM(ly_d_gm), 0) AS ly_d_gm,
					COALESCE(SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0), 0) AS ly_d_gm_perc,
					COALESCE(SUM(d_gm_wp_ly_var), 0) AS d_gm_wp_ly_var,
					COALESCE((SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0) - SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0)) / NULLIF(SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0), 0), 0) AS d_gm_perc_wp_ly_var,
					COALESCE(SUM(d_gm_wp_ly_var) / NULLIF(SUM(ly_d_gm), 0), 0) AS d_gm_wp_ly_var_perc,
					COALESCE(SUM(wp_eop_cost), 0) AS wp_eop_cost,
					COALESCE(SUM(op_eop_cost), 0) AS op_eop_cost,
					COALESCE(SUM(eop_cost_wp_op_var), 0) AS eop_cost_wp_op_var,
					COALESCE(SUM(eop_cost_wp_op_var) / NULLIF(SUM(op_eop_cost), 0), 0) AS eop_cost_wp_op_var_perc,
					COALESCE(SUM(ly_eop_cost), 0) AS ly_eop_cost,
					COALESCE(SUM(eop_cost_wp_ly_var), 0) AS eop_cost_wp_ly_var,
					COALESCE(SUM(eop_cost_wp_ly_var) / NULLIF(SUM(ly_eop_cost), 0), 0) AS eop_cost_wp_ly_var_perc,
					COALESCE(SUM(wp_eop_units), 0) AS wp_eop_units,
					COALESCE(SUM(op_eop_units), 0) AS op_eop_units,
					COALESCE(SUM(eop_units_wp_op_var), 0) AS eop_units_wp_op_var,
					COALESCE(SUM(eop_units_wp_op_var) / NULLIF(SUM(op_eop_units), 0), 0) AS eop_units_wp_op_var_perc,
					COALESCE(SUM(ly_eop_units), 0) AS ly_eop_units,
					COALESCE(SUM(eop_units_wp_ly_var), 0) AS eop_units_wp_ly_var,
					COALESCE(SUM(eop_units_wp_ly_var) / NULLIF(SUM(ly_eop_units), 0), 0) AS eop_units_wp_ly_var
					        from final_data
					        group by 1,2,3,4,5
					        order by year, month
					),final_report as
			(SELECT * from final_data
			union all
			select *from omni_channel
			order by year, month
			)
----divsion selection---
		SELECT
    distinct '||report_type||' as "' || INITCAP(report_type) || '",
    channel AS "Channel",
COALESCE(SUM(wp_store_count), 0) AS "Store Count",
COALESCE(SUM(wp_sku_count), 0) AS "# of SKUs",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_air), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "AIR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_auc), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "AUC",
COALESCE(SUM(no_of_months), 0) AS "WP # of Months w/Sls",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(avg_monthly_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Avg Monthly W Sls$",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_dollars_3m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "3 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_dollars_6m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "6 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_dollars_9m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "9 mo Avg Month W Sls $",
TRUNC(COALESCE(SUM(avg_monthly_sls_units), 0)) AS "WP Avg Monthly W U Sls",
TRUNC(COALESCE(SUM(wp_w_sls_units_3m_avg), 0)) AS "3 mo Avg Month W Sls U",
TRUNC(COALESCE(SUM(wp_w_sls_units_6m_avg), 0)) AS "6 mo Avg Month W Sls U",
TRUNC(COALESCE(SUM(wp_w_sls_units_9m_avg), 0)) AS "9 mo Avg Month W Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_pre_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_post_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_ecom_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_w_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_pre_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_post_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(op_w_sls_ecom_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_sls_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PreMD Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_sls_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PreMD % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PostMD % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_w_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_pre_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_post_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(ly_w_sls_ecom_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_sls_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PreMD Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_sls_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PreMD % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PostMD % Var to LY",
TRUNC(COALESCE(SUM(wp_w_sls_units), 0)) AS "WP W Sls U",
TRUNC(COALESCE(SUM(wp_pre_md_written_units), 0)) AS "WP W Sls U - PreMD",
TRUNC(COALESCE(SUM(wp_post_md_written_units), 0)) AS "WP W Sls U - PostMD",
TRUNC(COALESCE(SUM(op_w_sls_units), 0)) AS "OP W Sls U",
TRUNC(COALESCE(SUM(op_pre_md_written_units), 0)) AS "OP W Sls U - PreMD",
TRUNC(COALESCE(SUM(op_post_md_written_units), 0)) AS "OP W Sls U - PostMD",
TRUNC(COALESCE(SUM(w_sls_units_wp_op_var), 0)) AS "WP W Sls U Var to OP",
TRUNC(COALESCE(SUM(pre_md_w_sls_units_wp_op_var), 0)) AS "WP W Sls U - PreMD Var to OP",
TRUNC(COALESCE(SUM(post_md_w_sls_units_wp_op_var), 0)) AS "WP W Sls U - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_sls_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PreMD % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PostMD % Var to OP",
TRUNC(COALESCE(SUM(ly_w_sls_units), 0)) AS "LY W Sls U",
TRUNC(COALESCE(SUM(ly_pre_md_written_units), 0)) AS "LY W Sls U - PreMD",
TRUNC(COALESCE(SUM(ly_post_md_written_units), 0)) AS "LY W Sls U - PostMD",
TRUNC(COALESCE(SUM(w_sls_units_wp_ly_var), 0)) AS "WP W Sls U Var to LY",
TRUNC(COALESCE(SUM(pre_md_w_sls_units_wp_ly_var), 0)) AS "WP W Sls U - PreMD Var to LY",
TRUNC(COALESCE(SUM(post_md_w_sls_units_wp_ly_var), 0)) AS "WP W Sls U - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_sls_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PreMD % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PostMD % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_aur), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_aur_3m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "3 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_aur_6m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "6 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_aur_9m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "9 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_w_aur), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_w_aur), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W AUR",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(wp_w_dr_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(op_w_dr_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(ly_w_dr_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY W DR%",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_gm_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(wp_w_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_w_gm_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(op_w_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_gm_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_gm_perc_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_gm_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_w_gm_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(ly_w_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_gm_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_gm_perc_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_gm_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM $ % Var to LY",
TRUNC(COALESCE(SUM(wp_aoh_units), 0)) AS "WP AOH U",
TRUNC(COALESCE(SUM(wp_aoh_fwos_units), 0)) AS "WP AOH FWOS U",
TRUNC(COALESCE(SUM(op_aoh_units), 0)) AS "OP AOH U",
TRUNC(COALESCE(SUM(op_aoh_fwos_units), 0)) AS "OP AOH FWOS U",
TRUNC(COALESCE(SUM(ly_aoh_units), 0)) AS "LY AOH U",
TRUNC(COALESCE(SUM(ly_aoh_fwos_units), 0)) AS "LY AOH FWOS U",
TRUNC(COALESCE(SUM(wp_total_receipt_units), 0)) AS "WP Ttl Rcpt U",
TRUNC(COALESCE(SUM(op_total_receipt_units), 0)) AS "OP Ttl Rcpt U",
TRUNC(COALESCE(SUM(total_receipt_units_wp_op_var), 0)) AS "WP Ttl Rcpt U Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(total_receipt_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP Ttl Rcpt U % Var to OP",
TRUNC(COALESCE(SUM(ly_total_receipt_units), 0)) AS "LY Ttl Rcpt U",
TRUNC(COALESCE(SUM(total_receipt_units_wp_ly_var), 0)) AS "WP Ttl Rcpt U Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(total_receipt_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP Ttl Rcpt U % Var to LY",
TRUNC(COALESCE(SUM(wp_oo_u_ttl_p), 0)) AS "WP OO U (TTL-P)",
TRUNC(COALESCE(SUM(op_oo_u_ttl_p), 0)) AS "OP OO U (TTL-P)",
TRUNC(COALESCE(SUM(oo_u_ttl_p_wp_op_var), 0)) AS "WP OO U (TTL-P) Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(oo_u_ttl_p_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP OO U (TTL-P) % Var to OP",
TRUNC(COALESCE(SUM(oo_u_ttl_p), 0)) AS "LY OO U (TTL-P)",
TRUNC(COALESCE(SUM(oo_u_ttl_p_wp_ly_var), 0)) AS "WP OO U (TTL-P) Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(oo_u_ttl_p_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP OO U (TTL-P) % Var to LY",
TRUNC(COALESCE(SUM(wp_atp_units), 0)) AS "WP ATP U",
TRUNC(COALESCE(SUM(wp_atp_fwos_units), 0)) AS "WP ATP FWOS U",
TRUNC(COALESCE(SUM(op_atp_units), 0)) AS "OP ATP U",
TRUNC(COALESCE(SUM(op_atp_fwos_units), 0)) AS "OP ATP FWOS U",
TRUNC(COALESCE(SUM(ly_atp_units), 0)) AS "LY ATP U",
TRUNC(COALESCE(SUM(atp_fwos_units), 0)) AS "LY ATP FWOS U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_d_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_d_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to OP D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to LY D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY D Sls $",
TRUNC(COALESCE(SUM(wp_d_sls_units), 0)) AS "WP D Sls U",
TRUNC(COALESCE(SUM(op_d_sls_units), 0)) AS "OP D Sls U",
TRUNC(COALESCE(SUM(d_sls_units_wp_op_var), 0)) AS "WP Var to OP D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_sls_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP D Sls U",
TRUNC(COALESCE(SUM(d_sls_units), 0)) AS "LY D Sls U",
TRUNC(COALESCE(SUM(d_sls_units_wp_ly_var), 0)) AS "WP Var to LY D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_sls_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY D Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_d_aur), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_d_aur), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_d_aur), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_d_gm), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(wp_d_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_d_gm), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(op_d_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_gm_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_gm_perc_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_gm_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_d_gm), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(ly_d_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_gm_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_gm_perc_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_gm_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM $ % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_eop_cost), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_eop_cost), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(eop_cost_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to OP EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(eop_cost_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_eop_cost), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(eop_cost_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to LY EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(eop_cost_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY EOP $",
TRUNC(COALESCE(SUM(wp_eop_units), 0)) AS "WP EOP U",
TRUNC(COALESCE(SUM(op_eop_units), 0)) AS "OP EOP U",
TRUNC(COALESCE(SUM(eop_units_wp_op_var), 0)) AS "WP Var to OP EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(eop_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP EOP U",
TRUNC(COALESCE(SUM(ly_eop_units), 0)) AS "LY EOP U",
TRUNC(COALESCE(SUM(eop_units_wp_ly_var), 0)) AS "WP Var to LY EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(eop_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY EOP U"
FROM
    final_report
WHERE
    channel <> ''Warehouse'' and '||report_type||' is not null
GROUP BY
    '||report_type||',
    channel;';

			 
	ELSIF report_type = 'total' THEN

			_query_combine := 'WITH wp_base_data AS (
					    SELECT 
					        mv.l1_name AS Division,
					        wm.dept,
					        collection_name AS collection,
					        channel,
					        wm.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                           CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					     --  store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM (' || wp_union_sql || ') wm
					    left join (' || union_sql || ') isku on wm.hierarchy_code=isku.hierarchy_code and wm.current_week=isku.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
					    WHERE wm.dept IN ('||dept_name ||') and fiscal_year = '||fis_year ||'
						AND wm.current_week between '||sweek ||' and '||tweek ||' and channel<>''Warehouse''
					), 
					wp_data as (SELECT
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					   -- count(distinct hierarchy_code) cnt_hierarchy,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    wp_aoh_units,
					    wp_atp_units,
					    wp_eop_cost,
					    wp_eop_units,
					    COUNT(DISTINCT (fiscal_year, fiscal_month)) AS no_of_months,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    AVG(store_count) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM wp_base_data
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
					), wp_agg as (select dept, channel, fiscal_year as year, fiscal_month as month, no_of_months,
					wp_aoh_units, wp_atp_units, wp_eop_cost, wp_eop_units,
					avg(store_count) as wp_store_count, count(distinct hierarchy_code) as wp_sku_count, avg(w_air) as wp_w_air, 
					avg(w_auc) as wp_w_auc, avg(w_aur) as wp_w_aur, avg(w_dr_perc) as wp_w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
					nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_sls_units),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
					sum(w_sls_dollars) as wp_w_sls_dollars, avg(w_sls_ecom_perc) as wp_w_sls_ecom_perc, 
					sum(w_sls_units) as wp_w_sls_units, sum(w_gm_dollars) as wp_w_gm_dollars, sum(post_md_written_sales) as wp_post_md_written_sales, 
					sum(pre_md_written_sales) as wp_pre_md_written_sales, sum(post_md_written_units) as wp_post_md_written_units, sum(pre_md_written_units) as wp_pre_md_written_units, 
					sum(d_sls_dollars) as wp_d_sls_dollars, sum(d_sls_units) as wp_d_sls_units, sum(d_gm) as wp_d_gm, avg(d_aur) as wp_d_aur,
					sum(aoh_fwos_units) as wp_aoh_fwos_units, sum(total_receipt_cost) as wp_total_receipt_cost, 
					sum(total_receipt_units) as wp_total_receipt_units, sum(atp_fwos_units) as wp_atp_fwos_units,
					sum(on_order_placed_total_unit) as wp_oo_u_ttl_p
					from wp_data
					group by 1,2,3,4,5,6,7,8,9), wp as (select dept, channel, year, month, wp_store_count, wp_sku_count, w_air, w_auc, w_dr_perc,
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    wp_w_sls_dollars / NULLIF(wp_w_sls_dollars, 0)
					  ELSE 0
					END AS wp_w_sls_ecom_perc,
					wp_pre_md_written_sales, wp_post_md_written_sales, wp_pre_md_written_units, wp_post_md_written_units,
					wp_w_sls_dollars, wp_w_gm_dollars, wp_d_sls_dollars, wp_d_sls_units,no_of_months,
					avg(wp_w_sls_dollars) over
					(partition by dept, channel) as avg_monthly_sls_dollars,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_sls_dollars_3m_avg,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_sls_dollars_6m_avg,
					avg(wp_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_sls_dollars_9m_avg,
					wp_w_sls_units,
					avg(wp_w_sls_units) over
					(partition by dept, channel) as avg_monthly_sls_units,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_sls_units_3m_avg,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_sls_units_6m_avg,
					avg(wp_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_sls_units_9m_avg,
					w_aur,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_aur_3m_avg,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_aur_6m_avg,
					avg(wp_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_aur_9m_avg,
					wp_d_gm, d_aur, wp_aoh_units, wp_aoh_fwos_units, wp_atp_units, wp_atp_fwos_units,
					wp_total_receipt_cost, wp_total_receipt_units, wp_eop_cost, wp_eop_units, wp_oo_u_ttl_p
					from wp_agg), op_base_data AS (
					    SELECT 
					        mv.l1_name AS Division,
					        om.dept,
					        collection_name AS collection,
					        channel,
					        om.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                           CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					        --store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM (' || op_union_sql || ') om
					    left join (' || union_sql || ') isku on om.hierarchy_code=isku.hierarchy_code and isku.current_week = om.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON om.dept = mv.l2_name AND om.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month, fiscal_week FROM "global".fiscal_date_mapping) fdm ON fdm.fiscal_year_week = om.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON om.hierarchy_code = is2.hierarchy_code AND om.dept = is2.dept
					    WHERE om.dept IN ('||dept_name ||') and fiscal_year = '||fis_year ||'
							AND om.current_week between '||sweek ||' and '||tweek ||' 
					), op_data as (SELECT
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    op_aoh_units,
					    op_atp_units,
					    op_eop_cost,
					    op_eop_units,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    round(SUM(store_count*written_sales_units) / NULLIF(SUM(written_sales_units), 0)) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM op_base_data
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
					), op_agg as (select dept, channel, fiscal_year as year, fiscal_month as month, 
					op_aoh_units, op_atp_units, op_eop_cost, op_eop_units,
					avg(store_count) as op_store_count, count(distinct hierarchy_code) as op_sku_count, avg(w_air) as op_w_air, 
					avg(w_auc) as op_w_auc, avg(w_aur) as op_w_aur, avg(w_dr_perc) as op_w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
					--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
					sum(w_sls_dollars) as op_w_sls_dollars, avg(w_sls_ecom_perc) as op_w_sls_ecom_perc, 
					sum(w_sls_units) as op_w_sls_units, sum(w_gm_dollars) as op_w_gm_dollars, sum(post_md_written_sales) as op_post_md_written_sales, 
					sum(pre_md_written_sales) as op_pre_md_written_sales, sum(post_md_written_units) as op_post_md_written_units, sum(pre_md_written_units) as op_pre_md_written_units, 
					sum(d_sls_dollars) as op_d_sls_dollars, sum(d_sls_units) as op_d_sls_units, sum(d_gm) as op_d_gm, avg(d_aur) as op_d_aur,
					sum(aoh_fwos_units) as op_aoh_fwos_units, sum(atp_fwos_units) as op_atp_fwos_units,
					sum(total_receipt_cost) as op_total_receipt_cost, sum(total_receipt_units) as op_total_receipt_units, 
					sum(on_order_placed_total_unit) as op_oo_u_ttl_p
					from op_data
					group by 1,2,3,4,5,6,7,8), op as (select dept, channel, year, month, op_store_count, op_sku_count, w_air, w_auc, w_dr_perc,
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    op_w_sls_dollars / NULLIF(op_w_sls_dollars, 0)
					  ELSE 0
					END AS op_w_sls_ecom_perc,
					op_pre_md_written_sales, op_post_md_written_sales, op_pre_md_written_units, op_post_md_written_units,
					op_w_sls_dollars, op_w_gm_dollars,op_d_sls_dollars,op_d_sls_units,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_sls_dollars_3m_avg,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_sls_dollars_6m_avg,
					avg(op_w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_sls_dollars_9m_avg,
					op_w_sls_units,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_sls_units_3m_avg,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_sls_units_6m_avg,
					avg(op_w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_sls_units_9m_avg,
					op_w_aur,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_aur_3m_avg,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_aur_6m_avg,
					avg(op_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_aur_9m_avg,
					op_d_gm, op_d_aur, op_aoh_units, op_aoh_fwos_units, op_atp_units, op_atp_fwos_units, op_total_receipt_cost, 
					op_total_receipt_units, op_eop_cost, op_eop_units, op_oo_u_ttl_p
					from op_agg), ly_base_data AS (
					    SELECT 
					        mv.l1_name AS Division,
					        lm.dept,
					        collection_name AS collection,
					        channel,
					        lm.hierarchy_code,
					        fiscal_year,
					        fiscal_month,
					        fiscal_week,
					        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
					        FIRST_VALUE(aoh_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_aoh_units,
					        FIRST_VALUE(atp_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_atp_units,
					        LAST_VALUE(eop_cost) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ly_eop_cost,
					        LAST_VALUE(eop_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ly_eop_units,
					        written_sales_dollars,
					        written_sales_units,
					        delivered_net_sales_units,
					        written_gm_dollar,
					        delivered_gm,
					        aoh_fwos_units,
					        total_receipt_cost,
					        total_receipt_units,
					        on_order_placed_total_unit,
					        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                             CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
					     --   store_count,
					        written_air,
					        written_auc,
					        written_aur,
					        delivered_aur,
					        written_dr_perc
					    FROM item_smart.ly_master lm
					    left join (' || union_sql || ') isku on lm.hierarchy_code=isku.hierarchy_code and isku.current_week = lm.current_week
					    LEFT JOIN item_smart.mv_product_hierarchies_filter mv ON lm.dept = mv.l2_name AND lm.hierarchy_code = mv.hierarchy_code
					    LEFT JOIN (SELECT DISTINCT fiscal_year_week, fiscal_year, fiscal_month, fiscal_week FROM "global".fiscal_date_mapping) fdm ON fdm.fiscal_year_week = lm.current_week
					    LEFT JOIN itemfact_sku_temp is2 ON lm.hierarchy_code = is2.hierarchy_code AND lm.dept = is2.dept
					    WHERE lm.dept IN ('||dept_name ||') and fiscal_year = '||fis_year ||'
						 AND lm.current_week between '||sweek ||' and '||tweek ||' 
					), ly_data as (SELECT
					    Division,
					    dept,
					    collection,
					    channel,
					    hierarchy_code,
					    fiscal_year,
					    fiscal_month,
					    fiscal_week,
					    markdown_date,
					    ly_aoh_units,
					    ly_atp_units,
					    ly_eop_cost,
					    ly_eop_units,
					    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
					    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_dollars
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
					        ELSE 0 END) AS pre_md_written_sales,
					    SUM(CASE 
					        WHEN markdown_date IS NULL THEN written_sales_units
					        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
					        ELSE 0 END) AS pre_md_written_units,
					    AVG(store_count) AS store_count,
					    AVG(written_air) AS w_air,
					    AVG(written_auc) AS w_auc,
					    AVG(written_aur) AS w_aur,
					    AVG(delivered_aur) AS d_aur,
					    AVG(written_dr_perc) AS w_dr_perc,
					    SUM(written_sales_dollars) AS w_sls_dollars,
					    SUM(written_sales_units) AS w_sls_units,
					    SUM(delivered_net_sales_units) AS d_sls_dollars,
					    SUM(delivered_net_sales_units) AS d_sls_units,
					    SUM(written_gm_dollar) AS w_gm_dollars,
					    SUM(delivered_gm) AS d_gm,
					    SUM(aoh_fwos_units) AS aoh_fwos_units,
					    SUM(total_receipt_cost) AS total_receipt_cost,
					    SUM(total_receipt_units) AS total_receipt_units,
					    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
					    SUM(atp_fwos_units) AS atp_fwos_units
					FROM ly_base_data
					GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
					), ly_agg as (select dept, channel, fiscal_year as year, fiscal_month as month, 
					ly_aoh_units, ly_atp_units, ly_eop_cost, ly_eop_units,
					avg(store_count) as store_count, count(distinct hierarchy_code) as sku_count, avg(w_air) as w_air, 
					avg(w_auc) as w_auc, avg(w_aur) as w_aur, avg(w_dr_perc) as w_dr_perc,
					nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_air, 
					nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_auc,
					nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_aur,
					--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
					nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_dr_perc,
					sum(w_sls_dollars) as w_sls_dollars, avg(w_sls_ecom_perc) as w_sls_ecom_perc, 
					sum(w_sls_units) as w_sls_units, sum(w_gm_dollars) as w_gm_dollars, sum(post_md_written_sales) as post_md_written_sales, 
					sum(pre_md_written_sales) as pre_md_written_sales, sum(post_md_written_units) as post_md_written_units, sum(pre_md_written_units) as pre_md_written_units, 
					sum(d_sls_dollars) as d_sls_dollars, sum(d_sls_units) as d_sls_units, sum(d_gm) as d_gm, avg(d_aur) as d_aur,
					sum(aoh_fwos_units) as aoh_fwos_units, sum(atp_fwos_units) as atp_fwos_units,
					sum(total_receipt_cost) as total_receipt_cost, sum(total_receipt_units) as total_receipt_units, sum(on_order_placed_total_unit) as oo_u_ttl_p
					from ly_data
					group by 1,2,3,4,5,6,7,8), 
					ly as (select dept, channel, year, month, store_count, sku_count, ly_w_air, ly_w_auc, ly_w_dr_perc, 
					CASE 
					  WHEN channel = ''Ecom'' THEN 
					    w_sls_dollars / NULLIF(w_sls_dollars, 0)
					  ELSE 0
					END AS w_sls_ecom_perc,
					pre_md_written_sales, post_md_written_sales, pre_md_written_units, post_md_written_units,
					w_sls_dollars, w_gm_dollars, d_sls_dollars, d_sls_units,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_sls_dollars_3m_avg,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_sls_dollars_6m_avg,
					avg(w_sls_dollars) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_sls_dollars_9m_avg,
					w_sls_units,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_sls_units_3m_avg,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_sls_units_6m_avg,
					avg(w_sls_units) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_sls_units_9m_avg,
					ly_w_aur,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_aur_3m_avg,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_aur_6m_avg,
					avg(ly_w_aur) over 
					(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_aur_9m_avg,
					d_gm, d_aur, ly_aoh_units, aoh_fwos_units, ly_atp_units, atp_fwos_units,
					total_receipt_cost, total_receipt_units, oo_u_ttl_p, ly_eop_cost, ly_eop_units
					from ly_agg
					), final_data as (select dept, channel, year, month, CAST(COALESCE(wp_store_count, 0) AS INT) AS wp_store_count,
					CAST(wp_sku_count AS INT) AS wp_sku_count, wp.w_air, wp.w_auc,
					no_of_months, avg_monthly_sls_dollars, wp_w_sls_dollars_3m_avg, wp_w_sls_dollars_6m_avg, wp_w_sls_dollars_9m_avg,
					avg_monthly_sls_units, wp_w_sls_units_3m_avg, wp_w_sls_units_6m_avg, wp_w_sls_units_9m_avg,
					wp_w_sls_dollars, wp_pre_md_written_sales, wp_post_md_written_sales, 
					wp_w_sls_ecom_perc, op_w_sls_dollars, op_pre_md_written_sales, op_post_md_written_sales,
					op_w_sls_ecom_perc, (wp_w_sls_dollars - op_w_sls_dollars) as w_sls_dollars_wp_op_var,
					(wp_pre_md_written_sales - op_pre_md_written_sales) as pre_md_w_sls_dollars_wp_op_var,
					(wp_post_md_written_sales - op_post_md_written_sales) as post_md_w_sls_dollars_wp_op_var,
					(wp_w_sls_dollars - op_w_sls_dollars) / NULLIF(op_w_sls_dollars, 0) as w_sls_dollars_wp_op_var_perc,
					(wp_pre_md_written_sales - op_pre_md_written_sales) / NULLIF(op_pre_md_written_sales, 0) as pre_md_w_sls_dollars_wp_op_var_perc,
					(wp_post_md_written_sales - op_post_md_written_sales) / NULLIF(op_post_md_written_sales, 0) as post_md_w_sls_dollars_wp_op_var_perc,
					ly.w_sls_dollars as ly_w_sls_dollars, ly.pre_md_written_sales as ly_pre_md_written_sales, ly.post_md_written_sales as ly_post_md_written_sales,
					ly.w_sls_ecom_perc as ly_w_sls_ecom_perc, (wp_w_sls_dollars - ly.w_sls_dollars) as w_sls_dollars_wp_ly_var,
					(wp_pre_md_written_sales - ly.pre_md_written_sales) as pre_md_w_sls_dollars_wp_ly_var,
					(wp_post_md_written_sales - ly.post_md_written_sales) as post_md_w_sls_dollars_wp_ly_var,
					(wp_w_sls_dollars - ly.w_sls_dollars) / NULLIF(ly.w_sls_dollars, 0) as w_sls_dollars_wp_ly_var_perc,
					(wp_pre_md_written_sales - ly.pre_md_written_sales) / NULLIF(ly.pre_md_written_sales, 0) as pre_md_w_sls_dollars_wp_ly_var_perc,
					(wp_post_md_written_sales - ly.post_md_written_sales) / NULLIF(ly.post_md_written_sales, 0) as post_md_w_sls_dollars_wp_ly_var_perc,
					wp_w_sls_units, wp_pre_md_written_units, wp_post_md_written_units,
					op_w_sls_units, op_pre_md_written_units, op_post_md_written_units,
					(wp_w_sls_units - op_w_sls_units) as w_sls_units_wp_op_var,
					(wp_pre_md_written_units - op_pre_md_written_units) as pre_md_w_sls_units_wp_op_var,
					(wp_post_md_written_units - op_post_md_written_units) as post_md_w_sls_units_wp_op_var,
					(wp_w_sls_units - op_w_sls_units) / NULLIF(op_w_sls_units, 0) as w_sls_units_wp_op_var_perc,
					(wp_pre_md_written_units - op_pre_md_written_units) / NULLIF(op_pre_md_written_units, 0) as pre_md_w_sls_units_wp_op_var_perc,
					(wp_post_md_written_units - op_post_md_written_units) / NULLIF(op_post_md_written_units, 0) as post_md_w_sls_units_wp_op_var_perc,
					ly.w_sls_units as ly_w_sls_units, ly.pre_md_written_units as ly_pre_md_written_units, ly.post_md_written_units as ly_post_md_written_units,
					(wp_w_sls_units - ly.w_sls_units) as w_sls_units_wp_ly_var,
					(wp_pre_md_written_units - ly.pre_md_written_units) as pre_md_w_sls_units_wp_ly_var,
					(wp_post_md_written_units - ly.post_md_written_units) as post_md_w_sls_units_wp_ly_var,
					(wp_w_sls_units - ly.w_sls_dollars) / NULLIF(ly.w_sls_units, 0) as w_sls_units_wp_ly_var_perc,
					(wp_pre_md_written_units - ly.pre_md_written_units) / NULLIF(ly.pre_md_written_units, 0) as pre_md_w_sls_units_wp_ly_var_perc,
					(wp_post_md_written_units - ly.post_md_written_units) / NULLIF(ly.post_md_written_units, 0) as post_md_w_sls_units_wp_ly_var_perc,
					wp.w_aur, wp_w_aur_3m_avg, wp_w_aur_6m_avg, wp_w_aur_9m_avg, op_w_aur, ly_w_aur,
					wp.w_dr_perc as wp_w_dr_perc, op.w_dr_perc as op_w_dr_perc, ly_w_dr_perc,
					wp_w_gm_dollars, NULLIF(wp_w_gm_dollars, 0) / NULLIF(wp_w_sls_dollars, 0) as wp_w_gm_perc, 
					op_w_gm_dollars, NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0) as op_w_gm_perc,
					(wp_w_gm_dollars - op_w_gm_dollars) as w_gm_dollars_wp_op_var,
					((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)))/(NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)) as w_gm_perc_wp_op_var,
					(wp_w_gm_dollars - op_w_gm_dollars) / NULLIF(op_w_gm_dollars, 0) as w_gm_dollars_wp_op_var_perc,
					ly.w_gm_dollars as ly_w_gm_dollars, NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0) as ly_w_gm_perc,
					(wp_w_gm_dollars - ly.w_gm_dollars) as w_gm_dollars_wp_ly_var,
					((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0)))/(NULLIF(ly.w_gm_dollars, 0) / NULLIF(ly.w_sls_dollars, 0)) as w_gm_perc_wp_ly_var,
					(wp_w_gm_dollars - ly.w_gm_dollars) / NULLIF(ly.w_gm_dollars, 0) as w_gm_dollars_wp_ly_var_perc,
					wp_aoh_units, wp_aoh_fwos_units, op_aoh_units, op_aoh_fwos_units,
					ly_aoh_units, ly.aoh_fwos_units as ly_aoh_fwos_units,
					wp_total_receipt_units, op_total_receipt_units, 
					(wp_total_receipt_units - op_total_receipt_units) as total_receipt_units_wp_op_var,
					(wp_total_receipt_units - op_total_receipt_units) / NULLIF(op_total_receipt_units, 0) as total_receipt_units_wp_op_var_perc,
					ly.total_receipt_units as ly_total_receipt_units,
					(wp_total_receipt_units - ly.total_receipt_units) as total_receipt_units_wp_ly_var,
					(wp_total_receipt_units - ly.total_receipt_units) / NULLIF(ly.total_receipt_units, 0) as total_receipt_units_wp_ly_var_perc,
					wp_oo_u_ttl_p, op_oo_u_ttl_p,
					(wp_oo_u_ttl_p - op_oo_u_ttl_p) as oo_u_ttl_p_wp_op_var,
					(wp_oo_u_ttl_p - op_oo_u_ttl_p)/NULLIF(op_oo_u_ttl_p, 0) as oo_u_ttl_p_wp_op_var_perc,
					oo_u_ttl_p, (wp_oo_u_ttl_p - oo_u_ttl_p) as oo_u_ttl_p_wp_ly_var,
					(wp_oo_u_ttl_p - oo_u_ttl_p)/NULLIF(oo_u_ttl_p, 0) as oo_u_ttl_p_wp_ly_var_perc,
					wp_atp_units, wp_atp_fwos_units, op_atp_units, op_atp_fwos_units, ly_atp_units, ly.atp_fwos_units,
					wp_d_sls_dollars, op_d_sls_dollars,
					(wp_d_sls_dollars - op_d_sls_dollars) as d_sls_dollars_wp_op_var,
					(wp_d_sls_dollars - op_d_sls_dollars)/NULLIF(op_d_sls_dollars, 0) as d_sls_dollars_wp_op_var_perc,
					ly.d_sls_dollars, 
					(wp_d_sls_dollars - ly.d_sls_dollars) as d_sls_dollars_wp_ly_var,
					(wp_d_sls_dollars - ly.d_sls_dollars)/NULLIF(ly.d_sls_dollars, 0) as d_sls_dollars_wp_ly_var_perc,
					wp_d_sls_units, op_d_sls_units,
					(wp_d_sls_units - op_d_sls_units) as d_sls_units_wp_op_var,
					(wp_d_sls_units - op_d_sls_units)/NULLIF(op_d_sls_units, 0) as d_sls_units_wp_op_var_perc,
					ly.d_sls_units, 
					(wp_d_sls_units - ly.d_sls_units) as d_sls_units_wp_ly_var,
					(wp_d_sls_units - ly.d_sls_units)/NULLIF(ly.d_sls_units, 0) as d_sls_units_wp_ly_var_perc,
					wp.d_aur as wp_d_aur, op_d_aur, ly.d_aur as ly_d_aur,
					wp_d_gm, NULLIF(wp_d_gm, 0) / NULLIF(wp_d_sls_dollars, 0) as wp_d_gm_perc, 
					op_d_gm, NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0) as op_d_gm_perc,
					(wp_d_gm - op_d_gm) as d_gm_wp_op_var,
					((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)))/(NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)) as d_gm_perc_wp_op_var,
					(wp_d_gm - op_d_gm) / NULLIF(op_d_gm, 0) as d_gm_wp_op_var_perc,
					ly.d_gm as ly_d_gm, NULLIF(ly.d_gm, 0) / NULLIF(ly.w_sls_dollars, 0) as ly_d_gm_perc,
					(wp_d_gm - ly.d_gm) as d_gm_wp_ly_var,
					((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(ly.d_gm, 0) / NULLIF(ly.d_sls_dollars, 0)))/(NULLIF(ly.d_gm, 0) / NULLIF(ly.d_sls_dollars, 0)) as d_gm_perc_wp_ly_var,
					(wp_d_gm - ly.d_gm) / NULLIF(ly.d_gm, 0) as d_gm_wp_ly_var_perc,
					wp_eop_cost, op_eop_cost,
					(wp_eop_cost - op_eop_cost) as eop_cost_wp_op_var,
					(wp_eop_cost - op_eop_cost) / NULLIF(op_eop_cost, 0) as eop_cost_wp_op_var_perc,
					ly_eop_cost,
					(wp_eop_cost - ly_eop_cost) as eop_cost_wp_ly_var,
					(wp_eop_cost - ly_eop_cost) / NULLIF(ly_eop_cost, 0) as eop_cost_wp_ly_var_perc,
					wp_eop_units, op_eop_units,
					(wp_eop_units - op_eop_units) as eop_units_wp_op_var,
					(wp_eop_units - op_eop_units) / NULLIF(op_eop_units, 0) as eop_units_wp_op_var_perc,
					ly_eop_units,
					(wp_eop_units - ly_eop_units) as eop_units_wp_ly_var,
					(wp_eop_units - ly_eop_units) / NULLIF(ly_eop_units, 0) as eop_units_wp_ly_var_perc
					from wp
					left join op using (dept, channel, year, month)
					left join ly using (dept, channel, year, month)
					order by year, month), omni_channel AS (
					    SELECT
					        dept,
					        ''Omni'' AS channel,
					        year,
					        month,
					        CAST(COALESCE(SUM(wp_store_count), 0) AS INT) AS wp_store_count,
					CAST(COALESCE(SUM(wp_sku_count), 0)AS INT) AS wp_sku_count,
					COALESCE(AVG(w_air), 0) AS w_air,
					COALESCE(AVG(w_auc), 0) AS w_auc,
					COALESCE(MAX(no_of_months), 0) AS no_of_months,
					COALESCE(SUM(avg_monthly_sls_dollars), 0) AS avg_monthly_sls_dollars,
					COALESCE(AVG(wp_w_sls_dollars_3m_avg), 0) AS wp_w_sls_dollars_3m_avg,
					COALESCE(AVG(wp_w_sls_dollars_6m_avg), 0) AS wp_w_sls_dollars_6m_avg,
					COALESCE(AVG(wp_w_sls_dollars_9m_avg), 0) AS wp_w_sls_dollars_9m_avg,
					COALESCE(SUM(avg_monthly_sls_units), 0) AS avg_monthly_sls_units,
					COALESCE(AVG(wp_w_sls_units_3m_avg), 0) AS wp_w_sls_units_3m_avg,
					COALESCE(AVG(wp_w_sls_units_6m_avg), 0) AS wp_w_sls_units_6m_avg,
					COALESCE(AVG(wp_w_sls_units_9m_avg), 0) AS wp_w_sls_units_9m_avg,
					COALESCE(SUM(wp_w_sls_dollars), 0) AS wp_w_sls_dollars,
					COALESCE(SUM(wp_pre_md_written_sales), 0) AS wp_pre_md_written_sales,
					COALESCE(SUM(wp_post_md_written_sales), 0) AS wp_post_md_written_sales,
					COALESCE(SUM(wp_w_sls_ecom_perc * wp_w_sls_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0), 0) AS wp_w_sls_ecom_perc,
					COALESCE(SUM(op_w_sls_dollars), 0) AS op_w_sls_dollars,
					COALESCE(SUM(op_pre_md_written_sales), 0) AS op_pre_md_written_sales,
					COALESCE(SUM(op_post_md_written_sales), 0) AS op_post_md_written_sales,
					COALESCE(SUM(op_w_sls_ecom_perc * op_w_sls_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS op_w_sls_ecom_perc,
					COALESCE(SUM(w_sls_dollars_wp_op_var), 0) AS w_sls_dollars_wp_op_var,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var), 0) AS pre_md_w_sls_dollars_wp_op_var,
					COALESCE(SUM(post_md_w_sls_dollars_wp_op_var), 0) AS post_md_w_sls_dollars_wp_op_var,
					COALESCE(SUM(w_sls_dollars_wp_op_var) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var) / NULLIF(SUM(op_pre_md_written_sales), 0), 0) AS pre_md_w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(post_md_w_sls_dollars_wp_op_var) / NULLIF(SUM(op_post_md_written_sales), 0), 0) AS post_md_w_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(ly_w_sls_dollars), 0) AS ly_w_sls_dollars,
					COALESCE(SUM(ly_pre_md_written_sales), 0) AS ly_pre_md_written_sales,
					COALESCE(SUM(ly_post_md_written_sales), 0) AS ly_post_md_written_sales,
					COALESCE(SUM(ly_w_sls_ecom_perc * ly_w_sls_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS ly_w_sls_ecom_perc,
					COALESCE(SUM(w_sls_dollars_wp_ly_var), 0) AS w_sls_dollars_wp_ly_var,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var), 0) AS pre_md_w_sls_dollars_wp_ly_var,
					COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var), 0) AS post_md_w_sls_dollars_wp_ly_var,
					COALESCE(SUM(w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_pre_md_written_sales), 0), 0) AS pre_md_w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_post_md_written_sales), 0), 0) AS post_md_w_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_w_sls_units), 0) AS wp_w_sls_units,
					COALESCE(SUM(wp_pre_md_written_units), 0) AS wp_pre_md_written_units,
					COALESCE(SUM(wp_post_md_written_units), 0) AS wp_post_md_written_units,
					COALESCE(SUM(op_w_sls_units), 0) AS op_w_sls_units,
					COALESCE(SUM(op_pre_md_written_units), 0) AS op_pre_md_written_units,
					COALESCE(SUM(op_post_md_written_units), 0) AS op_post_md_written_units,
					COALESCE(SUM(w_sls_units_wp_op_var), 0) AS w_sls_units_wp_op_var,
					COALESCE(SUM(pre_md_w_sls_units_wp_op_var), 0) AS pre_md_w_sls_units_wp_op_var,
					COALESCE(SUM(post_md_w_sls_units_wp_op_var), 0) AS post_md_w_sls_units_wp_op_var,
					COALESCE(SUM(w_sls_units_wp_op_var) / NULLIF(SUM(op_w_sls_units), 0), 0) AS w_sls_units_wp_op_var_perc,
					COALESCE(SUM(pre_md_w_sls_units_wp_op_var) / NULLIF(SUM(op_pre_md_written_units), 0), 0) AS pre_md_w_sls_units_wp_op_var_perc,
					COALESCE(SUM(post_md_w_sls_units_wp_op_var) / NULLIF(SUM(op_post_md_written_units), 0), 0) AS post_md_w_sls_units_wp_op_var_perc,
					COALESCE(SUM(ly_w_sls_units), 0) AS ly_w_sls_units,
					COALESCE(SUM(ly_pre_md_written_units), 0) AS ly_pre_md_written_units,
					COALESCE(SUM(ly_post_md_written_units), 0) AS ly_post_md_written_units,
					COALESCE(SUM(w_sls_units_wp_ly_var), 0) AS w_sls_units_wp_ly_var,
					COALESCE(SUM(pre_md_w_sls_units_wp_ly_var), 0) AS pre_md_w_sls_units_wp_ly_var,
					COALESCE(SUM(post_md_w_sls_units_wp_ly_var), 0) AS post_md_w_sls_units_wp_ly_var,
					COALESCE(SUM(w_sls_units_wp_ly_var) / NULLIF(SUM(ly_w_sls_units), 0), 0) AS w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(pre_md_w_sls_units_wp_ly_var) / NULLIF(SUM(ly_pre_md_written_units), 0), 0) AS pre_md_w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(post_md_w_sls_units_wp_ly_var) / NULLIF(SUM(ly_post_md_written_units), 0), 0) AS post_md_w_sls_units_wp_ly_var_perc,
					COALESCE(SUM(wp_w_sls_dollars) / NULLIF(SUM(wp_w_sls_units), 0), 0) AS w_aur,
					COALESCE(AVG(wp_w_aur_3m_avg), 0) AS wp_w_aur_3m_avg,
					COALESCE(AVG(wp_w_aur_6m_avg), 0) AS wp_w_aur_6m_avg,
					COALESCE(AVG(wp_w_aur_9m_avg), 0) AS wp_w_aur_9m_avg,
					COALESCE(SUM(op_w_sls_dollars) / NULLIF(SUM(op_w_sls_units), 0), 0) AS op_w_aur,
					COALESCE(SUM(ly_w_sls_dollars) / NULLIF(SUM(ly_w_sls_units), 0), 0) AS ly_w_aur,
					COALESCE(AVG(wp_w_dr_perc), 0) AS wp_w_dr_perc,
					COALESCE(AVG(op_w_dr_perc), 0) AS op_w_dr_perc,
					COALESCE(AVG(ly_w_dr_perc), 0) AS ly_w_dr_perc,
					COALESCE(SUM(wp_w_gm_dollars), 0) AS wp_w_gm_dollars,
					COALESCE(SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0), 0) AS wp_w_gm_perc,
					COALESCE(SUM(op_w_gm_dollars), 0) AS op_w_gm_dollars,
					COALESCE(SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS op_w_gm_perc,
					COALESCE(SUM(w_gm_dollars_wp_op_var), 0) AS w_gm_dollars_wp_op_var,
					COALESCE((SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0) - SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0)) / NULLIF(SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0), 0) AS w_gm_perc_wp_op_var,
					COALESCE(SUM(w_gm_dollars_wp_op_var) / NULLIF(SUM(op_w_gm_dollars), 0), 0) AS w_gm_dollars_wp_op_var_perc,
					COALESCE(SUM(ly_w_gm_dollars), 0) AS ly_w_gm_dollars,
					COALESCE(SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS ly_w_gm_perc,
					COALESCE(SUM(w_gm_dollars_wp_ly_var), 0) AS w_gm_dollars_wp_ly_var,
					COALESCE((SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0) - SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0)) / NULLIF(SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0), 0) AS w_gm_perc_wp_ly_var,
					COALESCE(SUM(w_gm_dollars_wp_ly_var) / NULLIF(SUM(ly_w_gm_dollars), 0), 0) AS w_gm_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_aoh_units), 0) AS wp_aoh_units,
					COALESCE(SUM(wp_aoh_fwos_units), 0) AS wp_aoh_fwos_units,
					COALESCE(SUM(op_aoh_units), 0) AS op_aoh_units,
					COALESCE(SUM(op_aoh_fwos_units), 0) AS op_aoh_fwos_units,
					COALESCE(SUM(ly_aoh_units), 0) AS ly_aoh_units,
					COALESCE(SUM(ly_aoh_fwos_units), 0) AS ly_aoh_fwos_units,
					COALESCE(SUM(wp_total_receipt_units), 0) AS wp_total_receipt_units,
					COALESCE(SUM(op_total_receipt_units), 0) AS op_total_receipt_units,
					COALESCE(SUM(total_receipt_units_wp_op_var), 0) AS total_receipt_units_wp_op_var,
					COALESCE(SUM(total_receipt_units_wp_op_var) / NULLIF(SUM(op_total_receipt_units), 0), 0) AS total_receipt_units_wp_op_var_perc,
					COALESCE(SUM(ly_total_receipt_units), 0) AS ly_total_receipt_units,
					COALESCE(SUM(total_receipt_units_wp_ly_var), 0) AS total_receipt_units_wp_ly_var,
					COALESCE(SUM(total_receipt_units_wp_ly_var) / NULLIF(SUM(ly_total_receipt_units), 0), 0) AS total_receipt_units_wp_ly_var_perc,
					COALESCE(SUM(wp_oo_u_ttl_p), 0) AS wp_oo_u_ttl_p,
					COALESCE(SUM(op_oo_u_ttl_p), 0) AS op_oo_u_ttl_p,
					COALESCE(SUM(oo_u_ttl_p_wp_op_var), 0) AS oo_u_ttl_p_wp_op_var,
					COALESCE(SUM(oo_u_ttl_p_wp_op_var) / NULLIF(SUM(op_oo_u_ttl_p), 0), 0) AS oo_u_ttl_p_wp_op_var_perc,
					COALESCE(SUM(oo_u_ttl_p), 0) AS oo_u_ttl_p,
					COALESCE(SUM(oo_u_ttl_p_wp_ly_var), 0) AS oo_u_ttl_p_wp_ly_var,
					COALESCE(SUM(oo_u_ttl_p_wp_ly_var) / NULLIF(SUM(oo_u_ttl_p), 0), 0) AS oo_u_ttl_p_wp_ly_var_perc,
					COALESCE(SUM(wp_atp_units), 0) AS wp_atp_units,
					COALESCE(SUM(wp_atp_fwos_units), 0) AS wp_atp_fwos_units,
					COALESCE(SUM(op_atp_units), 0) AS op_atp_units,
					COALESCE(SUM(op_atp_fwos_units), 0) AS op_atp_fwos_units,
					COALESCE(SUM(ly_atp_units), 0) AS ly_atp_units,
					COALESCE(SUM(atp_fwos_units), 0) AS atp_fwos_units,
					COALESCE(SUM(wp_d_sls_dollars), 0) AS wp_d_sls_dollars,
					COALESCE(SUM(op_d_sls_dollars), 0) AS op_d_sls_dollars,
					COALESCE(SUM(d_sls_dollars_wp_op_var), 0) AS d_sls_dollars_wp_op_var,
					COALESCE(SUM(d_sls_dollars_wp_op_var) / NULLIF(SUM(op_d_sls_dollars), 0), 0) AS d_sls_dollars_wp_op_var_perc,
					COALESCE(SUM(d_sls_dollars), 0) AS d_sls_dollars,
					COALESCE(SUM(d_sls_dollars_wp_ly_var), 0) AS d_sls_dollars_wp_ly_var,
					COALESCE(SUM(d_sls_dollars_wp_ly_var) / NULLIF(SUM(d_sls_dollars), 0), 0) AS d_sls_dollars_wp_ly_var_perc,
					COALESCE(SUM(wp_d_sls_units), 0) AS wp_d_sls_units,
					COALESCE(SUM(op_d_sls_units), 0) AS op_d_sls_units,
					COALESCE(SUM(d_sls_units_wp_op_var), 0) AS d_sls_units_wp_op_var,
					COALESCE(SUM(d_sls_units_wp_op_var) / NULLIF(SUM(op_d_sls_units), 0), 0) AS d_sls_units_wp_op_var_perc,
					COALESCE(SUM(d_sls_units), 0) AS d_sls_units,
					COALESCE(SUM(d_sls_units_wp_ly_var), 0) AS d_sls_units_wp_ly_var,
					COALESCE(SUM(d_sls_units_wp_ly_var) / NULLIF(SUM(d_sls_units), 0), 0) AS d_sls_units_wp_ly_var_perc,
					COALESCE(AVG(wp_d_aur), 0) AS wp_d_aur,
					COALESCE(AVG(op_d_aur), 0) AS op_d_aur,
					COALESCE(AVG(ly_d_aur), 0) AS ly_d_aur,
					COALESCE(SUM(wp_d_gm), 0) AS wp_d_gm,
					COALESCE(SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0), 0) AS wp_d_gm_perc,
					COALESCE(SUM(op_d_gm), 0) AS op_d_gm,
					COALESCE(SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0), 0) AS op_d_gm_perc,
					COALESCE(SUM(d_gm_wp_op_var), 0) AS d_gm_wp_op_var,
					COALESCE((SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0) - SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0)) / NULLIF(SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0), 0), 0) AS d_gm_perc_wp_op_var,
					COALESCE(SUM(d_gm_wp_op_var) / NULLIF(SUM(op_d_gm), 0), 0) AS d_gm_wp_op_var_perc,
					COALESCE(SUM(ly_d_gm), 0) AS ly_d_gm,
					COALESCE(SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0), 0) AS ly_d_gm_perc,
					COALESCE(SUM(d_gm_wp_ly_var), 0) AS d_gm_wp_ly_var,
					COALESCE((SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0) - SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0)) / NULLIF(SUM(ly_d_gm) / NULLIF(SUM(d_sls_dollars), 0), 0), 0) AS d_gm_perc_wp_ly_var,
					COALESCE(SUM(d_gm_wp_ly_var) / NULLIF(SUM(ly_d_gm), 0), 0) AS d_gm_wp_ly_var_perc,
					COALESCE(SUM(wp_eop_cost), 0) AS wp_eop_cost,
					COALESCE(SUM(op_eop_cost), 0) AS op_eop_cost,
					COALESCE(SUM(eop_cost_wp_op_var), 0) AS eop_cost_wp_op_var,
					COALESCE(SUM(eop_cost_wp_op_var) / NULLIF(SUM(op_eop_cost), 0), 0) AS eop_cost_wp_op_var_perc,
					COALESCE(SUM(ly_eop_cost), 0) AS ly_eop_cost,
					COALESCE(SUM(eop_cost_wp_ly_var), 0) AS eop_cost_wp_ly_var,
					COALESCE(SUM(eop_cost_wp_ly_var) / NULLIF(SUM(ly_eop_cost), 0), 0) AS eop_cost_wp_ly_var_perc,
					COALESCE(SUM(wp_eop_units), 0) AS wp_eop_units,
					COALESCE(SUM(op_eop_units), 0) AS op_eop_units,
					COALESCE(SUM(eop_units_wp_op_var), 0) AS eop_units_wp_op_var,
					COALESCE(SUM(eop_units_wp_op_var) / NULLIF(SUM(op_eop_units), 0), 0) AS eop_units_wp_op_var_perc,
					COALESCE(SUM(ly_eop_units), 0) AS ly_eop_units,
					COALESCE(SUM(eop_units_wp_ly_var), 0) AS eop_units_wp_ly_var,
					COALESCE(SUM(eop_units_wp_ly_var) / NULLIF(SUM(ly_eop_units), 0), 0) AS eop_units_wp_ly_var
					        from final_data
					        group by 1,2,3,4
					        order by year, month
					),final_report as
			(SELECT * from final_data
			union all
			select *from omni_channel
			order by year, month
			)
-----##############total#################
			SELECT
   ''total'' as total,
channel AS "Channel",
COALESCE(SUM(wp_store_count), 0) AS "Store Count",
COALESCE(SUM(wp_sku_count), 0) AS "# of SKUs",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_air), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "AIR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_auc), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "AUC",
COALESCE(SUM(no_of_months), 0) AS "WP # of Months w/Sls",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(avg_monthly_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Avg Monthly W Sls$",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_dollars_3m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "3 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_dollars_6m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "6 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_dollars_9m_avg), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "9 mo Avg Month W Sls $",
TRUNC(COALESCE(SUM(avg_monthly_sls_units), 0)) AS "WP Avg Monthly W U Sls",
TRUNC(COALESCE(SUM(wp_w_sls_units_3m_avg), 0)) AS "3 mo Avg Month W Sls U",
TRUNC(COALESCE(SUM(wp_w_sls_units_6m_avg), 0)) AS "6 mo Avg Month W Sls U",
TRUNC(COALESCE(SUM(wp_w_sls_units_9m_avg), 0)) AS "9 mo Avg Month W Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_pre_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_post_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(wp_w_sls_ecom_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_w_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_pre_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_post_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(op_w_sls_ecom_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_sls_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PreMD Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_sls_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PreMD % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PostMD % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_w_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_pre_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_post_md_written_sales), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(ly_w_sls_ecom_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_sls_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PreMD Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_sls_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PreMD % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PostMD % Var to LY",
TRUNC(COALESCE(SUM(wp_w_sls_units), 0)) AS "WP W Sls U",
TRUNC(COALESCE(SUM(wp_pre_md_written_units), 0)) AS "WP W Sls U - PreMD",
TRUNC(COALESCE(SUM(wp_post_md_written_units), 0)) AS "WP W Sls U - PostMD",
TRUNC(COALESCE(SUM(op_w_sls_units), 0)) AS "OP W Sls U",
TRUNC(COALESCE(SUM(op_pre_md_written_units), 0)) AS "OP W Sls U - PreMD",
TRUNC(COALESCE(SUM(op_post_md_written_units), 0)) AS "OP W Sls U - PostMD",
TRUNC(COALESCE(SUM(w_sls_units_wp_op_var), 0)) AS "WP W Sls U Var to OP",
TRUNC(COALESCE(SUM(pre_md_w_sls_units_wp_op_var), 0)) AS "WP W Sls U - PreMD Var to OP",
TRUNC(COALESCE(SUM(post_md_w_sls_units_wp_op_var), 0)) AS "WP W Sls U - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_sls_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PreMD % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PostMD % Var to OP",
TRUNC(COALESCE(SUM(ly_w_sls_units), 0)) AS "LY W Sls U",
TRUNC(COALESCE(SUM(ly_pre_md_written_units), 0)) AS "LY W Sls U - PreMD",
TRUNC(COALESCE(SUM(ly_post_md_written_units), 0)) AS "LY W Sls U - PostMD",
TRUNC(COALESCE(SUM(w_sls_units_wp_ly_var), 0)) AS "WP W Sls U Var to LY",
TRUNC(COALESCE(SUM(pre_md_w_sls_units_wp_ly_var), 0)) AS "WP W Sls U - PreMD Var to LY",
TRUNC(COALESCE(SUM(post_md_w_sls_units_wp_ly_var), 0)) AS "WP W Sls U - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_sls_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(pre_md_w_sls_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PreMD % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(post_md_w_sls_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PostMD % Var to LY",
COALESCE(ROUND(SUM(w_aur)::NUMERIC, 2), 0.00) AS "WP W AUR",
COALESCE(ROUND(SUM(wp_w_aur_3m_avg)::NUMERIC, 2), 0.00) AS "3 mo Avg Month W Sls AUR",
COALESCE(ROUND(SUM(wp_w_aur_6m_avg)::NUMERIC, 2), 0.00) AS "6 mo Avg Month W Sls AUR",
COALESCE(ROUND(SUM(wp_w_aur_9m_avg)::NUMERIC, 2), 0.00) AS "9 mo Avg Month W Sls AUR",
COALESCE(ROUND(SUM(op_w_aur)::NUMERIC, 2), 0.00) AS "OP W AUR",
COALESCE(ROUND(SUM(ly_w_aur)::NUMERIC, 2), 0.00) AS "LY W AUR",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(wp_w_dr_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(op_w_dr_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(ly_w_dr_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY W DR%",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_w_gm_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(wp_w_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_w_gm_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(op_w_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_gm_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_gm_perc_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_gm_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_w_gm_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(ly_w_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(w_gm_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_gm_perc_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(w_gm_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM $ % Var to LY",
TRUNC(COALESCE(SUM(wp_aoh_units), 0)) AS "WP AOH U",
TRUNC(COALESCE(SUM(wp_aoh_fwos_units), 0)) AS "WP AOH FWOS U",
TRUNC(COALESCE(SUM(op_aoh_units), 0)) AS "OP AOH U",
TRUNC(COALESCE(SUM(op_aoh_fwos_units), 0)) AS "OP AOH FWOS U",
TRUNC(COALESCE(SUM(ly_aoh_units), 0)) AS "LY AOH U",
TRUNC(COALESCE(SUM(ly_aoh_fwos_units), 0)) AS "LY AOH FWOS U",
TRUNC(COALESCE(SUM(wp_total_receipt_units), 0)) AS "WP Ttl Rcpt U",
TRUNC(COALESCE(SUM(op_total_receipt_units), 0)) AS "OP Ttl Rcpt U",
TRUNC(COALESCE(SUM(total_receipt_units_wp_op_var), 0)) AS "WP Ttl Rcpt U Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(total_receipt_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP Ttl Rcpt U % Var to OP",
TRUNC(COALESCE(SUM(ly_total_receipt_units), 0)) AS "LY Ttl Rcpt U",
TRUNC(COALESCE(SUM(total_receipt_units_wp_ly_var), 0)) AS "WP Ttl Rcpt U Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(total_receipt_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP Ttl Rcpt U % Var to LY",
TRUNC(COALESCE(SUM(wp_oo_u_ttl_p), 0)) AS "WP OO U (TTL-P)",
TRUNC(COALESCE(SUM(op_oo_u_ttl_p), 0)) AS "OP OO U (TTL-P)",
TRUNC(COALESCE(SUM(oo_u_ttl_p_wp_op_var), 0)) AS "WP OO U (TTL-P) Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(oo_u_ttl_p_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP OO U (TTL-P) % Var to OP",
TRUNC(COALESCE(SUM(oo_u_ttl_p), 0)) AS "LY OO U (TTL-P)",
TRUNC(COALESCE(SUM(oo_u_ttl_p_wp_ly_var), 0)) AS "WP OO U (TTL-P) Var to LY",

CONCAT(TO_CHAR(ROUND(COALESCE(SUM(oo_u_ttl_p_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP OO U (TTL-P) % Var to LY",
TRUNC(COALESCE(SUM(wp_atp_units), 0)) AS "WP ATP U",
TRUNC(COALESCE(SUM(wp_atp_fwos_units), 0)) AS "WP ATP FWOS U",
TRUNC(COALESCE(SUM(op_atp_units), 0)) AS "OP ATP U",
TRUNC(COALESCE(SUM(op_atp_fwos_units), 0)) AS "OP ATP FWOS U",
TRUNC(COALESCE(SUM(ly_atp_units), 0)) AS "LY ATP U",
TRUNC(COALESCE(SUM(atp_fwos_units), 0)) AS "LY ATP FWOS U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_d_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_d_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to OP D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to LY D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_sls_dollars_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY D Sls $",
TRUNC(COALESCE(SUM(wp_d_sls_units), 0)) AS "WP D Sls U",
TRUNC(COALESCE(SUM(op_d_sls_units), 0)) AS "OP D Sls U",
TRUNC(COALESCE(SUM(d_sls_units_wp_op_var), 0)) AS "WP Var to OP D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_sls_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP D Sls U",
TRUNC(COALESCE(SUM(d_sls_units), 0)) AS "LY D Sls U",
TRUNC(COALESCE(SUM(d_sls_units_wp_ly_var), 0)) AS "WP Var to LY D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_sls_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY D Sls U",
COALESCE(ROUND(SUM(wp_d_aur)::NUMERIC, 2), 0.00) AS "WP D AUR",
COALESCE(ROUND(SUM(op_d_aur)::NUMERIC, 2), 0.00) AS "OP D AUR",
COALESCE(ROUND(SUM(ly_d_aur)::NUMERIC, 2), 0.00) AS "LY D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_d_gm), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(wp_d_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_d_gm), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(op_d_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_gm_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_gm_perc_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM % Var to OP",-----------------------------------------------------
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_gm_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_d_gm), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(ly_d_gm_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(d_gm_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_gm_perc_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(d_gm_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM $ % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(wp_eop_cost), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(op_eop_cost), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(eop_cost_wp_op_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to OP EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(eop_cost_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(ly_eop_cost), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(SUM(eop_cost_wp_ly_var), 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to LY EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(eop_cost_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY EOP $",
TRUNC(COALESCE(SUM(wp_eop_units), 0)) AS "WP EOP U",
TRUNC(COALESCE(SUM(op_eop_units), 0)) AS "OP EOP U",
TRUNC(COALESCE(SUM(eop_units_wp_op_var), 0)) AS "WP Var to OP EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(SUM(eop_units_wp_op_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP EOP U",
TRUNC(COALESCE(SUM(ly_eop_units), 0)) AS "LY EOP U",
TRUNC(COALESCE(SUM(eop_units_wp_ly_var), 0)) AS "WP Var to LY EOP U",

CONCAT(TO_CHAR(ROUND(COALESCE(SUM(eop_units_wp_ly_var_perc), 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY EOP U"
FROM
    final_report
WHERE
    channel <> ''Warehouse''
GROUP BY channel';

		ELSEIF 	report_type = 'sku_total' THEN

			_query_combine := '
			WITH wp_base_data AS (
			    SELECT 
			        dpt_name as dept,
			        class_name as class,
			        channel,
			        product_code as sku,
			        product_description as sku_description,
			        collection_name AS collection,
			        lifestyle,
			        wm.hierarchy_code,
			        mv.vendor_name as vendor,
			        kit_status as hard_kit,
			        assortment_tier,
			        mv.purchase_status,
			        fiscal_year,
			        fiscal_month,
			        fiscal_week,
			        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
			        CASE WHEN is2.launch_date IS NULL THEN mv.launch_date ELSE is2.launch_date END AS launch_date,
			        CASE WHEN is2.exit_date IS NULL THEN mv.exit_date ELSE is2.exit_date END AS exit_date,
			        FIRST_VALUE(aoh_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_aoh_units,
			        FIRST_VALUE(atp_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_atp_units,
			        LAST_VALUE(eop_cost) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_cost,
			        LAST_VALUE(eop_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_units,
			        written_sales_dollars,
			        written_sales_units,
			        delivered_net_sales_units,
			        written_gm_dollar,
			        delivered_gm,
			        aoh_fwos_units,
			        total_receipt_cost,
			        total_receipt_units,
			        on_order_placed_total_unit,
			        atp_fwos_units,
  					/*	(
   							SELECT SUM((value)::INT)
   							FROM json_each_text(isku.tier_store_count::json)
  							) AS store_count, */
			        wm.store_count,
			        written_air,
			        written_auc,
			        written_aur,
			        delivered_aur,
			        written_dr_perc
			    FROM (' || wp_union_sql || ') wm
			  --  left join (' || union_sql || ') isku on wm.hierarchy_code=isku.hierarchy_code and isku.current_week = wm.current_week
			    LEFT JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code
			    LEFT JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
			    LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
			    left join item_smart.itemfact_assortment_tier_week iatw on iatw.current_week = wm.current_week
			    WHERE wm.dept IN ('||dept_name ||')  AND collection_name IN ('||coll_name ||') AND mv.vendor_name IN ('||ven_name ||')
				AND wm.current_week between '||sweek ||' and '||tweek ||'
				
			), wp_data as (SELECT
			    dept,
			    class,
			    channel,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    fiscal_year,
			    fiscal_month,
			    fiscal_week,
			    markdown_date,
			    launch_date,
			    exit_date,
			    wp_aoh_units,
			    wp_atp_units,
			    wp_eop_cost,
			    wp_eop_units,
hierarchy_code,
			    COUNT(DISTINCT (fiscal_year, fiscal_month)) AS no_of_months,
			    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_dollars
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
			        ELSE 0 END) AS pre_md_written_sales,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_units
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
			        ELSE 0 END) AS pre_md_written_units,
			    AVG(store_count) AS store_count,
			    AVG(written_air) AS w_air,
			    AVG(written_auc) AS w_auc,
			    AVG(written_aur) AS w_aur,
			    AVG(delivered_aur) AS d_aur,
			    AVG(written_dr_perc) AS w_dr_perc,
			    SUM(written_sales_dollars) AS w_sls_dollars,
			    SUM(written_sales_units) AS w_sls_units,
			    SUM(delivered_net_sales_units) AS d_sls_dollars,
			    SUM(delivered_net_sales_units) AS d_sls_units,
			    SUM(written_gm_dollar) AS w_gm_dollars,
			    SUM(delivered_gm) AS d_gm,
			    SUM(aoh_fwos_units) AS aoh_fwos_units,
			    SUM(total_receipt_cost) AS total_receipt_cost,
			    SUM(total_receipt_units) AS total_receipt_units,
			    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
			    SUM(atp_fwos_units) AS atp_fwos_units
			FROM wp_base_data
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,14,15,16,17,18,19,20,21,22
			), wp_agg as (select dept,
			    class,
			    channel,
hierarchy_code,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    fiscal_year as year,
			    fiscal_month as month,
			    markdown_date,
			    launch_date,
			    exit_date,
			    wp_aoh_units,
			    wp_atp_units,
			    wp_eop_cost,
			    wp_eop_units,
			    no_of_months,
			avg(store_count) as wp_store_count, avg(w_air) as wp_w_air, 
			avg(w_auc) as wp_w_auc, avg(w_aur) as wp_w_aur, avg(w_dr_perc) as wp_w_dr_perc,
			nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
			nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
			nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
			nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_sls_units),0) as d_aur,
			nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
			sum(w_sls_dollars) as wp_w_sls_dollars, avg(w_sls_ecom_perc) as wp_w_sls_ecom_perc, 
			sum(w_sls_units) as wp_w_sls_units, sum(w_gm_dollars) as wp_w_gm_dollars, sum(post_md_written_sales) as wp_post_md_written_sales, 
			sum(pre_md_written_sales) as wp_pre_md_written_sales, sum(post_md_written_units) as wp_post_md_written_units, sum(pre_md_written_units) as wp_pre_md_written_units, 
			sum(d_sls_dollars) as wp_d_sls_dollars, sum(d_sls_units) as wp_d_sls_units, sum(d_gm) as wp_d_gm, avg(d_aur) as wp_d_aur,
			sum(aoh_fwos_units) as wp_aoh_fwos_units, sum(total_receipt_cost) as wp_total_receipt_cost, 
			sum(total_receipt_units) as wp_total_receipt_units, sum(atp_fwos_units) as wp_atp_fwos_units,
			sum(on_order_placed_total_unit) as wp_oo_u_ttl_p
			from wp_data
			group by 1,2,3,4,5,6,7,8,9, 10, 11, 12, 13,14,15,16,17,18,19,20,21,22
			), wp as (select dept,
			    class,
			    channel,
	hierarchy_code,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    year,
			    month,
			    markdown_date,
			    launch_date,
			    exit_date,
			    wp_aoh_units,
			    wp_atp_units,
			    wp_eop_cost,
			    wp_eop_units,
			wp_store_count, w_air, w_auc, w_dr_perc,
			CASE 
			  WHEN channel = ''Ecom'' THEN 
			    wp_w_sls_dollars / NULLIF(SUM(wp_w_sls_dollars) OVER (PARTITION BY dept, year, month), 0)
			  ELSE 0
			END AS wp_w_sls_ecom_perc,
			wp_pre_md_written_sales, wp_post_md_written_sales, wp_pre_md_written_units, wp_post_md_written_units,
			wp_w_sls_dollars, wp_w_gm_dollars, wp_d_sls_dollars, wp_d_sls_units,no_of_months,
			avg(wp_w_sls_dollars) over
			(partition by dept, channel) as avg_monthly_sls_dollars,
			avg(wp_w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_sls_dollars_3m_avg,
			avg(wp_w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_sls_dollars_6m_avg,
			avg(wp_w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_sls_dollars_9m_avg,
			wp_w_sls_units,
			avg(wp_w_sls_units) over
			(partition by dept, channel) as avg_monthly_sls_units,
			avg(wp_w_sls_units) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_sls_units_3m_avg,
			avg(wp_w_sls_units) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_sls_units_6m_avg,
			avg(wp_w_sls_units) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_sls_units_9m_avg,
			w_aur,
			avg(wp_w_aur) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_aur_3m_avg,
			avg(wp_w_aur) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_aur_6m_avg,
			avg(wp_w_aur) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_aur_9m_avg,
			wp_d_gm, d_aur, wp_aoh_fwos_units, wp_atp_fwos_units,
			wp_total_receipt_cost, wp_total_receipt_units, wp_oo_u_ttl_p
			from wp_agg), wp_final as ( select dept,
			    class,
	--count(hierarchy_code),
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    avg(CAST(wp_store_count AS INT)) as wp_store_count,
			    purchase_status,
			    launch_date,
			    markdown_date,
			    exit_date,
			    avg(w_air) as w_air, 
			    avg(w_auc) as w_auc, 
			    avg_monthly_sls_dollars,
			    wp_w_sls_dollars_3m_avg,
			    wp_w_sls_dollars_6m_avg,
			    wp_w_sls_dollars_9m_avg,
			    avg_monthly_sls_units,
			    wp_w_sls_units_3m_avg,
			    wp_w_sls_units_6m_avg,
			    wp_w_sls_units_9m_avg,
			    wp_w_aur_3m_avg,
			    wp_w_aur_6m_avg,
			    wp_w_aur_9m_avg,
			    wp_eop_cost,
			    wp_eop_units,
			    wp_pre_md_written_sales, wp_post_md_written_sales, wp_pre_md_written_units, wp_post_md_written_units,
                no_of_months,
			    sum(wp_w_sls_dollars) as wp_w_sls_dollars,
			    avg(wp_w_sls_ecom_perc) as wp_w_sls_ecom_perc,
			    sum(wp_w_sls_units) as wp_w_sls_units,
			    avg(wp.w_aur) as wp_w_aur,
			    avg(wp.w_dr_perc) as wp_w_dr_perc, 
			    sum(wp_w_gm_dollars) as wp_w_gm_dollars,
			    sum(wp_aoh_units) as wp_aoh_units,
			    sum(wp_aoh_fwos_units) as wp_aoh_fwos_units,
			    sum(wp_total_receipt_units) as wp_total_receipt_units,
			    sum(wp_oo_u_ttl_p) as wp_oo_u_ttl_p,
			    sum(wp_atp_units) as wp_atp_units,
			    sum(wp_atp_fwos_units) as wp_atp_fwos_units,
			    sum(wp_d_sls_dollars) as wp_d_sls_dollars,
			    sum(wp_d_sls_units) as wp_d_sls_units,
			    avg(wp.d_aur) as wp_d_aur,
			    avg(wp_d_gm) as wp_d_gm
			    from wp
			    group by 1,2,3,4,5,6,7,8,9,11,12,13,14,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34
			), op_base_data AS (
			    SELECT 
			        dpt_name as dept,
			        class_name as class,
			        channel,
			        product_code as sku,
			        product_description as sku_description,
			        collection_name AS collection,
			        lifestyle,
			        om.hierarchy_code,
			        mv.vendor_name as vendor,
			        kit_status as hard_kit,
			        assortment_tier,
			        mv.purchase_status,
			        fiscal_year,
			        fiscal_month,
			        fiscal_week,
			        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
			        CASE WHEN is2.launch_date IS NULL THEN mv.launch_date ELSE is2.launch_date END AS launch_date,
			        CASE WHEN is2.exit_date IS NULL THEN mv.exit_date ELSE is2.exit_date END AS exit_date,
			        FIRST_VALUE(aoh_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_aoh_units,
			        FIRST_VALUE(atp_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_atp_units,
			        LAST_VALUE(eop_cost) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_cost,
			        LAST_VALUE(eop_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_units,
			        written_sales_dollars,
			        written_sales_units,
			        delivered_net_sales_units,
			        written_gm_dollar,
			        delivered_gm,
			        aoh_fwos_units,
			        total_receipt_cost,
			        total_receipt_units,
			        on_order_placed_total_unit,
			        atp_fwos_units,
  				/*	( SELECT SUM((value)::INT)
   							 FROM json_each_text(isku.tier_store_count::json)
  							) AS store_count,
  							*/
				--(select count(hierarchy_code) from (' || union_sql || ')ss) "No.sku",
			        om.store_count,
			        written_air,
			        written_auc,
			        written_aur,
			        delivered_aur,
			        written_dr_perc
			    FROM (' || op_union_sql || ') om
			  --  left join (' || union_sql || ') isku on om.hierarchy_code=isku.hierarchy_code and isku.current_week = om.current_week
			    LEFT JOIN mv_product_hierarchies_filter_temp mv ON om.dept = mv.l2_name AND om.hierarchy_code = mv.hierarchy_code
			    LEFT JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = om.current_week
			    LEFT JOIN itemfact_sku_temp is2 ON om.hierarchy_code = is2.hierarchy_code AND om.dept = is2.dept
			    left join item_smart.itemfact_assortment_tier_week iatw on iatw.current_week = om.current_week
			    WHERE om.dept IN ('||dept_name ||')  AND collection_name IN ('||coll_name ||') AND mv.vendor_name IN ('||ven_name ||')
				AND om.current_week between '||sweek ||' and '||tweek ||' and channel<>''Warehouse''
				
			), op_data as (SELECT
			    dept,
			    class,
			    channel,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    fiscal_year,
			    fiscal_month,
			    fiscal_week,
			    markdown_date,
			    launch_date,
			    exit_date,
			    op_aoh_units,
			    op_atp_units,
			    op_eop_cost,
			    op_eop_units,
		--	"No.sku",
			    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_dollars
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
			        ELSE 0 END) AS pre_md_written_sales,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_units
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
			        ELSE 0 END) AS pre_md_written_units,
			    AVG(store_count) AS store_count,
			    AVG(written_air) AS w_air,
			    AVG(written_auc) AS w_auc,
			    AVG(written_aur) AS w_aur,
			    AVG(delivered_aur) AS d_aur,
			    AVG(written_dr_perc) AS w_dr_perc,
			    SUM(written_sales_dollars) AS w_sls_dollars,
			    SUM(written_sales_units) AS w_sls_units,
			    SUM(delivered_net_sales_units) AS d_sls_dollars,
			    SUM(delivered_net_sales_units) AS d_sls_units,
			    SUM(written_gm_dollar) AS w_gm_dollars,
			    SUM(delivered_gm) AS d_gm,
			    SUM(aoh_fwos_units) AS aoh_fwos_units,
			    SUM(total_receipt_cost) AS total_receipt_cost,
			    SUM(total_receipt_units) AS total_receipt_units,
			    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
			    SUM(atp_fwos_units) AS atp_fwos_units
			FROM op_base_data
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,14,15,16,17,18,19,20,21--,22
			), op_agg as (select dept,
			    class,
			    channel,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    fiscal_year as year,
			    fiscal_month as month,
			    markdown_date,
			    launch_date,
			    exit_date,
			    op_aoh_units,
			    op_atp_units,
			    op_eop_cost,
			    op_eop_units,
--"No.sku",
			avg(store_count) as op_store_count, avg(w_air) as op_w_air, 
			avg(w_auc) as op_w_auc, avg(w_aur) as op_w_aur, avg(w_dr_perc) as op_w_dr_perc,
			nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
			nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
			nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
			--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
			nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
			sum(w_sls_dollars) as op_w_sls_dollars, avg(w_sls_ecom_perc) as op_w_sls_ecom_perc, 
			sum(w_sls_units) as op_w_sls_units, sum(w_gm_dollars) as op_w_gm_dollars, sum(post_md_written_sales) as op_post_md_written_sales, 
			sum(pre_md_written_sales) as op_pre_md_written_sales, sum(post_md_written_units) as op_post_md_written_units, sum(pre_md_written_units) as op_pre_md_written_units, 
			sum(d_sls_dollars) as op_d_sls_dollars, sum(d_sls_units) as op_d_sls_units, sum(d_gm) as op_d_gm, avg(d_aur) as op_d_aur,
			sum(aoh_fwos_units) as op_aoh_fwos_units, sum(atp_fwos_units) as op_atp_fwos_units,
			sum(total_receipt_cost) as op_total_receipt_cost, sum(total_receipt_units) as op_total_receipt_units, 
			sum(on_order_placed_total_unit) as op_oo_u_ttl_p
			from op_data
			group by 1,2,3,4,5,6,7,8, 9, 10, 11, 12, 13,14,15,16,17,18,19,20--,21
			), op as (select 
			dept,
			    class,
			    channel,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    year,
			    month,
			    markdown_date,
			    launch_date,
			    exit_date,
			    op_aoh_units,
			    op_atp_units,
--"No.sku",
			    op_eop_cost,
			    op_eop_units,
			op_store_count, w_air, w_auc, w_dr_perc,
			CASE 
			  WHEN channel = ''Ecom'' THEN 
			    op_w_sls_dollars / NULLIF(SUM(op_w_sls_dollars) OVER (PARTITION BY dept, year, month), 0)
			  ELSE 0
			END AS op_w_sls_ecom_perc,
			op_pre_md_written_sales, op_post_md_written_sales, op_pre_md_written_units, op_post_md_written_units,
			op_w_sls_dollars, op_w_gm_dollars,op_d_sls_dollars,op_d_sls_units,
			avg(op_w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_sls_dollars_3m_avg,
			avg(op_w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_sls_dollars_6m_avg,
			avg(op_w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_sls_dollars_9m_avg,
			op_w_sls_units,
			avg(op_w_sls_units) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_sls_units_3m_avg,
			avg(op_w_sls_units) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_sls_units_6m_avg,
			avg(op_w_sls_units) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_sls_units_9m_avg,
			op_w_aur,
			avg(op_w_aur) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_aur_3m_avg,
			avg(op_w_aur) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_aur_6m_avg,
			avg(op_w_aur) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_aur_9m_avg,
			op_d_gm, op_d_aur, op_aoh_fwos_units, op_atp_fwos_units, op_total_receipt_cost, 
			op_total_receipt_units, op_oo_u_ttl_p
			from op_agg), op_final as ( select dept,
			    class,
			    sku,
			    markdown_date,
			    op_eop_cost,
			    op_eop_units,
--"No.sku",
			    op_pre_md_written_sales, op_post_md_written_sales, op_pre_md_written_units, op_post_md_written_units,
			    avg(op.w_air) as op_w_air, 
			    avg(op.w_auc) as op_w_auc,
			    sum(op_w_sls_dollars) as op_w_sls_dollars,
			    avg(op_w_sls_ecom_perc) as op_w_sls_ecom_perc,
			    sum(op_w_sls_units) as op_w_sls_units,
			    avg(op_w_aur) as op_w_aur,
			    avg(op.w_dr_perc) as op_w_dr_perc, 
			    sum(op_w_gm_dollars) as op_w_gm_dollars,
			    sum(op_aoh_units) as op_aoh_units,
			    sum(op_aoh_fwos_units) as op_aoh_fwos_units,
			    sum(op_total_receipt_units) as op_total_receipt_units,
			    sum(op_oo_u_ttl_p) as op_oo_u_ttl_p,
			    sum(op_atp_units) as op_atp_units,
			    sum(op_atp_fwos_units) as op_atp_fwos_units,
			    sum(op_d_sls_dollars) as op_d_sls_dollars,
			    sum(op_d_sls_units) as op_d_sls_units,
			    avg(op_d_aur) as op_d_aur,
			    avg(op_d_gm) as op_d_gm
			    from op
			    group by 1,2,3,4,5,6,7,8,9,10 --,11
			), ly_base_data AS (
			    SELECT 
			        dpt_name as dept,
			        class_name as class,
			        channel,
			        product_code as sku,
			        product_description as sku_description,
			        collection_name AS collection,
			        lifestyle,
			        lm.hierarchy_code,
			        mv.vendor_name as vendor,
			        kit_status as hard_kit,
			        assortment_tier,
			        mv.purchase_status,
			        fiscal_year,
			        fiscal_month,
			        fiscal_week,
			        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
			        CASE WHEN is2.launch_date IS NULL THEN mv.launch_date ELSE is2.launch_date END AS launch_date,
			        CASE WHEN is2.exit_date IS NULL THEN mv.exit_date ELSE is2.exit_date END AS exit_date,
			        FIRST_VALUE(aoh_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_aoh_units,
			        FIRST_VALUE(atp_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_atp_units,
			        LAST_VALUE(eop_cost) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ) AS ly_eop_cost,
			        LAST_VALUE(eop_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ) AS ly_eop_units,
			        written_sales_dollars,
			        written_sales_units,
			        delivered_net_sales_units,
			        written_gm_dollar,
			        delivered_gm,
			        aoh_fwos_units,
			        total_receipt_cost,
			        total_receipt_units,
			        on_order_placed_total_unit,
			        atp_fwos_units,
  					/*		(
   							 SELECT SUM((value)::INT)
   							 FROM json_each_text(isku.tier_store_count::json)
  							) AS store_count,*/
			        lm.store_count,
			        written_air,
			        written_auc,
			        written_aur,
			        delivered_aur,
			        written_dr_perc
			    FROM item_smart.ly_master lm
			   -- left join (' || union_sql || ') isku on lm.hierarchy_code=isku.hierarchy_code and isku.current_week = lm.current_week
			    LEFT JOIN mv_product_hierarchies_filter_temp mv ON lm.dept = mv.l2_name AND lm.hierarchy_code = mv.hierarchy_code
			    LEFT JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = lm.current_week
			    LEFT JOIN itemfact_sku_temp is2 ON lm.hierarchy_code = is2.hierarchy_code AND lm.dept = is2.dept
			    left join item_smart.itemfact_assortment_tier_week iatw on iatw.current_week = lm.current_week
			    WHERE lm.dept IN ('||dept_name ||')  AND collection_name IN ('||coll_name ||') AND mv.vendor_name IN ('||ven_name ||')
				AND lm.current_week between '||sweek ||' and '||tweek ||' and channel<>''Warehouse''
				
			), ly_data as (SELECT
			    dept,
			    class,
			    channel,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    fiscal_year,
			    fiscal_month,
			    fiscal_week,
			    markdown_date,
			    launch_date,
			    exit_date,
			    ly_aoh_units,
			    ly_atp_units,
			    ly_eop_cost,
			    ly_eop_units,
			    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_dollars
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
			        ELSE 0 END) AS pre_md_written_sales,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_units
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
			        ELSE 0 END) AS pre_md_written_units,
			    AVG(store_count) AS store_count,
			    AVG(written_air) AS w_air,
			    AVG(written_auc) AS w_auc,
			    AVG(written_aur) AS w_aur,
			    AVG(delivered_aur) AS d_aur,
			    AVG(written_dr_perc) AS w_dr_perc,
			    SUM(written_sales_dollars) AS w_sls_dollars,
			    SUM(written_sales_units) AS w_sls_units,
			    SUM(delivered_net_sales_units) AS d_sls_dollars,
			    SUM(delivered_net_sales_units) AS d_sls_units,
			    SUM(written_gm_dollar) AS w_gm_dollars,
			    SUM(delivered_gm) AS d_gm,
			    SUM(aoh_fwos_units) AS aoh_fwos_units,
			    SUM(total_receipt_cost) AS total_receipt_cost,
			    SUM(total_receipt_units) AS total_receipt_units,
			    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
			    SUM(atp_fwos_units) AS atp_fwos_units
			FROM ly_base_data
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,14,15,16,17,18,19,20,21
			), ly_agg as (select dept,
			    class,
			    channel,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    fiscal_year as year,
			    fiscal_month as month,
			    markdown_date,
			    launch_date,
			    exit_date,
			    ly_aoh_units,
			    ly_atp_units,
			    ly_eop_cost,
			    ly_eop_units,
			avg(store_count) as store_count, avg(w_air) as w_air, 
			avg(w_auc) as w_auc, avg(w_aur) as w_aur, avg(w_dr_perc) as w_dr_perc,
			nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_air, 
			nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_auc,
			nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_aur,
			--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
			nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_dr_perc,
			sum(w_sls_dollars) as w_sls_dollars, avg(w_sls_ecom_perc) as w_sls_ecom_perc, 
			sum(w_sls_units) as w_sls_units, sum(w_gm_dollars) as w_gm_dollars, sum(post_md_written_sales) as post_md_written_sales, 
			sum(pre_md_written_sales) as pre_md_written_sales, sum(post_md_written_units) as post_md_written_units, sum(pre_md_written_units) as pre_md_written_units, 
			sum(d_sls_dollars) as d_sls_dollars, sum(d_sls_units) as d_sls_units, sum(d_gm) as d_gm, avg(d_aur) as d_aur,
			sum(aoh_fwos_units) as aoh_fwos_units, sum(atp_fwos_units) as atp_fwos_units,
			sum(total_receipt_cost) as total_receipt_cost, sum(total_receipt_units) as total_receipt_units, sum(on_order_placed_total_unit) as oo_u_ttl_p
			from ly_data
			group by 1,2,3,4,5,6,7,8, 9, 10, 11, 12, 13,14,15,16,17,18,19,20
			), ly as (select dept,
			    class,
			    channel,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    year,
			    month,
			    markdown_date,
			    launch_date,
			    exit_date,
			store_count, ly_w_air, ly_w_auc, ly_w_dr_perc, 
			CASE 
			  WHEN channel = ''Ecom'' THEN 
			    w_sls_dollars / NULLIF(SUM(w_sls_dollars) OVER (PARTITION BY dept, year, month), 0)
			  ELSE 0
			END AS w_sls_ecom_perc,
			pre_md_written_sales, post_md_written_sales, pre_md_written_units, post_md_written_units,
			w_sls_dollars, w_gm_dollars, d_sls_dollars, d_sls_units,
			avg(w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_sls_dollars_3m_avg,
			avg(w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_sls_dollars_6m_avg,
			avg(w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_sls_dollars_9m_avg,
			w_sls_units,
			avg(w_sls_units) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_sls_units_3m_avg,
			avg(w_sls_units) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_sls_units_6m_avg,
			avg(w_sls_units) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_sls_units_9m_avg,
			ly_w_aur,
			avg(ly_w_aur) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_aur_3m_avg,
			avg(ly_w_aur) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_aur_6m_avg,
			avg(ly_w_aur) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_aur_9m_avg, 
			d_gm, d_aur, ly_aoh_units, aoh_fwos_units, ly_atp_units, atp_fwos_units,
			total_receipt_cost, total_receipt_units, oo_u_ttl_p, ly_eop_cost, ly_eop_units
			from ly_agg
			), ly_final as ( select dept,
			    class,
			    channel,
			    sku,
			    markdown_date,
			    ly_eop_cost, ly_eop_units,
			    pre_md_written_sales, post_md_written_sales, pre_md_written_units, post_md_written_units,
			    avg(ly_w_air) as ly_w_air, 
			    avg(ly_w_auc) as ly_w_auc,
			    sum(ly.w_sls_dollars) as ly_w_sls_dollars,
			    avg(ly.w_sls_ecom_perc) as ly_w_sls_ecom_perc,
			    sum(ly.w_sls_units) as ly_w_sls_units,
			    avg(ly_w_aur) as ly_w_aur,
			    avg(ly_w_dr_perc) as ly_w_dr_perc, 
			    sum(ly.w_gm_dollars) as ly_w_gm_dollars,
			    sum(ly_aoh_units) as ly_aoh_units,
			    sum(ly.aoh_fwos_units) as ly_aoh_fwos_units,
			    sum(ly.total_receipt_units) as ly_total_receipt_units,
			    sum(ly.oo_u_ttl_p) as ly_oo_u_ttl_p,
			    sum(ly_atp_units) as ly_atp_units,
			    sum(ly.atp_fwos_units) as ly_atp_fwos_units,
			    sum(ly.d_sls_dollars) as ly_d_sls_dollars,
			    sum(ly.d_sls_units) as ly_d_sls_units,
			    avg(ly.d_aur) as ly_d_aur,
			    avg(ly.d_gm) as ly_d_gm
			    from ly
			    group by 1,2,3,4,5,6,7,8,9,10,11
			), 
			final_report as (
			select dept,
			    wp.class,
			    wp.sku,
			    wp.sku_description,
			    wp.collection,
			    wp.lifestyle,
			    wp.vendor,
			    wp.hard_kit,
--"No.sku",
			    wp.assortment_tier,
			    wp.purchase_status,
			    wp.markdown_date,
			    wp.launch_date,
			    wp.exit_date,
			    ly.channel,
			   coalesce(CAST(wp_store_count AS INT),0) as wp_store_count,
			    COALESCE(wp.w_air , 0) AS wp_w_air,
			COALESCE(wp.w_auc , 0) AS wp_w_auc,
			COALESCE(no_of_months , 0) AS no_of_months,
			COALESCE(avg_monthly_sls_dollars , 0) AS avg_monthly_sls_dollars,
			COALESCE(wp_w_sls_dollars_3m_avg , 0) AS wp_w_sls_dollars_3m_avg,
			COALESCE(wp_w_sls_dollars_6m_avg , 0) AS wp_w_sls_dollars_6m_avg,
			COALESCE(wp_w_sls_dollars_9m_avg , 0) AS wp_w_sls_dollars_9m_avg,
			COALESCE(avg_monthly_sls_units , 0) AS avg_monthly_sls_units,
			COALESCE(wp_w_sls_units_3m_avg , 0) AS wp_w_sls_units_3m_avg,
			COALESCE(wp_w_sls_units_6m_avg , 0) AS wp_w_sls_units_6m_avg,
			COALESCE(wp_w_sls_units_9m_avg , 0) AS wp_w_sls_units_9m_avg,
			COALESCE(wp_w_sls_dollars , 0) AS wp_w_sls_dollars,
			COALESCE(wp_pre_md_written_sales , 0) AS wp_pre_md_written_sales,
			COALESCE(wp_post_md_written_sales , 0) AS wp_post_md_written_sales,
			COALESCE(wp_w_sls_ecom_perc , 0) AS wp_w_sls_ecom_perc,
			COALESCE(op_w_sls_dollars , 0) AS op_w_sls_dollars,
			COALESCE(op_pre_md_written_sales , 0) AS op_pre_md_written_sales,
			COALESCE(op_post_md_written_sales , 0) AS op_post_md_written_sales,
			COALESCE(op_w_sls_ecom_perc , 0) AS op_w_sls_ecom_perc,
			COALESCE((wp_w_sls_dollars - op_w_sls_dollars) , 0) AS w_sls_dollars_wp_op_var,
			COALESCE((wp_pre_md_written_sales - op_pre_md_written_sales) , 0) AS pre_md_w_sls_dollars_wp_op_var,
			COALESCE((wp_post_md_written_sales - op_post_md_written_sales) , 0) AS post_md_w_sls_dollars_wp_op_var,
			COALESCE((wp_w_sls_dollars - op_w_sls_dollars) / NULLIF(op_w_sls_dollars, 0) , 0) AS w_sls_dollars_wp_op_var_perc,
			COALESCE((wp_pre_md_written_sales - op_pre_md_written_sales) / NULLIF(op_pre_md_written_sales, 0) , 0) AS pre_md_w_sls_dollars_wp_op_var_perc,
			COALESCE((wp_post_md_written_sales - op_post_md_written_sales) / NULLIF(op_post_md_written_sales, 0) , 0) AS post_md_w_sls_dollars_wp_op_var_perc,
			COALESCE(ly_w_sls_dollars , 0) AS ly_w_sls_dollars,
			COALESCE(ly.pre_md_written_sales , 0) AS ly_pre_md_written_sales,
			COALESCE(ly.post_md_written_sales , 0) AS ly_post_md_written_sales,
			COALESCE(ly_w_sls_ecom_perc , 0) AS ly_w_sls_ecom_perc,
			COALESCE((wp_w_sls_dollars - ly_w_sls_dollars) , 0) AS w_sls_dollars_wp_ly_var,
			COALESCE((wp_pre_md_written_sales - ly.pre_md_written_sales) , 0) AS pre_md_w_sls_dollars_wp_ly_var,
			COALESCE((wp_post_md_written_sales - ly.post_md_written_sales) , 0) AS post_md_w_sls_dollars_wp_ly_var,
			COALESCE((wp_w_sls_dollars - ly_w_sls_dollars) / NULLIF(ly_w_sls_dollars, 0) , 0) AS w_sls_dollars_wp_ly_var_perc,
			COALESCE((wp_pre_md_written_sales - ly.pre_md_written_sales) / NULLIF(ly.pre_md_written_sales, 0) , 0) AS pre_md_w_sls_dollars_wp_ly_var_perc,
			COALESCE((wp_post_md_written_sales - ly.post_md_written_sales) / NULLIF(ly.post_md_written_sales, 0) , 0) AS post_md_w_sls_dollars_wp_ly_var_perc,
			COALESCE(wp_w_sls_units , 0) AS wp_w_sls_units,
			COALESCE(wp_pre_md_written_units , 0) AS wp_pre_md_written_units,
			COALESCE(wp_post_md_written_units , 0) AS wp_post_md_written_units,
			COALESCE(op_w_sls_units , 0) AS op_w_sls_units,
			COALESCE(op_pre_md_written_units , 0) AS op_pre_md_written_units,
			COALESCE(op_post_md_written_units , 0) AS op_post_md_written_units,
			COALESCE((wp_w_sls_units - op_w_sls_units) , 0) AS w_sls_units_wp_op_var,
			COALESCE((wp_pre_md_written_units - op_pre_md_written_units) , 0) AS pre_md_w_sls_units_wp_op_var,
			COALESCE((wp_post_md_written_units - op_post_md_written_units) , 0) AS post_md_w_sls_units_wp_op_var,
			COALESCE((wp_w_sls_units - op_w_sls_units) / NULLIF(op_w_sls_units, 0) , 0) AS w_sls_units_wp_op_var_perc,
			COALESCE((wp_pre_md_written_units - op_pre_md_written_units) / NULLIF(op_pre_md_written_units, 0) , 0) AS pre_md_w_sls_units_wp_op_var_perc,
			COALESCE((wp_post_md_written_units - op_post_md_written_units) / NULLIF(op_post_md_written_units, 0) , 0) AS post_md_w_sls_units_wp_op_var_perc,
			COALESCE(ly_w_sls_units , 0) AS ly_w_sls_units,
			coalesce(ly.pre_md_written_units , 0) AS ly_pre_md_written_units,
			coalesce(ly.post_md_written_units , 0) AS ly_post_md_written_units,
			COALESCE((wp_w_sls_units - ly_w_sls_units) , 0) AS w_sls_units_wp_ly_var,
			COALESCE((wp_pre_md_written_units - ly.pre_md_written_units) , 0) AS pre_md_w_sls_units_wp_ly_var,
			COALESCE((wp_post_md_written_units - ly.post_md_written_units) , 0) AS post_md_w_sls_units_wp_ly_var,
			COALESCE((wp_w_sls_units - ly_w_sls_dollars) / NULLIF(ly_w_sls_units, 0) , 0) AS w_sls_units_wp_ly_var_perc,
			COALESCE((wp_pre_md_written_units - ly.pre_md_written_units) / NULLIF(ly.pre_md_written_units, 0) , 0) AS pre_md_w_sls_units_wp_ly_var_perc,
			COALESCE((wp_post_md_written_units - ly.post_md_written_units) / NULLIF(ly.post_md_written_units, 0) , 0) AS post_md_w_sls_units_wp_ly_var_perc,
			COALESCE(wp_w_aur , 0) AS w_aur,
			COALESCE(wp_w_aur_3m_avg , 0) AS wp_w_aur_3m_avg,
			COALESCE(wp_w_aur_6m_avg , 0) AS wp_w_aur_6m_avg,
			COALESCE(wp_w_aur_9m_avg , 0) AS wp_w_aur_9m_avg,
			COALESCE(op_w_aur , 0) AS op_w_aur,
			COALESCE(ly_w_aur , 0) AS ly_w_aur,
			COALESCE(wp_w_dr_perc , 0) AS wp_w_dr_perc,
			COALESCE(op_w_dr_perc , 0) AS op_w_dr_perc,
			COALESCE(ly_w_dr_perc , 0) AS ly_w_dr_perc,
			COALESCE(wp_w_gm_dollars , 0) AS wp_w_gm_dollars,
			COALESCE(NULLIF(wp_w_gm_dollars, 0) / NULLIF(wp_w_sls_dollars, 0) , 0) AS wp_w_gm_perc,
			COALESCE(op_w_gm_dollars , 0) AS op_w_gm_dollars,
			COALESCE(NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0) , 0) AS op_w_gm_perc,
			COALESCE((wp_w_gm_dollars - op_w_gm_dollars) , 0) AS w_gm_dollars_wp_op_var,
			COALESCE(((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)))/(NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)) , 0) AS w_gm_perc_wp_op_var,
			COALESCE((wp_w_gm_dollars - op_w_gm_dollars) / NULLIF(op_w_gm_dollars, 0) , 0) AS w_gm_dollars_wp_op_var_perc,
			COALESCE(ly_w_gm_dollars , 0) AS ly_w_gm_dollars,
			coalesce(NULLIF(ly_w_gm_dollars, 0) / NULLIF(ly_w_sls_dollars, 0) , 0) AS ly_w_gm_perc,
			COALESCE((wp_w_gm_dollars - ly_w_gm_dollars), 0) AS w_gm_dollars_wp_ly_var,
			COALESCE(((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(ly_w_gm_dollars, 0) / NULLIF(ly_w_sls_dollars, 0)))/(NULLIF(ly_w_gm_dollars, 0) / NULLIF(ly_w_sls_dollars, 0)) , 0) AS w_gm_perc_wp_ly_var,
			COALESCE((wp_w_gm_dollars - ly_w_gm_dollars) / NULLIF(ly_w_gm_dollars, 0) , 0) AS w_gm_dollars_wp_ly_var_perc,
			COALESCE(wp_aoh_units , 0) AS wp_aoh_units,
			COALESCE(wp_aoh_fwos_units , 0) AS wp_aoh_fwos_units,
			COALESCE(op_aoh_units , 0) AS op_aoh_units,
			COALESCE(op_aoh_fwos_units , 0) AS op_aoh_fwos_units,
			COALESCE(ly_aoh_units , 0) AS ly_aoh_units,
			COALESCE(ly_aoh_fwos_units , 0) AS ly_aoh_fwos_units,
			COALESCE(wp_total_receipt_units , 0) AS wp_total_receipt_units ,
			COALESCE(op_total_receipt_units , 0) AS op_total_receipt_units,
			COALESCE((wp_total_receipt_units - op_total_receipt_units) , 0) AS total_receipt_units_wp_op_var,
			COALESCE((wp_total_receipt_units - op_total_receipt_units) / NULLIF(op_total_receipt_units, 0) , 0) AS total_receipt_units_wp_op_var_perc,
			COALESCE(ly_total_receipt_units , 0) AS ly_total_receipt_units,
			COALESCE((wp_total_receipt_units - ly_total_receipt_units) , 0) AS total_receipt_units_wp_ly_var,
			COALESCE((wp_total_receipt_units - ly_total_receipt_units) / NULLIF(ly_total_receipt_units, 0) , 0) AS total_receipt_units_wp_ly_var_perc,
			COALESCE(wp_oo_u_ttl_p , 0) AS wp_oo_u_ttl_p,
			COALESCE(op_oo_u_ttl_p , 0) AS op_oo_u_ttl_p,
			COALESCE((wp_oo_u_ttl_p - op_oo_u_ttl_p) , 0) AS oo_u_ttl_p_wp_op_var,
			COALESCE((wp_oo_u_ttl_p - op_oo_u_ttl_p)/NULLIF(op_oo_u_ttl_p, 0) , 0) AS oo_u_ttl_p_wp_op_var_perc,
			COALESCE(ly_oo_u_ttl_p , 0) AS ly_oo_u_ttl_p,
			COALESCE((wp_oo_u_ttl_p - ly_oo_u_ttl_p) , 0) AS oo_u_ttl_p_wp_ly_var,
			COALESCE((wp_oo_u_ttl_p - ly_oo_u_ttl_p)/NULLIF(ly_oo_u_ttl_p, 0) , 0) AS oo_u_ttl_p_wp_ly_var_perc,
			COALESCE(wp_atp_units , 0) AS wp_atp_units,
			COALESCE(wp_atp_fwos_units , 0) AS wp_atp_fwos_units,
			COALESCE(op_atp_units , 0) AS op_atp_units,
			COALESCE(op_atp_fwos_units , 0) AS op_atp_fwos_units,
			COALESCE(ly_atp_units , 0) AS ly_atp_units,
			COALESCE(ly_atp_fwos_units , 0) AS ly_atp_fwos_units,
			COALESCE(wp_d_sls_dollars , 0) AS wp_d_sls_dollars,
			COALESCE(op_d_sls_dollars , 0) AS op_d_sls_dollars,
			COALESCE((wp_d_sls_dollars - op_d_sls_dollars) , 0) AS d_sls_dollars_wp_op_var,
			COALESCE((wp_d_sls_dollars - op_d_sls_dollars)/NULLIF(op_d_sls_dollars, 0) , 0) AS d_sls_dollars_wp_op_var_perc,
			COALESCE(ly_d_sls_dollars , 0) AS ly_d_sls_dollars,
			COALESCE((wp_d_sls_dollars - ly_d_sls_dollars) , 0) AS d_sls_dollars_wp_ly_var,
			COALESCE((wp_d_sls_dollars - ly_d_sls_dollars)/NULLIF(ly_d_sls_dollars, 0) , 0) AS d_sls_dollars_wp_ly_var_perc,
			COALESCE(wp_d_sls_units , 0) AS wp_d_sls_units,
			COALESCE(op_d_sls_units , 0) AS op_d_sls_units,
			COALESCE((wp_d_sls_units - op_d_sls_units) , 0) AS d_sls_units_wp_op_var,
			COALESCE((wp_d_sls_units - op_d_sls_units)/NULLIF(op_d_sls_units, 0) , 0) AS d_sls_units_wp_op_var_perc,
			COALESCE(ly_d_sls_units , 0) AS ly_d_sls_units,
			COALESCE((wp_d_sls_units - ly_d_sls_units) , 0) AS d_sls_units_wp_ly_var,
			COALESCE((wp_d_sls_units - ly_d_sls_units)/NULLIF(ly_d_sls_units, 0) , 0) AS d_sls_units_wp_ly_var_perc,
			COALESCE(wp_d_aur , 0) AS wp_d_aur,
			COALESCE(op_d_aur , 0) AS op_d_aur,
			COALESCE(ly_d_aur , 0) AS ly_d_aur,
			COALESCE(wp_d_gm , 0) AS wp_d_gm,
			COALESCE(NULLIF(wp_d_gm, 0) / NULLIF(wp_d_sls_dollars, 0) , 0) AS wp_d_gm_perc,
			COALESCE(op_d_gm , 0) AS op_d_gm,
			COALESCE(NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0) , 0) AS op_d_gm_perc,
			COALESCE((wp_d_gm - op_d_gm) , 0) AS d_gm_wp_op_var,
			COALESCE(((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)))/(NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)) , 0) AS d_gm_perc_wp_op_var,
			COALESCE((wp_d_gm - op_d_gm) / NULLIF(op_d_gm, 0) , 0) AS d_gm_wp_op_var_perc,
			COALESCE(ly_d_gm , 0) AS ly_d_gm,
			coalesce(NULLIF(ly_d_gm, 0) / NULLIF(ly_w_sls_dollars, 0) , 0) AS ly_d_gm_perc,
			COALESCE((wp_d_gm - ly_d_gm) , 0) AS d_gm_wp_ly_var,
			COALESCE(((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(ly_d_gm, 0) / NULLIF(ly_d_sls_dollars, 0)))/(NULLIF(ly_d_gm, 0) / NULLIF(ly_d_sls_dollars, 0)) , 0) AS d_gm_perc_wp_ly_var,
			COALESCE((wp_d_gm - ly_d_gm) / NULLIF(ly_d_gm, 0) , 0) AS d_gm_wp_ly_var_perc,
			COALESCE(wp_eop_cost , 0) AS wp_eop_cost,
			COALESCE(op_eop_cost , 0) AS op_eop_cost,
			COALESCE((wp_eop_cost - op_eop_cost) , 0) AS eop_cost_wp_op_var,
			COALESCE((wp_eop_cost - op_eop_cost) / NULLIF(op_eop_cost, 0) , 0) AS eop_cost_wp_op_var_perc,
			COALESCE(ly_eop_cost , 0) AS ly_eop_cost,
			COALESCE((wp_eop_cost - ly_eop_cost) , 0) AS eop_cost_wp_ly_var,
			COALESCE((wp_eop_cost - ly_eop_cost) / NULLIF(ly_eop_cost, 0) , 0) AS eop_cost_wp_ly_var_perc,
			COALESCE(wp_eop_units , 0) AS wp_eop_units,
			COALESCE(op_eop_units , 0) AS op_eop_units,
			COALESCE((wp_eop_units - op_eop_units) , 0) AS eop_units_wp_op_var,
			COALESCE((wp_eop_units - op_eop_units) / NULLIF(op_eop_units, 0) , 0) AS eop_units_wp_op_var_perc,
			COALESCE(ly_eop_units , 0) AS ly_eop_units,
			COALESCE((wp_eop_units - ly_eop_units) , 0) AS eop_units_wp_ly_var,
			COALESCE((wp_eop_units - ly_eop_units) / NULLIF(ly_eop_units, 0) , 0) AS eop_units_wp_ly_var_perc
			    from wp_final wp
			    left join op_final op using (dept, sku)
			    left join ly_final ly using (dept, sku)
			) 
			Select 
    dept as "Dept",
    -- Channel as "Channel",
    class as "Class",
    sku as "SKU",
    sku_description as "SKU Description",
    --"No.sku",
    collection as "Collection",
    lifestyle as "Lifestyle",
    vendor as "Vendor",
    hard_kit as "Hard Kit (Y/N)",
    assortment_tier as "Assortment Tier",
    wp_store_count as "Store Count"  ,
    purchase_status as "Purchase Status",
    launch_date as "Launch Date",
    markdown_date as "Initial MD Date",
    exit_date as "Exit Date",
   CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_air, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "AIR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_auc, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "AUC",
COALESCE(no_of_months, 0) AS "WP # of Months w/Sls",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(avg_monthly_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Avg Monthly W Sls$",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_3m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "3 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_6m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "6 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_9m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "9 mo Avg Month W Sls $",
TRUNC(COALESCE(avg_monthly_sls_units, 0)) AS "WP Avg Monthly W U Sls",
TRUNC(COALESCE(wp_w_sls_units_3m_avg, 0)) AS "3 mo Avg Month W Sls U",
TRUNC(COALESCE(wp_w_sls_units_6m_avg, 0)) AS "6 mo Avg Month W Sls U",
TRUNC(COALESCE(wp_w_sls_units_9m_avg, 0)) AS "9 mo Avg Month W Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_pre_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_post_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_pre_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_post_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PreMD Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ % Var  to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PreMD % Var  to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PostMD % Var  to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_pre_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_post_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PreMD Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W Sls $ - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PreMD % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls $ - PostMD % Var to LY",
TRUNC(COALESCE(wp_w_sls_units, 0)) AS "WP W Sls U",
TRUNC(COALESCE(wp_pre_md_written_units, 0)) AS "WP W Sls U - PreMD",
TRUNC(COALESCE(wp_post_md_written_units, 0)) AS "WP W Sls U - PostMD",
TRUNC(COALESCE(op_w_sls_units, 0)) AS "OP W Sls U",
TRUNC(COALESCE(op_pre_md_written_units, 0)) AS "OP W Sls U - PreMD",
TRUNC(COALESCE(op_post_md_written_units, 0)) AS "OP W Sls U - PostMD",
TRUNC(COALESCE(w_sls_units_wp_op_var, 0)) AS "WP W Sls U Var to OP",
TRUNC(COALESCE(pre_md_w_sls_units_wp_op_var, 0)) AS "WP W Sls U - PreMD Var to OP",
TRUNC(COALESCE(post_md_w_sls_units_wp_op_var, 0)) AS "WP W Sls U - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PreMD % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PostMD % Var to OP",
TRUNC(COALESCE(ly_w_sls_units, 0)) AS "LY W Sls U",
TRUNC(COALESCE(ly_pre_md_written_units, 0)) AS "LY W Sls U - PreMD",
TRUNC(COALESCE(ly_post_md_written_units, 0)) AS "LY W Sls U - PostMD",
TRUNC(COALESCE(w_sls_units_wp_ly_var, 0)) AS "WP W Sls U Var to LY",
TRUNC(COALESCE(pre_md_w_sls_units_wp_ly_var, 0)) AS "WP W Sls U - PreMD Var to LY",
TRUNC(COALESCE(post_md_w_sls_units_wp_ly_var, 0)) AS "WP W Sls U - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PreMD % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W Sls U - PostMD % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_3m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "3 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_6m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "6 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_9m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "9 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W AUR",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY W DR%",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_perc_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP W GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_perc_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP W GM $ % Var to LY",
TRUNC(COALESCE(wp_aoh_units, 0)) AS "WP AOH U",
TRUNC(COALESCE(wp_aoh_fwos_units, 0)) AS "WP AOH FWOS U",
TRUNC(COALESCE(op_aoh_units, 0)) AS "OP AOH U",
TRUNC(COALESCE(op_aoh_fwos_units, 0)) AS "OP AOH FWOS U",
TRUNC(COALESCE(ly_aoh_units, 0)) AS "LY AOH U",
TRUNC(COALESCE(ly_aoh_fwos_units, 0)) AS "LY AOH FWOS U",
TRUNC(COALESCE(wp_total_receipt_units, 0)) AS "WP Ttl Rcpt U",
TRUNC(COALESCE(op_total_receipt_units, 0)) AS "OP Ttl Rcpt U",
TRUNC(COALESCE(total_receipt_units_wp_op_var, 0)) AS "WP Ttl Rcpt U Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(total_receipt_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP Ttl Rcpt U % Var to OP",
TRUNC(COALESCE(ly_total_receipt_units, 0)) AS "LY Ttl Rcpt U",
TRUNC(COALESCE(total_receipt_units_wp_ly_var, 0)) AS "WP Ttl Rcpt U Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(total_receipt_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP Ttl Rcpt U % Var to LY",
TRUNC(COALESCE(wp_oo_u_ttl_p, 0)) AS "WP OO U (TTL-P)",
TRUNC(COALESCE(op_oo_u_ttl_p, 0)) AS "OP OO U (TTL-P)",
TRUNC(COALESCE(oo_u_ttl_p_wp_op_var, 0)) AS "WP OO U (TTL-P) Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(oo_u_ttl_p_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP OO U (TTL-P) % Var to OP",
TRUNC(COALESCE(ly_oo_u_ttl_p, 0)) AS "LY OO U (TTL-P)",
TRUNC(COALESCE(oo_u_ttl_p_wp_ly_var, 0)) AS "WP OO U (TTL-P) Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(oo_u_ttl_p_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP OO U (TTL-P) % Var to LY",
TRUNC(COALESCE(wp_atp_units, 0)) AS "WP ATP U",
TRUNC(COALESCE(wp_atp_fwos_units, 0)) AS "WP ATP FWOS U",
TRUNC(COALESCE(op_atp_units, 0)) AS "OP ATP U",
TRUNC(COALESCE(op_atp_fwos_units, 0)) AS "OP ATP FWOS U",
TRUNC(COALESCE(ly_atp_units, 0)) AS "LY ATP U",
TRUNC(COALESCE(ly_atp_fwos_units, 0)) AS "LY ATP FWOS U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to OP D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to LY D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY D Sls $",
TRUNC(COALESCE(wp_d_sls_units, 0)) AS "WP D Sls U",
TRUNC(COALESCE(op_d_sls_units, 0)) AS "OP D Sls U",
TRUNC(COALESCE(d_sls_units_wp_op_var, 0)) AS "WP Var to OP D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP D Sls U",
TRUNC(COALESCE(ly_d_sls_units, 0)) AS "LY D Sls U",
TRUNC(COALESCE(d_sls_units_wp_ly_var, 0)) AS "WP Var to LY D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY D Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(op_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "OP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_gm_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_perc_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "LY D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_gm_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP D GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_perc_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP D GM $ % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(eop_cost_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to OP EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_cost_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "LY EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(eop_cost_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) AS "WP Var to LY EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_cost_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY EOP $",
TRUNC(COALESCE(wp_eop_units, 0)) AS "WP EOP U",
TRUNC(COALESCE(op_eop_units, 0)) AS "OP EOP U",
TRUNC(COALESCE(eop_units_wp_op_var, 0)) AS "WP Var to OP EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to OP EOP U",
TRUNC(COALESCE(ly_eop_units, 0)) AS "LY EOP U",
TRUNC(COALESCE(eop_units_wp_ly_var, 0)) AS "WP Var to LY EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') AS "WP % Var to LY EOP U"
			from final_report where channel<>''Warehouse'';
			';
		ELSEIF 	report_type = 'sku_pre_md' THEN

	_query_combine := '
			WITH wp_base_data AS (
			    SELECT 
			        dpt_name as dept,
			        class_name as class,
			        channel,
			        product_code as sku,
			        product_description as sku_description,
			        collection_name AS collection,
			        lifestyle,
			        wm.hierarchy_code,
			        mv.vendor_name as vendor,
			        kit_status as hard_kit,
			        assortment_tier,
			        mv.purchase_status,
			        fiscal_year,
			        fiscal_month,
			        fiscal_week,
			        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
			        CASE WHEN is2.launch_date IS NULL THEN mv.launch_date ELSE is2.launch_date END AS launch_date,
			        CASE WHEN is2.exit_date IS NULL THEN mv.exit_date ELSE is2.exit_date END AS exit_date,
			        FIRST_VALUE(aoh_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_aoh_units,
			        FIRST_VALUE(atp_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_atp_units,
			        LAST_VALUE(eop_cost) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_cost,
			        LAST_VALUE(eop_units) OVER (PARTITION BY wm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_units,
			        written_sales_dollars,
			        written_sales_units,
			        delivered_net_sales_units,
			        written_gm_dollar,
			        delivered_gm,
			        aoh_fwos_units,
			        total_receipt_cost,
			        total_receipt_units,
			        on_order_placed_total_unit,
			        atp_fwos_units,
  					/*	(
   							SELECT SUM((value)::INT)
   							FROM json_each_text(isku.tier_store_count::json)
  							) AS store_count, */
			        wm.store_count,
			        written_air,
			        written_auc,
			        written_aur,
			        delivered_aur,
			        written_dr_perc
			    FROM (' || wp_union_sql || ') wm
			  --  left join (' || union_sql || ') isku on wm.hierarchy_code=isku.hierarchy_code and isku.current_week = wm.current_week
			    LEFT JOIN mv_product_hierarchies_filter_temp mv ON wm.dept = mv.l2_name AND wm.hierarchy_code = mv.hierarchy_code
			    LEFT JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
			    LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code AND wm.dept = is2.dept
			    left join item_smart.itemfact_assortment_tier_week iatw on iatw.current_week = wm.current_week
			    WHERE wm.dept IN ('||dept_name ||')  AND collection_name IN ('||coll_name ||') AND mv.vendor_name IN ('||ven_name ||')
				AND wm.current_week between '||sweek ||' and '||tweek ||'
				
			), wp_data as (SELECT
			    dept,
			    class,
			    channel,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    fiscal_year,
			    fiscal_month,
			    fiscal_week,
			    markdown_date,
			    launch_date,
			    exit_date,
			    wp_aoh_units,
			    wp_atp_units,
			    wp_eop_cost,
			    wp_eop_units,
hierarchy_code,
			    COUNT(DISTINCT (fiscal_year, fiscal_month)) AS no_of_months,
			    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_dollars
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
			        ELSE 0 END) AS pre_md_written_sales,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_units
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
			        ELSE 0 END) AS pre_md_written_units,
			    AVG(store_count) AS store_count,
			    AVG(written_air) AS w_air,
			    AVG(written_auc) AS w_auc,
			    AVG(written_aur) AS w_aur,
			    AVG(delivered_aur) AS d_aur,
			    AVG(written_dr_perc) AS w_dr_perc,
			    SUM(written_sales_dollars) AS w_sls_dollars,
			    SUM(written_sales_units) AS w_sls_units,
			    SUM(delivered_net_sales_units) AS d_sls_dollars,
			    SUM(delivered_net_sales_units) AS d_sls_units,
			    SUM(written_gm_dollar) AS w_gm_dollars,
			    SUM(delivered_gm) AS d_gm,
			    SUM(aoh_fwos_units) AS aoh_fwos_units,
			    SUM(total_receipt_cost) AS total_receipt_cost,
			    SUM(total_receipt_units) AS total_receipt_units,
			    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
			    SUM(atp_fwos_units) AS atp_fwos_units
			FROM wp_base_data
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,14,15,16,17,18,19,20,21,22
			), wp_agg as (select dept,
			    class,
			    channel,
hierarchy_code,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    fiscal_year as year,
			    fiscal_month as month,
			    markdown_date,
			    launch_date,
			    exit_date,
			    wp_aoh_units,
			    wp_atp_units,
			    wp_eop_cost,
			    wp_eop_units,
			    no_of_months,
			avg(store_count) as wp_store_count, avg(w_air) as wp_w_air, 
			avg(w_auc) as wp_w_auc, avg(w_aur) as wp_w_aur, avg(w_dr_perc) as wp_w_dr_perc,
			nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
			nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
			nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
			nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_sls_units),0) as d_aur,
			nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
			sum(w_sls_dollars) as wp_w_sls_dollars, avg(w_sls_ecom_perc) as wp_w_sls_ecom_perc, 
			sum(w_sls_units) as wp_w_sls_units, sum(w_gm_dollars) as wp_w_gm_dollars, sum(post_md_written_sales) as wp_post_md_written_sales, 
			sum(pre_md_written_sales) as wp_pre_md_written_sales, sum(post_md_written_units) as wp_post_md_written_units, sum(pre_md_written_units) as wp_pre_md_written_units, 
			sum(d_sls_dollars) as wp_d_sls_dollars, sum(d_sls_units) as wp_d_sls_units, sum(d_gm) as wp_d_gm, avg(d_aur) as wp_d_aur,
			sum(aoh_fwos_units) as wp_aoh_fwos_units, sum(total_receipt_cost) as wp_total_receipt_cost, 
			sum(total_receipt_units) as wp_total_receipt_units, sum(atp_fwos_units) as wp_atp_fwos_units,
			sum(on_order_placed_total_unit) as wp_oo_u_ttl_p
			from wp_data
			group by 1,2,3,4,5,6,7,8,9, 10, 11, 12, 13,14,15,16,17,18,19,20,21,22
			), wp as (select dept,
			    class,
			    channel,
	hierarchy_code,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    year,
			    month,
			    markdown_date,
			    launch_date,
			    exit_date,
			    wp_aoh_units,
			    wp_atp_units,
			    wp_eop_cost,
			    wp_eop_units,
			wp_store_count, w_air, w_auc, w_dr_perc,
			CASE 
			  WHEN channel = ''Ecom'' THEN 
			    wp_w_sls_dollars / NULLIF(SUM(wp_w_sls_dollars) OVER (PARTITION BY dept, year, month), 0)
			  ELSE 0
			END AS wp_w_sls_ecom_perc,
			wp_pre_md_written_sales, wp_post_md_written_sales, wp_pre_md_written_units, wp_post_md_written_units,
			wp_w_sls_dollars, wp_w_gm_dollars, wp_d_sls_dollars, wp_d_sls_units,no_of_months,
			avg(wp_w_sls_dollars) over
			(partition by dept, channel) as avg_monthly_sls_dollars,
			avg(wp_w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_sls_dollars_3m_avg,
			avg(wp_w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_sls_dollars_6m_avg,
			avg(wp_w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_sls_dollars_9m_avg,
			wp_w_sls_units,
			avg(wp_w_sls_units) over
			(partition by dept, channel) as avg_monthly_sls_units,
			avg(wp_w_sls_units) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_sls_units_3m_avg,
			avg(wp_w_sls_units) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_sls_units_6m_avg,
			avg(wp_w_sls_units) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_sls_units_9m_avg,
			w_aur,
			avg(wp_w_aur) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as wp_w_aur_3m_avg,
			avg(wp_w_aur) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as wp_w_aur_6m_avg,
			avg(wp_w_aur) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as wp_w_aur_9m_avg,
			wp_d_gm, d_aur, wp_aoh_fwos_units, wp_atp_fwos_units,
			wp_total_receipt_cost, wp_total_receipt_units, wp_oo_u_ttl_p
			from wp_agg), wp_final as ( select dept,
			    class,
	--count(hierarchy_code),
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    avg(CAST(wp_store_count AS INT)) as wp_store_count,
			    purchase_status,
			    launch_date,
			    markdown_date,
			    exit_date,
			    avg(w_air) as w_air, 
			    avg(w_auc) as w_auc, 
			    avg_monthly_sls_dollars,
			    wp_w_sls_dollars_3m_avg,
			    wp_w_sls_dollars_6m_avg,
			    wp_w_sls_dollars_9m_avg,
			    avg_monthly_sls_units,
			    wp_w_sls_units_3m_avg,
			    wp_w_sls_units_6m_avg,
			    wp_w_sls_units_9m_avg,
			    wp_w_aur_3m_avg,
			    wp_w_aur_6m_avg,
			    wp_w_aur_9m_avg,
			    wp_eop_cost,
			    wp_eop_units,
			    wp_pre_md_written_sales, wp_post_md_written_sales, wp_pre_md_written_units, wp_post_md_written_units,
                no_of_months,
			    sum(wp_w_sls_dollars) as wp_w_sls_dollars,
			    avg(wp_w_sls_ecom_perc) as wp_w_sls_ecom_perc,
			    sum(wp_w_sls_units) as wp_w_sls_units,
			    avg(wp.w_aur) as wp_w_aur,
			    avg(wp.w_dr_perc) as wp_w_dr_perc, 
			    sum(wp_w_gm_dollars) as wp_w_gm_dollars,
			    sum(wp_aoh_units) as wp_aoh_units,
			    sum(wp_aoh_fwos_units) as wp_aoh_fwos_units,
			    sum(wp_total_receipt_units) as wp_total_receipt_units,
			    sum(wp_oo_u_ttl_p) as wp_oo_u_ttl_p,
			    sum(wp_atp_units) as wp_atp_units,
			    sum(wp_atp_fwos_units) as wp_atp_fwos_units,
			    sum(wp_d_sls_dollars) as wp_d_sls_dollars,
			    sum(wp_d_sls_units) as wp_d_sls_units,
			    avg(wp.d_aur) as wp_d_aur,
			    avg(wp_d_gm) as wp_d_gm
			    from wp
			    group by 1,2,3,4,5,6,7,8,9,11,12,13,14,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34
			), op_base_data AS (
			    SELECT 
			        dpt_name as dept,
			        class_name as class,
			        channel,
			        product_code as sku,
			        product_description as sku_description,
			        collection_name AS collection,
			        lifestyle,
			        om.hierarchy_code,
			        mv.vendor_name as vendor,
			        kit_status as hard_kit,
			        assortment_tier,
			        mv.purchase_status,
			        fiscal_year,
			        fiscal_month,
			        fiscal_week,
			        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
			        CASE WHEN is2.launch_date IS NULL THEN mv.launch_date ELSE is2.launch_date END AS launch_date,
			        CASE WHEN is2.exit_date IS NULL THEN mv.exit_date ELSE is2.exit_date END AS exit_date,
			        FIRST_VALUE(aoh_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_aoh_units,
			        FIRST_VALUE(atp_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_atp_units,
			        LAST_VALUE(eop_cost) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_cost,
			        LAST_VALUE(eop_units) OVER (PARTITION BY om.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_units,
			        written_sales_dollars,
			        written_sales_units,
			        delivered_net_sales_units,
			        written_gm_dollar,
			        delivered_gm,
			        aoh_fwos_units,
			        total_receipt_cost,
			        total_receipt_units,
			        on_order_placed_total_unit,
			        atp_fwos_units,
  				/*	( SELECT SUM((value)::INT)
   							 FROM json_each_text(isku.tier_store_count::json)
  							) AS store_count,
  							*/
				--(select count(hierarchy_code) from (' || union_sql || ')ss) "No.sku",
			        om.store_count,
			        written_air,
			        written_auc,
			        written_aur,
			        delivered_aur,
			        written_dr_perc
			    FROM (' || op_union_sql || ') om
			  --  left join (' || union_sql || ') isku on om.hierarchy_code=isku.hierarchy_code and isku.current_week = om.current_week
			    LEFT JOIN mv_product_hierarchies_filter_temp mv ON om.dept = mv.l2_name AND om.hierarchy_code = mv.hierarchy_code
			    LEFT JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = om.current_week
			    LEFT JOIN itemfact_sku_temp is2 ON om.hierarchy_code = is2.hierarchy_code AND om.dept = is2.dept
			    left join item_smart.itemfact_assortment_tier_week iatw on iatw.current_week = om.current_week
			    WHERE om.dept IN ('||dept_name ||')  AND collection_name IN ('||coll_name ||') AND mv.vendor_name IN ('||ven_name ||')
				AND om.current_week between '||sweek ||' and '||tweek ||' and channel<>''Warehouse'' and kit_status in (''Y'',''N'')
				
			), op_data as (SELECT
			    dept,
			    class,
			    channel,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    fiscal_year,
			    fiscal_month,
			    fiscal_week,
			    markdown_date,
			    launch_date,
			    exit_date,
			    op_aoh_units,
			    op_atp_units,
			    op_eop_cost,
			    op_eop_units,
		--	"No.sku",
			    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_dollars
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
			        ELSE 0 END) AS pre_md_written_sales,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_units
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
			        ELSE 0 END) AS pre_md_written_units,
			    AVG(store_count) AS store_count,
			    AVG(written_air) AS w_air,
			    AVG(written_auc) AS w_auc,
			    AVG(written_aur) AS w_aur,
			    AVG(delivered_aur) AS d_aur,
			    AVG(written_dr_perc) AS w_dr_perc,
			    SUM(written_sales_dollars) AS w_sls_dollars,
			    SUM(written_sales_units) AS w_sls_units,
			    SUM(delivered_net_sales_units) AS d_sls_dollars,
			    SUM(delivered_net_sales_units) AS d_sls_units,
			    SUM(written_gm_dollar) AS w_gm_dollars,
			    SUM(delivered_gm) AS d_gm,
			    SUM(aoh_fwos_units) AS aoh_fwos_units,
			    SUM(total_receipt_cost) AS total_receipt_cost,
			    SUM(total_receipt_units) AS total_receipt_units,
			    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
			    SUM(atp_fwos_units) AS atp_fwos_units
			FROM op_base_data
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,14,15,16,17,18,19,20,21--,22
			), op_agg as (select dept,
			    class,
			    channel,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    fiscal_year as year,
			    fiscal_month as month,
			    markdown_date,
			    launch_date,
			    exit_date,
			    op_aoh_units,
			    op_atp_units,
			    op_eop_cost,
			    op_eop_units,
--"No.sku",
			avg(store_count) as op_store_count, avg(w_air) as op_w_air, 
			avg(w_auc) as op_w_auc, avg(w_aur) as op_w_aur, avg(w_dr_perc) as op_w_dr_perc,
			nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
			nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
			nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
			--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
			nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
			sum(w_sls_dollars) as op_w_sls_dollars, avg(w_sls_ecom_perc) as op_w_sls_ecom_perc, 
			sum(w_sls_units) as op_w_sls_units, sum(w_gm_dollars) as op_w_gm_dollars, sum(post_md_written_sales) as op_post_md_written_sales, 
			sum(pre_md_written_sales) as op_pre_md_written_sales, sum(post_md_written_units) as op_post_md_written_units, sum(pre_md_written_units) as op_pre_md_written_units, 
			sum(d_sls_dollars) as op_d_sls_dollars, sum(d_sls_units) as op_d_sls_units, sum(d_gm) as op_d_gm, avg(d_aur) as op_d_aur,
			sum(aoh_fwos_units) as op_aoh_fwos_units, sum(atp_fwos_units) as op_atp_fwos_units,
			sum(total_receipt_cost) as op_total_receipt_cost, sum(total_receipt_units) as op_total_receipt_units, 
			sum(on_order_placed_total_unit) as op_oo_u_ttl_p
			from op_data
			group by 1,2,3,4,5,6,7,8, 9, 10, 11, 12, 13,14,15,16,17,18,19,20--,21
			), op as (select 
			dept,
			    class,
			    channel,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    year,
			    month,
			    markdown_date,
			    launch_date,
			    exit_date,
			    op_aoh_units,
			    op_atp_units,
--"No.sku",
			    op_eop_cost,
			    op_eop_units,
			op_store_count, w_air, w_auc, w_dr_perc,
			CASE 
			  WHEN channel = ''Ecom'' THEN 
			    op_w_sls_dollars / NULLIF(SUM(op_w_sls_dollars) OVER (PARTITION BY dept, year, month), 0)
			  ELSE 0
			END AS op_w_sls_ecom_perc,
			op_pre_md_written_sales, op_post_md_written_sales, op_pre_md_written_units, op_post_md_written_units,
			op_w_sls_dollars, op_w_gm_dollars,op_d_sls_dollars,op_d_sls_units,
			avg(op_w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_sls_dollars_3m_avg,
			avg(op_w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_sls_dollars_6m_avg,
			avg(op_w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_sls_dollars_9m_avg,
			op_w_sls_units,
			avg(op_w_sls_units) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_sls_units_3m_avg,
			avg(op_w_sls_units) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_sls_units_6m_avg,
			avg(op_w_sls_units) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_sls_units_9m_avg,
			op_w_aur,
			avg(op_w_aur) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as op_w_aur_3m_avg,
			avg(op_w_aur) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as op_w_aur_6m_avg,
			avg(op_w_aur) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as op_w_aur_9m_avg,
			op_d_gm, op_d_aur, op_aoh_fwos_units, op_atp_fwos_units, op_total_receipt_cost, 
			op_total_receipt_units, op_oo_u_ttl_p
			from op_agg), op_final as ( select dept,
			    class,
			    sku,
			    markdown_date,
			    op_eop_cost,
			    op_eop_units,
--"No.sku",
			    op_pre_md_written_sales, op_post_md_written_sales, op_pre_md_written_units, op_post_md_written_units,
			    avg(op.w_air) as op_w_air, 
			    avg(op.w_auc) as op_w_auc,
			    sum(op_w_sls_dollars) as op_w_sls_dollars,
			    avg(op_w_sls_ecom_perc) as op_w_sls_ecom_perc,
			    sum(op_w_sls_units) as op_w_sls_units,
			    avg(op_w_aur) as op_w_aur,
			    avg(op.w_dr_perc) as op_w_dr_perc, 
			    sum(op_w_gm_dollars) as op_w_gm_dollars,
			    sum(op_aoh_units) as op_aoh_units,
			    sum(op_aoh_fwos_units) as op_aoh_fwos_units,
			    sum(op_total_receipt_units) as op_total_receipt_units,
			    sum(op_oo_u_ttl_p) as op_oo_u_ttl_p,
			    sum(op_atp_units) as op_atp_units,
			    sum(op_atp_fwos_units) as op_atp_fwos_units,
			    sum(op_d_sls_dollars) as op_d_sls_dollars,
			    sum(op_d_sls_units) as op_d_sls_units,
			    avg(op_d_aur) as op_d_aur,
			    avg(op_d_gm) as op_d_gm
			    from op
			    group by 1,2,3,4,5,6,7,8,9,10 --,11
			), ly_base_data AS (
			    SELECT 
			        dpt_name as dept,
			        class_name as class,
			        channel,
			        product_code as sku,
			        product_description as sku_description,
			        collection_name AS collection,
			        lifestyle,
			        lm.hierarchy_code,
			        mv.vendor_name as vendor,
			        kit_status as hard_kit,
			        assortment_tier,
			        mv.purchase_status,
			        fiscal_year,
			        fiscal_month,
			        fiscal_week,
			        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
			        CASE WHEN is2.launch_date IS NULL THEN mv.launch_date ELSE is2.launch_date END AS launch_date,
			        CASE WHEN is2.exit_date IS NULL THEN mv.exit_date ELSE is2.exit_date END AS exit_date,
			        FIRST_VALUE(aoh_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_aoh_units,
			        FIRST_VALUE(atp_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_atp_units,
			        LAST_VALUE(eop_cost) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ) AS ly_eop_cost,
			        LAST_VALUE(eop_units) OVER (PARTITION BY lm.dept, channel, fiscal_year, fiscal_month ORDER BY fiscal_week ) AS ly_eop_units,
			        written_sales_dollars,
			        written_sales_units,
			        delivered_net_sales_units,
			        written_gm_dollar,
			        delivered_gm,
			        aoh_fwos_units,
			        total_receipt_cost,
			        total_receipt_units,
			        on_order_placed_total_unit,
			        atp_fwos_units,
  					/*		(
   							 SELECT SUM((value)::INT)
   							 FROM json_each_text(isku.tier_store_count::json)
  							) AS store_count,*/
			        lm.store_count,
			        written_air,
			        written_auc,
			        written_aur,
			        delivered_aur,
			        written_dr_perc
			    FROM item_smart.ly_master lm
			   -- left join (' || union_sql || ') isku on lm.hierarchy_code=isku.hierarchy_code and isku.current_week = lm.current_week
			    LEFT JOIN mv_product_hierarchies_filter_temp mv ON lm.dept = mv.l2_name AND lm.hierarchy_code = mv.hierarchy_code
			    LEFT JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = lm.current_week
			    LEFT JOIN itemfact_sku_temp is2 ON lm.hierarchy_code = is2.hierarchy_code AND lm.dept = is2.dept
			    left join item_smart.itemfact_assortment_tier_week iatw on iatw.current_week = lm.current_week
			    WHERE lm.dept IN ('||dept_name ||')  AND collection_name IN ('||coll_name ||') AND mv.vendor_name IN ('||ven_name ||')
				AND lm.current_week between '||sweek ||' and '||tweek ||' and channel<>''Warehouse''
				
			), ly_data as (SELECT
			    dept,
			    class,
			    channel,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    fiscal_year,
			    fiscal_month,
			    fiscal_week,
			    markdown_date,
			    launch_date,
			    exit_date,
			    ly_aoh_units,
			    ly_atp_units,
			    ly_eop_cost,
			    ly_eop_units,
			    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_dollars
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
			        ELSE 0 END) AS pre_md_written_sales,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_units
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
			        ELSE 0 END) AS pre_md_written_units,
			    AVG(store_count) AS store_count,
			    AVG(written_air) AS w_air,
			    AVG(written_auc) AS w_auc,
			    AVG(written_aur) AS w_aur,
			    AVG(delivered_aur) AS d_aur,
			    AVG(written_dr_perc) AS w_dr_perc,
			    SUM(written_sales_dollars) AS w_sls_dollars,
			    SUM(written_sales_units) AS w_sls_units,
			    SUM(delivered_net_sales_units) AS d_sls_dollars,
			    SUM(delivered_net_sales_units) AS d_sls_units,
			    SUM(written_gm_dollar) AS w_gm_dollars,
			    SUM(delivered_gm) AS d_gm,
			    SUM(aoh_fwos_units) AS aoh_fwos_units,
			    SUM(total_receipt_cost) AS total_receipt_cost,
			    SUM(total_receipt_units) AS total_receipt_units,
			    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
			    SUM(atp_fwos_units) AS atp_fwos_units
			FROM ly_base_data
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,14,15,16,17,18,19,20,21
			), ly_agg as (select dept,
			    class,
			    channel,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    fiscal_year as year,
			    fiscal_month as month,
			    markdown_date,
			    launch_date,
			    exit_date,
			    ly_aoh_units,
			    ly_atp_units,
			    ly_eop_cost,
			    ly_eop_units,
			avg(store_count) as store_count, avg(w_air) as w_air, 
			avg(w_auc) as w_auc, avg(w_aur) as w_aur, avg(w_dr_perc) as w_dr_perc,
			nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_air, 
			nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_auc,
			nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_aur,
			--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
			nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_dr_perc,
			sum(w_sls_dollars) as w_sls_dollars, avg(w_sls_ecom_perc) as w_sls_ecom_perc, 
			sum(w_sls_units) as w_sls_units, sum(w_gm_dollars) as w_gm_dollars, sum(post_md_written_sales) as post_md_written_sales, 
			sum(pre_md_written_sales) as pre_md_written_sales, sum(post_md_written_units) as post_md_written_units, sum(pre_md_written_units) as pre_md_written_units, 
			sum(d_sls_dollars) as d_sls_dollars, sum(d_sls_units) as d_sls_units, sum(d_gm) as d_gm, avg(d_aur) as d_aur,
			sum(aoh_fwos_units) as aoh_fwos_units, sum(atp_fwos_units) as atp_fwos_units,
			sum(total_receipt_cost) as total_receipt_cost, sum(total_receipt_units) as total_receipt_units, sum(on_order_placed_total_unit) as oo_u_ttl_p
			from ly_data
			group by 1,2,3,4,5,6,7,8, 9, 10, 11, 12, 13,14,15,16,17,18,19,20
			), ly as (select dept,
			    class,
			    channel,
			    sku,
			    sku_description,
			    collection,
			    lifestyle,
			    vendor,
			    hard_kit,
			    assortment_tier,
			    purchase_status,
			    year,
			    month,
			    markdown_date,
			    launch_date,
			    exit_date,
			store_count, ly_w_air, ly_w_auc, ly_w_dr_perc, 
			CASE 
			  WHEN channel = ''Ecom'' THEN 
			    w_sls_dollars / NULLIF(SUM(w_sls_dollars) OVER (PARTITION BY dept, year, month), 0)
			  ELSE 0
			END AS w_sls_ecom_perc,
			pre_md_written_sales, post_md_written_sales, pre_md_written_units, post_md_written_units,
			w_sls_dollars, w_gm_dollars, d_sls_dollars, d_sls_units,
			avg(w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_sls_dollars_3m_avg,
			avg(w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_sls_dollars_6m_avg,
			avg(w_sls_dollars) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_sls_dollars_9m_avg,
			w_sls_units,
			avg(w_sls_units) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_sls_units_3m_avg,
			avg(w_sls_units) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_sls_units_6m_avg,
			avg(w_sls_units) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_sls_units_9m_avg,
			ly_w_aur,
			avg(ly_w_aur) over 
			(partition by dept, channel, year order by month rows between 2 preceding and current row) as w_aur_3m_avg,
			avg(ly_w_aur) over 
			(partition by dept, channel, year order by month rows between 5 preceding and current row) as w_aur_6m_avg,
			avg(ly_w_aur) over 
			(partition by dept, channel, year order by month rows between 8 preceding and current row) as w_aur_9m_avg, 
			d_gm, d_aur, ly_aoh_units, aoh_fwos_units, ly_atp_units, atp_fwos_units,
			total_receipt_cost, total_receipt_units, oo_u_ttl_p, ly_eop_cost, ly_eop_units
			from ly_agg
			), ly_final as ( select dept,
			    class,
			    channel,
			    sku,
			    markdown_date,
			    ly_eop_cost, ly_eop_units,
			    pre_md_written_sales, post_md_written_sales, pre_md_written_units, post_md_written_units,
			    avg(ly_w_air) as ly_w_air, 
			    avg(ly_w_auc) as ly_w_auc,
			    sum(ly.w_sls_dollars) as ly_w_sls_dollars,
			    avg(ly.w_sls_ecom_perc) as ly_w_sls_ecom_perc,
			    sum(ly.w_sls_units) as ly_w_sls_units,
			    avg(ly_w_aur) as ly_w_aur,
			    avg(ly_w_dr_perc) as ly_w_dr_perc, 
			    sum(ly.w_gm_dollars) as ly_w_gm_dollars,
			    sum(ly_aoh_units) as ly_aoh_units,
			    sum(ly.aoh_fwos_units) as ly_aoh_fwos_units,
			    sum(ly.total_receipt_units) as ly_total_receipt_units,
			    sum(ly.oo_u_ttl_p) as ly_oo_u_ttl_p,
			    sum(ly_atp_units) as ly_atp_units,
			    sum(ly.atp_fwos_units) as ly_atp_fwos_units,
			    sum(ly.d_sls_dollars) as ly_d_sls_dollars,
			    sum(ly.d_sls_units) as ly_d_sls_units,
			    avg(ly.d_aur) as ly_d_aur,
			    avg(ly.d_gm) as ly_d_gm
			    from ly
			    group by 1,2,3,4,5,6,7,8,9,10,11
			), 
			final_report as (
			select dept,
			    wp.class,
			    wp.sku,
			    wp.sku_description,
			    wp.collection,
			    wp.lifestyle,
			    wp.vendor,
			    wp.hard_kit,
--"No.sku",
			    wp.assortment_tier,
			    wp.purchase_status,
			    wp.markdown_date,
			    wp.launch_date,
			    wp.exit_date,
			    ly.channel,
			   coalesce(CAST(wp_store_count AS INT),0) as wp_store_count,
			    COALESCE(wp.w_air , 0) AS wp_w_air,
			COALESCE(wp.w_auc , 0) AS wp_w_auc,
			COALESCE(no_of_months , 0) AS no_of_months,
			COALESCE(avg_monthly_sls_dollars , 0) AS avg_monthly_sls_dollars,
			COALESCE(wp_w_sls_dollars_3m_avg , 0) AS wp_w_sls_dollars_3m_avg,
			COALESCE(wp_w_sls_dollars_6m_avg , 0) AS wp_w_sls_dollars_6m_avg,
			COALESCE(wp_w_sls_dollars_9m_avg , 0) AS wp_w_sls_dollars_9m_avg,
			COALESCE(avg_monthly_sls_units , 0) AS avg_monthly_sls_units,
			COALESCE(wp_w_sls_units_3m_avg , 0) AS wp_w_sls_units_3m_avg,
			COALESCE(wp_w_sls_units_6m_avg , 0) AS wp_w_sls_units_6m_avg,
			COALESCE(wp_w_sls_units_9m_avg , 0) AS wp_w_sls_units_9m_avg,
			COALESCE(wp_w_sls_dollars , 0) AS wp_w_sls_dollars,
			COALESCE(wp_pre_md_written_sales , 0) AS wp_pre_md_written_sales,
			COALESCE(wp_post_md_written_sales , 0) AS wp_post_md_written_sales,
			COALESCE(wp_w_sls_ecom_perc , 0) AS wp_w_sls_ecom_perc,
			COALESCE(op_w_sls_dollars , 0) AS op_w_sls_dollars,
			COALESCE(op_pre_md_written_sales , 0) AS op_pre_md_written_sales,
			COALESCE(op_post_md_written_sales , 0) AS op_post_md_written_sales,
			COALESCE(op_w_sls_ecom_perc , 0) AS op_w_sls_ecom_perc,
			COALESCE((wp_w_sls_dollars - op_w_sls_dollars) , 0) AS w_sls_dollars_wp_op_var,
			COALESCE((wp_pre_md_written_sales - op_pre_md_written_sales) , 0) AS pre_md_w_sls_dollars_wp_op_var,
			COALESCE((wp_post_md_written_sales - op_post_md_written_sales) , 0) AS post_md_w_sls_dollars_wp_op_var,
			COALESCE((wp_w_sls_dollars - op_w_sls_dollars) / NULLIF(op_w_sls_dollars, 0) , 0) AS w_sls_dollars_wp_op_var_perc,
			COALESCE((wp_pre_md_written_sales - op_pre_md_written_sales) / NULLIF(op_pre_md_written_sales, 0) , 0) AS pre_md_w_sls_dollars_wp_op_var_perc,
			COALESCE((wp_post_md_written_sales - op_post_md_written_sales) / NULLIF(op_post_md_written_sales, 0) , 0) AS post_md_w_sls_dollars_wp_op_var_perc,
			COALESCE(ly_w_sls_dollars , 0) AS ly_w_sls_dollars,
			COALESCE(ly.pre_md_written_sales , 0) AS ly_pre_md_written_sales,
			COALESCE(ly.post_md_written_sales , 0) AS ly_post_md_written_sales,
			COALESCE(ly_w_sls_ecom_perc , 0) AS ly_w_sls_ecom_perc,
			COALESCE((wp_w_sls_dollars - ly_w_sls_dollars) , 0) AS w_sls_dollars_wp_ly_var,
			COALESCE((wp_pre_md_written_sales - ly.pre_md_written_sales) , 0) AS pre_md_w_sls_dollars_wp_ly_var,
			COALESCE((wp_post_md_written_sales - ly.post_md_written_sales) , 0) AS post_md_w_sls_dollars_wp_ly_var,
			COALESCE((wp_w_sls_dollars - ly_w_sls_dollars) / NULLIF(ly_w_sls_dollars, 0) , 0) AS w_sls_dollars_wp_ly_var_perc,
			COALESCE((wp_pre_md_written_sales - ly.pre_md_written_sales) / NULLIF(ly.pre_md_written_sales, 0) , 0) AS pre_md_w_sls_dollars_wp_ly_var_perc,
			COALESCE((wp_post_md_written_sales - ly.post_md_written_sales) / NULLIF(ly.post_md_written_sales, 0) , 0) AS post_md_w_sls_dollars_wp_ly_var_perc,
			COALESCE(wp_w_sls_units , 0) AS wp_w_sls_units,
			COALESCE(wp_pre_md_written_units , 0) AS wp_pre_md_written_units,
			COALESCE(wp_post_md_written_units , 0) AS wp_post_md_written_units,
			COALESCE(op_w_sls_units , 0) AS op_w_sls_units,
			COALESCE(op_pre_md_written_units , 0) AS op_pre_md_written_units,
			COALESCE(op_post_md_written_units , 0) AS op_post_md_written_units,
			COALESCE((wp_w_sls_units - op_w_sls_units) , 0) AS w_sls_units_wp_op_var,
			COALESCE((wp_pre_md_written_units - op_pre_md_written_units) , 0) AS pre_md_w_sls_units_wp_op_var,
			COALESCE((wp_post_md_written_units - op_post_md_written_units) , 0) AS post_md_w_sls_units_wp_op_var,
			COALESCE((wp_w_sls_units - op_w_sls_units) / NULLIF(op_w_sls_units, 0) , 0) AS w_sls_units_wp_op_var_perc,
			COALESCE((wp_pre_md_written_units - op_pre_md_written_units) / NULLIF(op_pre_md_written_units, 0) , 0) AS pre_md_w_sls_units_wp_op_var_perc,
			COALESCE((wp_post_md_written_units - op_post_md_written_units) / NULLIF(op_post_md_written_units, 0) , 0) AS post_md_w_sls_units_wp_op_var_perc,
			COALESCE(ly_w_sls_units , 0) AS ly_w_sls_units,
			coalesce(ly.pre_md_written_units , 0) AS ly_pre_md_written_units,
			coalesce(ly.post_md_written_units , 0) AS ly_post_md_written_units,
			COALESCE((wp_w_sls_units - ly_w_sls_units) , 0) AS w_sls_units_wp_ly_var,
			COALESCE((wp_pre_md_written_units - ly.pre_md_written_units) , 0) AS pre_md_w_sls_units_wp_ly_var,
			COALESCE((wp_post_md_written_units - ly.post_md_written_units) , 0) AS post_md_w_sls_units_wp_ly_var,
			COALESCE((wp_w_sls_units - ly_w_sls_dollars) / NULLIF(ly_w_sls_units, 0) , 0) AS w_sls_units_wp_ly_var_perc,
			COALESCE((wp_pre_md_written_units - ly.pre_md_written_units) / NULLIF(ly.pre_md_written_units, 0) , 0) AS pre_md_w_sls_units_wp_ly_var_perc,
			COALESCE((wp_post_md_written_units - ly.post_md_written_units) / NULLIF(ly.post_md_written_units, 0) , 0) AS post_md_w_sls_units_wp_ly_var_perc,
			COALESCE(wp_w_aur , 0) AS w_aur,
			COALESCE(wp_w_aur_3m_avg , 0) AS wp_w_aur_3m_avg,
			COALESCE(wp_w_aur_6m_avg , 0) AS wp_w_aur_6m_avg,
			COALESCE(wp_w_aur_9m_avg , 0) AS wp_w_aur_9m_avg,
			COALESCE(op_w_aur , 0) AS op_w_aur,
			COALESCE(ly_w_aur , 0) AS ly_w_aur,
			COALESCE(wp_w_dr_perc , 0) AS wp_w_dr_perc,
			COALESCE(op_w_dr_perc , 0) AS op_w_dr_perc,
			COALESCE(ly_w_dr_perc , 0) AS ly_w_dr_perc,
			COALESCE(wp_w_gm_dollars , 0) AS wp_w_gm_dollars,
			COALESCE(NULLIF(wp_w_gm_dollars, 0) / NULLIF(wp_w_sls_dollars, 0) , 0) AS wp_w_gm_perc,
			COALESCE(op_w_gm_dollars , 0) AS op_w_gm_dollars,
			COALESCE(NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0) , 0) AS op_w_gm_perc,
			COALESCE((wp_w_gm_dollars - op_w_gm_dollars) , 0) AS w_gm_dollars_wp_op_var,
			COALESCE(((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)))/(NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)) , 0) AS w_gm_perc_wp_op_var,
			COALESCE((wp_w_gm_dollars - op_w_gm_dollars) / NULLIF(op_w_gm_dollars, 0) , 0) AS w_gm_dollars_wp_op_var_perc,
			COALESCE(ly_w_gm_dollars , 0) AS ly_w_gm_dollars,
			coalesce(NULLIF(ly_w_gm_dollars, 0) / NULLIF(ly_w_sls_dollars, 0) , 0) AS ly_w_gm_perc,
			COALESCE((wp_w_gm_dollars - ly_w_gm_dollars), 0) AS w_gm_dollars_wp_ly_var,
			COALESCE(((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(ly_w_gm_dollars, 0) / NULLIF(ly_w_sls_dollars, 0)))/(NULLIF(ly_w_gm_dollars, 0) / NULLIF(ly_w_sls_dollars, 0)) , 0) AS w_gm_perc_wp_ly_var,
			COALESCE((wp_w_gm_dollars - ly_w_gm_dollars) / NULLIF(ly_w_gm_dollars, 0) , 0) AS w_gm_dollars_wp_ly_var_perc,
			COALESCE(wp_aoh_units , 0) AS wp_aoh_units,
			COALESCE(wp_aoh_fwos_units , 0) AS wp_aoh_fwos_units,
			COALESCE(op_aoh_units , 0) AS op_aoh_units,
			COALESCE(op_aoh_fwos_units , 0) AS op_aoh_fwos_units,
			COALESCE(ly_aoh_units , 0) AS ly_aoh_units,
			COALESCE(ly_aoh_fwos_units , 0) AS ly_aoh_fwos_units,
			COALESCE(wp_total_receipt_units , 0) AS wp_total_receipt_units ,
			COALESCE(op_total_receipt_units , 0) AS op_total_receipt_units,
			COALESCE((wp_total_receipt_units - op_total_receipt_units) , 0) AS total_receipt_units_wp_op_var,
			COALESCE((wp_total_receipt_units - op_total_receipt_units) / NULLIF(op_total_receipt_units, 0) , 0) AS total_receipt_units_wp_op_var_perc,
			COALESCE(ly_total_receipt_units , 0) AS ly_total_receipt_units,
			COALESCE((wp_total_receipt_units - ly_total_receipt_units) , 0) AS total_receipt_units_wp_ly_var,
			COALESCE((wp_total_receipt_units - ly_total_receipt_units) / NULLIF(ly_total_receipt_units, 0) , 0) AS total_receipt_units_wp_ly_var_perc,
			COALESCE(wp_oo_u_ttl_p , 0) AS wp_oo_u_ttl_p,
			COALESCE(op_oo_u_ttl_p , 0) AS op_oo_u_ttl_p,
			COALESCE((wp_oo_u_ttl_p - op_oo_u_ttl_p) , 0) AS oo_u_ttl_p_wp_op_var,
			COALESCE((wp_oo_u_ttl_p - op_oo_u_ttl_p)/NULLIF(op_oo_u_ttl_p, 0) , 0) AS oo_u_ttl_p_wp_op_var_perc,
			COALESCE(ly_oo_u_ttl_p , 0) AS ly_oo_u_ttl_p,
			COALESCE((wp_oo_u_ttl_p - ly_oo_u_ttl_p) , 0) AS oo_u_ttl_p_wp_ly_var,
			COALESCE((wp_oo_u_ttl_p - ly_oo_u_ttl_p)/NULLIF(ly_oo_u_ttl_p, 0) , 0) AS oo_u_ttl_p_wp_ly_var_perc,
			COALESCE(wp_atp_units , 0) AS wp_atp_units,
			COALESCE(wp_atp_fwos_units , 0) AS wp_atp_fwos_units,
			COALESCE(op_atp_units , 0) AS op_atp_units,
			COALESCE(op_atp_fwos_units , 0) AS op_atp_fwos_units,
			COALESCE(ly_atp_units , 0) AS ly_atp_units,
			COALESCE(ly_atp_fwos_units , 0) AS ly_atp_fwos_units,
			COALESCE(wp_d_sls_dollars , 0) AS wp_d_sls_dollars,
			COALESCE(op_d_sls_dollars , 0) AS op_d_sls_dollars,
			COALESCE((wp_d_sls_dollars - op_d_sls_dollars) , 0) AS d_sls_dollars_wp_op_var,
			COALESCE((wp_d_sls_dollars - op_d_sls_dollars)/NULLIF(op_d_sls_dollars, 0) , 0) AS d_sls_dollars_wp_op_var_perc,
			COALESCE(ly_d_sls_dollars , 0) AS ly_d_sls_dollars,
			COALESCE((wp_d_sls_dollars - ly_d_sls_dollars) , 0) AS d_sls_dollars_wp_ly_var,
			COALESCE((wp_d_sls_dollars - ly_d_sls_dollars)/NULLIF(ly_d_sls_dollars, 0) , 0) AS d_sls_dollars_wp_ly_var_perc,
			COALESCE(wp_d_sls_units , 0) AS wp_d_sls_units,
			COALESCE(op_d_sls_units , 0) AS op_d_sls_units,
			COALESCE((wp_d_sls_units - op_d_sls_units) , 0) AS d_sls_units_wp_op_var,
			COALESCE((wp_d_sls_units - op_d_sls_units)/NULLIF(op_d_sls_units, 0) , 0) AS d_sls_units_wp_op_var_perc,
			COALESCE(ly_d_sls_units , 0) AS ly_d_sls_units,
			COALESCE((wp_d_sls_units - ly_d_sls_units) , 0) AS d_sls_units_wp_ly_var,
			COALESCE((wp_d_sls_units - ly_d_sls_units)/NULLIF(ly_d_sls_units, 0) , 0) AS d_sls_units_wp_ly_var_perc,
			COALESCE(wp_d_aur , 0) AS wp_d_aur,
			COALESCE(op_d_aur , 0) AS op_d_aur,
			COALESCE(ly_d_aur , 0) AS ly_d_aur,
			COALESCE(wp_d_gm , 0) AS wp_d_gm,
			COALESCE(NULLIF(wp_d_gm, 0) / NULLIF(wp_d_sls_dollars, 0) , 0) AS wp_d_gm_perc,
			COALESCE(op_d_gm , 0) AS op_d_gm,
			COALESCE(NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0) , 0) AS op_d_gm_perc,
			COALESCE((wp_d_gm - op_d_gm) , 0) AS d_gm_wp_op_var,
			COALESCE(((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)))/(NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)) , 0) AS d_gm_perc_wp_op_var,
			COALESCE((wp_d_gm - op_d_gm) / NULLIF(op_d_gm, 0) , 0) AS d_gm_wp_op_var_perc,
			COALESCE(ly_d_gm , 0) AS ly_d_gm,
			coalesce(NULLIF(ly_d_gm, 0) / NULLIF(ly_w_sls_dollars, 0) , 0) AS ly_d_gm_perc,
			COALESCE((wp_d_gm - ly_d_gm) , 0) AS d_gm_wp_ly_var,
			COALESCE(((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(ly_d_gm, 0) / NULLIF(ly_d_sls_dollars, 0)))/(NULLIF(ly_d_gm, 0) / NULLIF(ly_d_sls_dollars, 0)) , 0) AS d_gm_perc_wp_ly_var,
			COALESCE((wp_d_gm - ly_d_gm) / NULLIF(ly_d_gm, 0) , 0) AS d_gm_wp_ly_var_perc,
			COALESCE(wp_eop_cost , 0) AS wp_eop_cost,
			COALESCE(op_eop_cost , 0) AS op_eop_cost,
			COALESCE((wp_eop_cost - op_eop_cost) , 0) AS eop_cost_wp_op_var,
			COALESCE((wp_eop_cost - op_eop_cost) / NULLIF(op_eop_cost, 0) , 0) AS eop_cost_wp_op_var_perc,
			COALESCE(ly_eop_cost , 0) AS ly_eop_cost,
			COALESCE((wp_eop_cost - ly_eop_cost) , 0) AS eop_cost_wp_ly_var,
			COALESCE((wp_eop_cost - ly_eop_cost) / NULLIF(ly_eop_cost, 0) , 0) AS eop_cost_wp_ly_var_perc,
			COALESCE(wp_eop_units , 0) AS wp_eop_units,
			COALESCE(op_eop_units , 0) AS op_eop_units,
			COALESCE((wp_eop_units - op_eop_units) , 0) AS eop_units_wp_op_var,
			COALESCE((wp_eop_units - op_eop_units) / NULLIF(op_eop_units, 0) , 0) AS eop_units_wp_op_var_perc,
			COALESCE(ly_eop_units , 0) AS ly_eop_units,
			COALESCE((wp_eop_units - ly_eop_units) , 0) AS eop_units_wp_ly_var,
			COALESCE((wp_eop_units - ly_eop_units) / NULLIF(ly_eop_units, 0) , 0) AS eop_units_wp_ly_var_perc
			    from wp_final wp
			    left join op_final op using (dept, sku)
			    left join ly_final ly using (dept, sku)
			) 
			Select 
				dept as "Dept",
-- Channel as "Channel",
class as "Class",
sku as "SKU",
sku_description as "SKU Description",
--"No.sku",
collection as "Collection",
lifestyle as "Lifestyle",
vendor as "Vendor",
hard_kit as "Hard Kit (Y/N)",
assortment_tier as "Assortment Tier",
COALESCE(wp_store_count, 0) as "Store Count",
purchase_status as "Purchase Status",
launch_date as "Launch Date",
markdown_date as "Initial MD Date",
exit_date as "Exit Date",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_air, 0)::NUMERIC, 2), ''FM999999990.00'')) as "AIR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_auc, 0)::NUMERIC, 2), ''FM999999990.00'')) as "AUC",
COALESCE(no_of_months, 0) as "WP # of Months w/Sls",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(avg_monthly_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Avg Monthly W Sls$",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_3m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "3 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_6m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "6 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_9m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "9 mo Avg Month W Sls $",
ROUND(COALESCE(avg_monthly_sls_units, 0)::NUMERIC, 2) as "WP Avg Monthly W U Sls",
ROUND(COALESCE(wp_w_sls_units_3m_avg, 0)::NUMERIC, 2) as "3 mo Avg Month W Sls U",
ROUND(COALESCE(wp_w_sls_units_6m_avg, 0)::NUMERIC, 2) as "6 mo Avg Month W Sls U",
ROUND(COALESCE(wp_w_sls_units_9m_avg, 0)::NUMERIC, 2) as "9 mo Avg Month W Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $",
--	wp_pre_md_written_sales as "WP W Sls $ - PreMD",
--	wp_post_md_written_sales as "WP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W Sls $",
--	op_pre_md_written_sales as "OP W Sls $ - PreMD",
--	op_post_md_written_sales as "OP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ Var to OP",
--	pre_md_w_sls_dollars_wp_op_var as "WP W Sls $ - PreMD Var to OP",
--	post_md_w_sls_dollars_wp_op_var as "WP W Sls $ - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ % Var  to OP",
--	pre_md_w_sls_dollars_wp_op_var_perc as "WP W Sls $ - PreMD % Var  to OP",
--	post_md_w_sls_dollars_wp_op_var_perc as "WP W Sls $ - PostMD % Var  to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W Sls $",
--	ly_pre_md_written_sales as "LY W Sls $ - PreMD",
--	ly_post_md_written_sales as "LY W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ Var to LY",
--	pre_md_w_sls_dollars_wp_ly_var as "WP W Sls $ - PreMD Var to LY",
--	post_md_w_sls_dollars_wp_ly_var as "WP W Sls $ - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ % Var to LY",
--	pre_md_w_sls_dollars_wp_ly_var_perc as "WP W Sls $ - PreMD % Var to LY",
--	post_md_w_sls_dollars_wp_ly_var_perc as "WP W Sls $ - PostMD % Var to LY",
ROUND(COALESCE(wp_w_sls_units, 0)::NUMERIC, 2) as "WP W Sls U",
--	wp_pre_md_written_units as "WP W Sls U - PreMD",
--	wp_post_md_written_units as "WP W Sls U - PostMD",
ROUND(COALESCE(op_w_sls_units, 0)::NUMERIC, 2) as "OP W Sls U",
--	op_pre_md_written_units as "OP W Sls U - PreMD",
--	op_post_md_written_units as "OP W Sls U - PostMD",
ROUND(COALESCE(w_sls_units_wp_op_var, 0)::NUMERIC, 2) as "WP W Sls U Var to OP",
--	pre_md_w_sls_units_wp_op_var as "WP W Sls U - PreMD Var to OP",
--	post_md_w_sls_units_wp_op_var as "WP W Sls U - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U % Var to OP",
--	pre_md_w_sls_units_wp_op_var_perc as "WP W Sls U - PreMD % Var to OP",
--	post_md_w_sls_units_wp_op_var_perc as "WP W Sls U - PostMD % Var to OP",
ROUND(COALESCE(ly_w_sls_units, 0)::NUMERIC, 2) as "LY W Sls U",
--	ly_pre_md_written_units as "LY W Sls U - PreMD",
--	ly_post_md_written_units as "LY W Sls U - PostMD",
ROUND(COALESCE(w_sls_units_wp_ly_var, 0)::NUMERIC, 2) as "WP W Sls U Var to LY",
--	pre_md_w_sls_units_wp_ly_var as "WP W Sls U - PreMD Var to LY",
--	post_md_w_sls_units_wp_ly_var as "WP W Sls U - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U % Var to LY",
--	pre_md_w_sls_units_wp_ly_var_perc as "WP W Sls U - PreMD % Var to LY",
--	post_md_w_sls_units_wp_ly_var_perc as "WP W Sls U - PostMD % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_3m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "3 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_6m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "6 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_9m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "9 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W AUR",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY W DR%",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_perc_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_perc_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM $ % Var to LY",
ROUND(COALESCE(wp_aoh_units, 0)::NUMERIC, 2) as "WP AOH U",
ROUND(COALESCE(wp_aoh_fwos_units, 0)::NUMERIC, 2) as "WP AOH FWOS U",
ROUND(COALESCE(op_aoh_units, 0)::NUMERIC, 2) as "OP AOH U",
ROUND(COALESCE(op_aoh_fwos_units, 0)::NUMERIC, 2) as "OP AOH FWOS U",
ROUND(COALESCE(ly_aoh_units, 0)::NUMERIC, 2) as "LY AOH U",
ROUND(COALESCE(ly_aoh_fwos_units, 0)::NUMERIC, 2) as "LY AOH FWOS U",
ROUND(COALESCE(wp_total_receipt_units, 0)::NUMERIC, 2) as "WP Ttl Rcpt U",
ROUND(COALESCE(op_total_receipt_units, 0)::NUMERIC, 2) as "OP Ttl Rcpt U",
ROUND(COALESCE(total_receipt_units_wp_op_var, 0)::NUMERIC, 2) as "WP Ttl Rcpt U Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(total_receipt_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP Ttl Rcpt U % Var to OP",
ROUND(COALESCE(ly_total_receipt_units, 0)::NUMERIC, 2) as "LY Ttl Rcpt U",
ROUND(COALESCE(total_receipt_units_wp_ly_var, 0)::NUMERIC, 2) as "WP Ttl Rcpt U Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(total_receipt_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP Ttl Rcpt U % Var to LY",
ROUND(COALESCE(wp_oo_u_ttl_p, 0)::NUMERIC, 2) as "WP OO U (TTL-P)",
ROUND(COALESCE(op_oo_u_ttl_p, 0)::NUMERIC, 2) as "OP OO U (TTL-P)",
ROUND(COALESCE(oo_u_ttl_p_wp_op_var, 0)::NUMERIC, 2) as "WP OO U (TTL-P) Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(oo_u_ttl_p_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP OO U (TTL-P) % Var to OP",
ROUND(COALESCE(ly_oo_u_ttl_p, 0)::NUMERIC, 2) as "LY OO U (TTL-P)",
ROUND(COALESCE(oo_u_ttl_p_wp_ly_var, 0)::NUMERIC, 2) as "WP OO U (TTL-P) Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(oo_u_ttl_p_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP OO U (TTL-P) % Var to LY",
ROUND(COALESCE(wp_atp_units, 0)::NUMERIC, 2) as "WP ATP U",
ROUND(COALESCE(wp_atp_fwos_units, 0)::NUMERIC, 2) as "WP ATP FWOS U",
ROUND(COALESCE(op_atp_units, 0)::NUMERIC, 2) as "OP ATP U",
ROUND(COALESCE(op_atp_fwos_units, 0)::NUMERIC, 2) as "OP ATP FWOS U",
ROUND(COALESCE(ly_atp_units, 0)::NUMERIC, 2) as "LY ATP U",
ROUND(COALESCE(ly_atp_fwos_units, 0)::NUMERIC, 2) as "LY ATP FWOS U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to OP D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to LY D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY D Sls $",
ROUND(COALESCE(wp_d_sls_units, 0)::NUMERIC, 2) as "WP D Sls U",
ROUND(COALESCE(op_d_sls_units, 0)::NUMERIC, 2) as "OP D Sls U",
ROUND(COALESCE(d_sls_units_wp_op_var, 0)::NUMERIC, 2) as "WP Var to OP D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP D Sls U",
ROUND(COALESCE(ly_d_sls_units, 0)::NUMERIC, 2) as "LY D Sls U",
ROUND(COALESCE(d_sls_units_wp_ly_var, 0)::NUMERIC, 2) as "WP Var to LY D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY D Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(op_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_gm_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_perc_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_gm_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_perc_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM $ % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(eop_cost_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to OP EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_cost_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(eop_cost_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to LY EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_cost_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY EOP $",
ROUND(COALESCE(wp_eop_units, 0)::NUMERIC, 2) as "WP EOP U",
ROUND(COALESCE(op_eop_units, 0)::NUMERIC, 2) as "OP EOP U",
ROUND(COALESCE(eop_units_wp_op_var, 0)::NUMERIC, 2) as "WP Var to OP EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP EOP U",
ROUND(COALESCE(ly_eop_units, 0)::NUMERIC, 2) as "LY EOP U",
ROUND(COALESCE(eop_units_wp_ly_var, 0)::NUMERIC, 2) as "WP Var to LY EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY EOP U"

			from final_report where channel<>''Warehouse'';';
			
		ELSE
		
			_query_combine := '
			WITH wp_base_data AS (
			    SELECT 
			        mv.'||col_name ||' AS '||report_type ||',
			        channel,
			        wm.hierarchy_code,
			        fiscal_year,
			        fiscal_month,
			        fiscal_week,
			        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
			        FIRST_VALUE(aoh_units) OVER (PARTITION BY mv.'||col_name ||', channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_aoh_units,
			        FIRST_VALUE(atp_units) OVER (PARTITION BY mv.'||col_name ||', channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS wp_atp_units,
			        LAST_VALUE(eop_cost) OVER (PARTITION BY mv.'||col_name ||', channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_cost,
			        LAST_VALUE(eop_units) OVER (PARTITION BY mv.'||col_name ||', channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS wp_eop_units,
			        written_sales_dollars,
			        written_sales_units,
			        delivered_net_sales_units,
			        written_gm_dollar,
			        delivered_gm,
			        aoh_fwos_units,
			        total_receipt_cost,
			        total_receipt_units,
			        on_order_placed_total_unit,
			        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                  CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
			      --  wm.store_count,
			        written_air,
			        written_auc,
			        written_aur,
			        delivered_aur,
			        written_dr_perc
					--SELECT *
			    FROM (' || wp_union_sql || ') wm 
			    left join (' || union_sql || ') isku on wm.hierarchy_code=isku.hierarchy_code and isku.current_week = wm.current_week
			    LEFT JOIN mv_product_hierarchies_filter_temp mv ON wm.hierarchy_code = mv.hierarchy_code
			    left JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = wm.current_week
			    LEFT JOIN itemfact_sku_temp is2 ON wm.hierarchy_code = is2.hierarchy_code
			    left join item_smart.itemfact_assortment_tier_week iatw on iatw.current_week = wm.current_week
			    WHERE '|| case when report_type = 'class' then 
						' wm.dept IN ('||dept_name ||')  AND l3_name IN ('||coll_name ||') AND mv.vendor_name IN ('||ven_name ||')'
				else	' wm.dept IN ('||dept_name ||')  AND collection_name IN ('||coll_name ||') AND mv.vendor_name IN ('||ven_name ||')' end ||'
				AND wm.current_week between '||sweek ||' and '||tweek ||' and channel<>''Warehouse''
			
			), wp_data as (SELECT
			    '||report_type ||',
			    channel,
			    hierarchy_code,
			    fiscal_year,
			    fiscal_month,
			    fiscal_week,
			    markdown_date,
			    wp_aoh_units,
			    wp_atp_units,
			    wp_eop_cost,
			    wp_eop_units,
			    COUNT(DISTINCT (fiscal_year, fiscal_month)) AS no_of_months,
			    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_dollars
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
			        ELSE 0 END) AS pre_md_written_sales,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_units
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
			        ELSE 0 END) AS pre_md_written_units,
			    AVG(store_count) AS store_count,
			    AVG(written_air) AS w_air,
			    AVG(written_auc) AS w_auc,
			    AVG(written_aur) AS w_aur,
			    AVG(delivered_aur) AS d_aur,
			    AVG(written_dr_perc) AS w_dr_perc,
			    SUM(written_sales_dollars) AS w_sls_dollars,
			    SUM(written_sales_units) AS w_sls_units,
			    SUM(delivered_net_sales_units) AS d_sls_dollars,
			    SUM(delivered_net_sales_units) AS d_sls_units,
			    SUM(written_gm_dollar) AS w_gm_dollars,
			    SUM(delivered_gm) AS d_gm,
			    SUM(aoh_fwos_units) AS aoh_fwos_units,
			    SUM(total_receipt_cost) AS total_receipt_cost,
			    SUM(total_receipt_units) AS total_receipt_units,
			    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
			    SUM(atp_fwos_units) AS atp_fwos_units
			FROM wp_base_data
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
			), wp_agg as (select '||report_type ||', channel, fiscal_year as year, fiscal_month as month, no_of_months,
			wp_aoh_units, wp_atp_units, wp_eop_cost, wp_eop_units,
			avg(store_count) as wp_store_count, count(distinct hierarchy_code) as wp_sku_count, avg(w_air) as wp_w_air, 
			avg(w_auc) as wp_w_auc, avg(w_aur) as wp_w_aur, avg(w_dr_perc) as wp_w_dr_perc,
			nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
			nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
			nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
			nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_sls_units),0) as d_aur,
			nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
			sum(w_sls_dollars) as wp_w_sls_dollars, avg(w_sls_ecom_perc) as wp_w_sls_ecom_perc, 
			sum(w_sls_units) as wp_w_sls_units, sum(w_gm_dollars) as wp_w_gm_dollars, sum(post_md_written_sales) as wp_post_md_written_sales, 
			sum(pre_md_written_sales) as wp_pre_md_written_sales, sum(post_md_written_units) as wp_post_md_written_units, sum(pre_md_written_units) as wp_pre_md_written_units, 
			sum(d_sls_dollars) as wp_d_sls_dollars, sum(d_sls_units) as wp_d_sls_units, sum(d_gm) as wp_d_gm, avg(d_aur) as wp_d_aur,
			sum(aoh_fwos_units) as wp_aoh_fwos_units, sum(total_receipt_cost) as wp_total_receipt_cost, 
			sum(total_receipt_units) as wp_total_receipt_units, sum(atp_fwos_units) as wp_atp_fwos_units,
			sum(on_order_placed_total_unit) as wp_oo_u_ttl_p
			from wp_data
			group by 1,2,3,4,5,6,7,8,9), wp as (select '||report_type ||', channel, year, month, wp_store_count, wp_sku_count, w_air, w_auc, w_dr_perc,
			CASE 
			  WHEN channel = ''Ecom'' THEN 
			    wp_w_sls_dollars / NULLIF(wp_w_sls_dollars, 0)
			  ELSE 0
			END AS wp_w_sls_ecom_perc,
			wp_pre_md_written_sales, wp_post_md_written_sales, wp_pre_md_written_units, wp_post_md_written_units,
			wp_w_sls_dollars, wp_w_gm_dollars, wp_d_sls_dollars, wp_d_sls_units,no_of_months,
			avg(wp_w_sls_dollars) over
			(partition by '||report_type ||', channel) as avg_monthly_sls_dollars,
			avg(wp_w_sls_dollars) over 
			(partition by '||report_type ||', channel, year order by month rows between 2 preceding and current row) as wp_w_sls_dollars_3m_avg,
			avg(wp_w_sls_dollars) over 
			(partition by '||report_type ||', channel, year order by month rows between 5 preceding and current row) as wp_w_sls_dollars_6m_avg,
			avg(wp_w_sls_dollars) over 
			(partition by '||report_type ||', channel, year order by month rows between 8 preceding and current row) as wp_w_sls_dollars_9m_avg,
			wp_w_sls_units,
			avg(wp_w_sls_units) over
			(partition by '||report_type ||', channel) as avg_monthly_sls_units,
			avg(wp_w_sls_units) over 
			(partition by '||report_type ||', channel, year order by month rows between 2 preceding and current row) as wp_w_sls_units_3m_avg,
			avg(wp_w_sls_units) over 
			(partition by '||report_type ||', channel, year order by month rows between 5 preceding and current row) as wp_w_sls_units_6m_avg,
			avg(wp_w_sls_units) over 
			(partition by '||report_type ||', channel, year order by month rows between 8 preceding and current row) as wp_w_sls_units_9m_avg,
			w_aur,
			avg(wp_w_aur) over 
			(partition by '||report_type ||', channel, year order by month rows between 2 preceding and current row) as wp_w_aur_3m_avg,
			avg(wp_w_aur) over 
			(partition by '||report_type ||', channel, year order by month rows between 5 preceding and current row) as wp_w_aur_6m_avg,
			avg(wp_w_aur) over 
			(partition by '||report_type ||', channel, year order by month rows between 8 preceding and current row) as wp_w_aur_9m_avg,
			wp_d_gm, d_aur, wp_aoh_units, wp_aoh_fwos_units, wp_atp_units, wp_atp_fwos_units,
			wp_total_receipt_cost, wp_total_receipt_units, wp_eop_cost, wp_eop_units, wp_oo_u_ttl_p
			from wp_agg), wp_final as ( select '||report_type ||', channel, year, month, avg(CAST(wp_sku_count AS INT)) as wp_sku_count, w_dr_perc,
			    avg(CAST(wp_store_count AS INT)) as wp_store_count,
			    avg(w_air) as wp_w_air, 
			    avg(w_auc) as wp_w_auc, 
			    avg_monthly_sls_dollars,
			    wp_w_sls_dollars_3m_avg,
			    wp_w_sls_dollars_6m_avg,
			    wp_w_sls_dollars_9m_avg,
			    avg_monthly_sls_units,
			    wp_w_sls_units_3m_avg,
			    wp_w_sls_units_6m_avg,
			    wp_w_sls_units_9m_avg,
			    wp_w_aur_3m_avg,
			    wp_w_aur_6m_avg,
			    wp_w_aur_9m_avg,
			    wp_eop_cost,
			    wp_eop_units,
			    wp_pre_md_written_sales, wp_post_md_written_sales, wp_pre_md_written_units, wp_post_md_written_units,
			    wp.no_of_months,
			    sum(wp_w_sls_dollars) as wp_w_sls_dollars,
			    avg(wp_w_sls_ecom_perc) as wp_w_sls_ecom_perc,
			    sum(wp_w_sls_units) as wp_w_sls_units,
			    avg(wp.w_aur) as wp_w_aur,
			    avg(wp.w_dr_perc) as wp_w_dr_perc, 
			    sum(wp_w_gm_dollars) as wp_w_gm_dollars,
			    sum(wp_aoh_units) as wp_aoh_units,
			    sum(wp_aoh_fwos_units) as wp_aoh_fwos_units,
			    sum(wp_total_receipt_units) as wp_total_receipt_units,
			    sum(wp_oo_u_ttl_p) as wp_oo_u_ttl_p,
			    sum(wp_atp_units) as wp_atp_units,
			    sum(wp_atp_fwos_units) as wp_atp_fwos_units,
			    sum(wp_d_sls_dollars) as wp_d_sls_dollars,
			    sum(wp_d_sls_units) as wp_d_sls_units,
			    avg(wp.d_aur) as wp_d_aur,
			    avg(wp_d_gm) as wp_d_gm
			    from wp
			    group by 1,2,3,4,6,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27
			), op_base_data AS (
			    SELECT 
			        mv.'||col_name ||' AS '||report_type ||',
			        channel,
			        om.hierarchy_code,
			        fiscal_year,
			        fiscal_month,
			        fiscal_week,
			        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
			        FIRST_VALUE(aoh_units) OVER (PARTITION BY mv.'||col_name ||', channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_aoh_units,
			        FIRST_VALUE(atp_units) OVER (PARTITION BY mv.'||col_name ||', channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS op_atp_units,
			        LAST_VALUE(eop_cost) OVER (PARTITION BY mv.'||col_name ||', channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_cost,
			        LAST_VALUE(eop_units) OVER (PARTITION BY mv.'||col_name ||', channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS op_eop_units,
			        written_sales_dollars,
			        written_sales_units,
			        delivered_net_sales_units,
			        written_gm_dollar,
			        delivered_gm,
			        aoh_fwos_units,
			        total_receipt_cost,
			        total_receipt_units,
			        on_order_placed_total_unit,
			        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                   CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
			       -- store_count,
			        written_air,
			        written_auc,
			        written_aur,
			        delivered_aur,
			        written_dr_perc
			    FROM (' || op_union_sql || ') om
			    left join (' || union_sql || ') isku on om.hierarchy_code=isku.hierarchy_code and isku.current_week = om.current_week
			    LEFT JOIN mv_product_hierarchies_filter_temp mv on om.hierarchy_code = mv.hierarchy_code
			    INNER JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = om.current_week
			    LEFT JOIN itemfact_sku_temp is2 ON om.hierarchy_code = is2.hierarchy_code
				WHERE '|| case when report_type = 'class' then 
						' om.dept IN ('||dept_name ||')  AND l3_name IN ('||coll_name ||') AND mv.vendor_name IN ('||ven_name ||')'
				else	' om.dept IN ('||dept_name ||')  AND collection_name IN ('||coll_name ||') AND mv.vendor_name IN ('||ven_name ||')' end ||'
				AND om.current_week between '||sweek ||' and '||tweek ||' and channel<>''Warehouse''
				
			), op_data as (SELECT
			    '||report_type ||',
			    channel,
			    hierarchy_code,
			    fiscal_year,
			    fiscal_month,
			    fiscal_week,
			    markdown_date,
			    op_aoh_units,
			    op_atp_units,
			    op_eop_cost,
			    op_eop_units,
			    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_dollars
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
			        ELSE 0 END) AS pre_md_written_sales,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_units
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
			        ELSE 0 END) AS pre_md_written_units,
			    round(SUM(store_count*written_sales_units) / NULLIF(SUM(written_sales_units), 0)) AS store_count,
			    AVG(written_air) AS w_air,
			    AVG(written_auc) AS w_auc,
			    AVG(written_aur) AS w_aur,
			    AVG(delivered_aur) AS d_aur,
			    AVG(written_dr_perc) AS w_dr_perc,
			    SUM(written_sales_dollars) AS w_sls_dollars,
			    SUM(written_sales_units) AS w_sls_units,
			    SUM(delivered_net_sales_units) AS d_sls_dollars,
			    SUM(delivered_net_sales_units) AS d_sls_units,
			    SUM(written_gm_dollar) AS w_gm_dollars,
			    SUM(delivered_gm) AS d_gm,
			    SUM(aoh_fwos_units) AS aoh_fwos_units,
			    SUM(total_receipt_cost) AS total_receipt_cost,
			    SUM(total_receipt_units) AS total_receipt_units,
			    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
			    SUM(atp_fwos_units) AS atp_fwos_units
			FROM op_base_data
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
			), op_agg as (select '||report_type ||', channel, fiscal_year as year, fiscal_month as month, 
			op_aoh_units, op_atp_units, op_eop_cost, op_eop_units,
			avg(store_count) as op_store_count, count(distinct hierarchy_code) as op_sku_count, avg(w_air) as op_w_air, 
			avg(w_auc) as op_w_auc, avg(w_aur) as op_w_aur, avg(w_dr_perc) as op_w_dr_perc,
			nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_air, 
			nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_auc,
			nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_aur,
			--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
			nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as w_dr_perc,
			sum(w_sls_dollars) as op_w_sls_dollars, avg(w_sls_ecom_perc) as op_w_sls_ecom_perc, 
			sum(w_sls_units) as op_w_sls_units, sum(w_gm_dollars) as op_w_gm_dollars, sum(post_md_written_sales) as op_post_md_written_sales, 
			sum(pre_md_written_sales) as op_pre_md_written_sales, sum(post_md_written_units) as op_post_md_written_units, sum(pre_md_written_units) as op_pre_md_written_units, 
			sum(d_sls_dollars) as op_d_sls_dollars, sum(d_sls_units) as op_d_sls_units, sum(d_gm) as op_d_gm, avg(d_aur) as op_d_aur,
			sum(aoh_fwos_units) as op_aoh_fwos_units, sum(atp_fwos_units) as op_atp_fwos_units,
			sum(total_receipt_cost) as op_total_receipt_cost, sum(total_receipt_units) as op_total_receipt_units, 
			sum(on_order_placed_total_unit) as op_oo_u_ttl_p
			from op_data
			group by 1,2,3,4,5,6,7,8), op as (select '||report_type ||', channel, year, month, op_store_count, op_sku_count, w_air, w_auc, w_dr_perc,
			CASE 
			  WHEN channel = ''Ecom'' THEN 
			    op_w_sls_dollars / NULLIF(op_w_sls_dollars, 0)
			  ELSE 0
			END AS op_w_sls_ecom_perc,
			op_pre_md_written_sales, op_post_md_written_sales, op_pre_md_written_units, op_post_md_written_units,
			op_w_sls_dollars, op_w_gm_dollars,op_d_sls_dollars,op_d_sls_units,
			avg(op_w_sls_dollars) over 
			(partition by '||report_type ||', channel, year order by month rows between 2 preceding and current row) as op_w_sls_dollars_3m_avg,
			avg(op_w_sls_dollars) over 
			(partition by '||report_type ||', channel, year order by month rows between 5 preceding and current row) as op_w_sls_dollars_6m_avg,
			avg(op_w_sls_dollars) over 
			(partition by '||report_type ||', channel, year order by month rows between 8 preceding and current row) as op_w_sls_dollars_9m_avg,
			op_w_sls_units,
			avg(op_w_sls_units) over 
			(partition by '||report_type ||', channel, year order by month rows between 2 preceding and current row) as op_w_sls_units_3m_avg,
			avg(op_w_sls_units) over 
			(partition by '||report_type ||', channel, year order by month rows between 5 preceding and current row) as op_w_sls_units_6m_avg,
			avg(op_w_sls_units) over 
			(partition by '||report_type ||', channel, year order by month rows between 8 preceding and current row) as op_w_sls_units_9m_avg,
			op_w_aur,
			avg(op_w_aur) over 
			(partition by '||report_type ||', channel, year order by month rows between 2 preceding and current row) as op_w_aur_3m_avg,
			avg(op_w_aur) over 
			(partition by '||report_type ||', channel, year order by month rows between 5 preceding and current row) as op_w_aur_6m_avg,
			avg(op_w_aur) over 
			(partition by '||report_type ||', channel, year order by month rows between 8 preceding and current row) as op_w_aur_9m_avg,
			op_d_gm, op_d_aur, op_aoh_units, op_aoh_fwos_units, op_atp_units, op_atp_fwos_units, op_total_receipt_cost, 
			op_total_receipt_units, op_eop_cost, op_eop_units, op_oo_u_ttl_p
			from op_agg), ly_base_data AS (
			    SELECT 
			        mv.'||col_name ||' AS '||report_type ||',
			        channel,
			        lm.hierarchy_code,
			        fiscal_year,
			        fiscal_month,
			        fiscal_week,
			        CASE WHEN is2.markdown_date IS NULL THEN mv.markdown_date ELSE is2.markdown_date END AS markdown_date,
			        FIRST_VALUE(aoh_units) OVER (PARTITION BY mv.'||col_name ||', channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_aoh_units,
			        FIRST_VALUE(atp_units) OVER (PARTITION BY mv.'||col_name ||', channel, fiscal_year, fiscal_month ORDER BY fiscal_week) AS ly_atp_units,
			        LAST_VALUE(eop_cost) OVER (PARTITION BY mv.'||col_name ||', channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ly_eop_cost,
			        LAST_VALUE(eop_units) OVER (PARTITION BY mv.'||col_name ||', channel, fiscal_year, fiscal_month ORDER BY fiscal_week ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS ly_eop_units,
			        written_sales_dollars,
			        written_sales_units,
			        delivered_net_sales_units,
			        written_gm_dollar,
			        delivered_gm,
			        aoh_fwos_units,
			        total_receipt_cost,
			        total_receipt_units,
			        on_order_placed_total_unit,
			        atp_fwos_units,
--  							(
--   							 SELECT SUM((value)::INT)
--   							 FROM json_each_text(isku.tier_store_count::json)
--  							) AS store_count,
                   CASE 
							  WHEN isku.tier_store_count IS NULL THEN 0
							  WHEN isku.tier_store_count::json::text NOT LIKE ''{%'' THEN 0
							  ELSE (
								SELECT SUM((value)::INT)
								FROM json_each_text(isku.tier_store_count::json)
							  )
							END AS store_count,
			        --store_count,
			        written_air,
			        written_auc,
			        written_aur,
			        delivered_aur,
			        written_dr_perc
			    FROM item_smart.ly_master lm
			    left join (' || union_sql || ') isku on lm.hierarchy_code=isku.hierarchy_code and isku.current_week = lm.current_week
			    LEFT JOIN mv_product_hierarchies_filter_temp mv ON lm.hierarchy_code = mv.hierarchy_code
			    INNER JOIN fiscal_date_mapping_temp fdm ON fdm.fiscal_year_week = lm.current_week
			    LEFT JOIN itemfact_sku_temp is2 ON lm.hierarchy_code = is2.hierarchy_code
				WHERE '|| case when report_type = 'class' then 
						' lm.dept IN ('||dept_name ||')  AND l3_name IN ('||coll_name ||') AND mv.vendor_name IN ('||ven_name ||')'
				else	' lm.dept IN ('||dept_name ||')  AND collection_name IN ('||coll_name ||') AND mv.vendor_name IN ('||ven_name ||')' end ||'
				AND lm.current_week between '||sweek ||' and '||tweek ||' and channel<>''Warehouse''
				
			), ly_data as (SELECT
			    '||report_type ||',
			    channel,
			    hierarchy_code,
			    fiscal_year,
			    fiscal_month,
			    fiscal_week,
			    markdown_date,
			    ly_aoh_units,
			    ly_atp_units,
			    ly_eop_cost,
			    ly_eop_units,
			    SUM(CASE WHEN channel = ''Ecom'' THEN written_sales_dollars ELSE 0 END) / NULLIF(SUM(written_sales_dollars), 0) AS w_sls_ecom_perc,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_dollars ELSE 0 END) AS post_md_written_sales,
			    SUM(CASE WHEN EXTRACT(YEAR FROM markdown_date) >= fiscal_year AND EXTRACT(WEEK FROM markdown_date) >= fiscal_week THEN written_sales_units ELSE 0 END) AS post_md_written_units,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_dollars
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_dollars
			        ELSE 0 END) AS pre_md_written_sales,
			    SUM(CASE 
			        WHEN markdown_date IS NULL THEN written_sales_units
			        WHEN EXTRACT(YEAR FROM markdown_date) < fiscal_year AND EXTRACT(WEEK FROM markdown_date) < fiscal_week THEN written_sales_units
			        ELSE 0 END) AS pre_md_written_units,
			    AVG(store_count) AS store_count,
			    AVG(written_air) AS w_air,
			    AVG(written_auc) AS w_auc,
			    AVG(written_aur) AS w_aur,
			    AVG(delivered_aur) AS d_aur,
			    AVG(written_dr_perc) AS w_dr_perc,
			    SUM(written_sales_dollars) AS w_sls_dollars,
			    SUM(written_sales_units) AS w_sls_units,
			    SUM(delivered_net_sales_units) AS d_sls_dollars,
			    SUM(delivered_net_sales_units) AS d_sls_units,
			    SUM(written_gm_dollar) AS w_gm_dollars,
			    SUM(delivered_gm) AS d_gm,
			    SUM(aoh_fwos_units) AS aoh_fwos_units,
			    SUM(total_receipt_cost) AS total_receipt_cost,
			    SUM(total_receipt_units) AS total_receipt_units,
			    SUM(on_order_placed_total_unit) AS on_order_placed_total_unit,
			    SUM(atp_fwos_units) AS atp_fwos_units
			FROM ly_base_data
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
			), ly_agg as (select '||report_type ||', channel, fiscal_year as year, fiscal_month as month, 
			ly_aoh_units, ly_atp_units, ly_eop_cost, ly_eop_units,
			avg(store_count) as store_count, count(distinct hierarchy_code) as sku_count, avg(w_air) as w_air, 
			avg(w_auc) as w_auc, avg(w_aur) as w_aur, avg(w_dr_perc) as w_dr_perc,
			nullif(sum(w_air*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_air, 
			nullif(sum(w_auc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_auc,
			nullif(sum(w_aur*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_aur,
			--nullif(sum(d_aur*d_sls_units),0)/nullif(sum(d_aur),0) as d_aur,
			nullif(sum(w_dr_perc*w_sls_units),0)/nullif(sum(w_sls_units),0) as ly_w_dr_perc,
			sum(w_sls_dollars) as ly_w_sls_dollars, avg(w_sls_ecom_perc) as ly_w_sls_ecom_perc, 
			sum(w_sls_units) as ly_w_sls_units, sum(w_gm_dollars) as ly_w_gm_dollars, sum(post_md_written_sales) as ly_post_md_written_sales, 
			sum(pre_md_written_sales) as ly_pre_md_written_sales, sum(post_md_written_units) as ly_post_md_written_units, sum(pre_md_written_units) as ly_pre_md_written_units, 
			sum(d_sls_dollars) as ly_d_sls_dollars, sum(d_sls_units) as ly_d_sls_units, sum(d_gm) as ly_d_gm, avg(d_aur) as ly_d_aur,
			sum(aoh_fwos_units) as ly_aoh_fwos_units, sum(atp_fwos_units) as ly_atp_fwos_units,
			sum(total_receipt_cost) as ly_total_receipt_cost, sum(total_receipt_units) as ly_total_receipt_units, sum(on_order_placed_total_unit) as ly_oo_u_ttl_p
			from ly_data
			group by 1,2,3,4,5,6,7,8), 

            ly as (select '||report_type ||', channel, year, month, store_count, sku_count, ly_w_air, ly_w_auc, ly_w_dr_perc, 
			CASE 
			  WHEN channel = ''Ecom'' THEN 
			    ly_w_sls_dollars / NULLIF(ly_w_sls_dollars, 0)
			  ELSE 0
			END AS ly_w_sls_ecom_perc,
			ly_pre_md_written_sales, ly_post_md_written_sales, ly_pre_md_written_units, ly_post_md_written_units,
			ly_w_sls_dollars, ly_w_gm_dollars, ly_d_sls_dollars, ly_d_sls_units,
			avg(ly_w_sls_dollars) over 
			(partition by '||report_type ||', channel, year order by month rows between 2 preceding and current row) as ly_w_sls_dollars_3m_avg,
			avg(ly_w_sls_dollars) over 
			(partition by '||report_type ||', channel, year order by month rows between 5 preceding and current row) as ly_w_sls_dollars_6m_avg,
			avg(ly_w_sls_dollars) over 
			(partition by '||report_type ||', channel, year order by month rows between 8 preceding and current row) as ly_w_sls_dollars_9m_avg,
			ly_w_sls_units,
			avg(ly_w_sls_units) over 
			(partition by '||report_type ||', channel, year order by month rows between 2 preceding and current row) as ly_w_sls_units_3m_avg,
			avg(ly_w_sls_units) over 
			(partition by '||report_type ||', channel, year order by month rows between 5 preceding and current row) as ly_w_sls_units_6m_avg,
			avg(ly_w_sls_units) over 
			(partition by '||report_type ||', channel, year order by month rows between 8 preceding and current row) as ly_w_sls_units_9m_avg,
			ly_w_aur,
			avg(ly_w_aur) over 
			(partition by '||report_type ||', channel, year order by month rows between 2 preceding and current row) as ly_w_aur_3m_avg,
			avg(ly_w_aur) over 
			(partition by '||report_type ||', channel, year order by month rows between 5 preceding and current row) as ly_w_aur_6m_avg,
			avg(ly_w_aur) over 
			(partition by '||report_type ||', channel, year order by month rows between 8 preceding and current row) as ly_w_aur_9m_avg,
			ly_d_gm, ly_d_aur, ly_aoh_units, ly_aoh_fwos_units, ly_atp_units, ly_atp_fwos_units,
			ly_total_receipt_cost, ly_total_receipt_units, ly_oo_u_ttl_p, ly_eop_cost, ly_eop_units
			from ly_agg
			), final_data as (select '||report_type ||', channel, year, month, 
			ly.sku_count, ------------
			coalesce(CAST(wp_store_count AS INT),0) as wp_store_count, wp_w_air as wp_w_air, wp_w_auc as wp_w_auc,
            no_of_months , avg_monthly_sls_dollars , wp_w_sls_dollars_3m_avg , wp_w_sls_dollars_6m_avg , wp_w_sls_dollars_9m_avg ,
			avg_monthly_sls_units , wp_w_sls_units_3m_avg , wp_w_sls_units_6m_avg, wp_w_sls_units_9m_avg,
			wp_w_sls_dollars, wp_pre_md_written_sales as wp_pre_md_written_sales , wp_post_md_written_sales as wp_post_md_written_sales, 
			wp_w_sls_ecom_perc, op_w_sls_dollars, op_pre_md_written_sales, op_post_md_written_sales,
			op_w_sls_ecom_perc, (wp_w_sls_dollars - op_w_sls_dollars) as w_sls_dollars_wp_op_var,
			(wp_pre_md_written_sales - op_pre_md_written_sales) as pre_md_w_sls_dollars_wp_op_var,
			(wp_post_md_written_sales - op_post_md_written_sales) as post_md_w_sls_dollars_wp_op_var,
			(wp_w_sls_dollars - op_w_sls_dollars) / NULLIF(op_w_sls_dollars, 0) as w_sls_dollars_wp_op_var_perc,
			(wp_pre_md_written_sales - op_pre_md_written_sales) / NULLIF(op_pre_md_written_sales, 0) as pre_md_w_sls_dollars_wp_op_var_perc,
			(wp_post_md_written_sales - op_post_md_written_sales) / NULLIF(op_post_md_written_sales, 0) as post_md_w_sls_dollars_wp_op_var_perc,
			ly_w_sls_dollars as ly_w_sls_dollars, ly_pre_md_written_sales as ly_pre_md_written_sales, ly_post_md_written_sales as ly_post_md_written_sales,
			ly_w_sls_ecom_perc as ly_w_sls_ecom_perc, (wp_w_sls_dollars - ly_w_sls_dollars) as w_sls_dollars_wp_ly_var,
			(wp_pre_md_written_sales - ly_pre_md_written_sales) as pre_md_w_sls_dollars_wp_ly_var,
			(wp_post_md_written_sales - ly_post_md_written_sales) as post_md_w_sls_dollars_wp_ly_var,
			(wp_w_sls_dollars - ly_w_sls_dollars) / NULLIF(ly_w_sls_dollars, 0) as w_sls_dollars_wp_ly_var_perc,
			(wp_pre_md_written_sales - ly_pre_md_written_sales) / NULLIF(ly_pre_md_written_sales, 0) as pre_md_w_sls_dollars_wp_ly_var_perc,
			(wp_post_md_written_sales - ly_post_md_written_sales) / NULLIF(ly_post_md_written_sales, 0) as post_md_w_sls_dollars_wp_ly_var_perc,
			wp_w_sls_units, wp_pre_md_written_units, wp_post_md_written_units,
			op_w_sls_units, op_pre_md_written_units, op_post_md_written_units,
			(wp_w_sls_units - op_w_sls_units) as w_sls_units_wp_op_var,
			(wp_pre_md_written_units - op_pre_md_written_units) as pre_md_w_sls_units_wp_op_var,
			(wp_post_md_written_units - op_post_md_written_units) as post_md_w_sls_units_wp_op_var,
			(wp_w_sls_units - op_w_sls_units) / NULLIF(op_w_sls_units, 0) as w_sls_units_wp_op_var_perc,
			(wp_pre_md_written_units - op_pre_md_written_units) / NULLIF(op_pre_md_written_units, 0) as pre_md_w_sls_units_wp_op_var_perc,
			(wp_post_md_written_units - op_post_md_written_units) / NULLIF(op_post_md_written_units, 0) as post_md_w_sls_units_wp_op_var_perc,
			ly_w_sls_units as ly_w_sls_units, ly_pre_md_written_units as ly_pre_md_written_units, ly_post_md_written_units as ly_post_md_written_units,
			(wp_w_sls_units - ly_w_sls_units) as w_sls_units_wp_ly_var,
			(wp_pre_md_written_units - ly_pre_md_written_units) as pre_md_w_sls_units_wp_ly_var,
			(wp_post_md_written_units - ly_post_md_written_units) as post_md_w_sls_units_wp_ly_var,
			(wp_w_sls_units - ly_w_sls_dollars) / NULLIF(ly_w_sls_units, 0) as w_sls_units_wp_ly_var_perc,
			(wp_pre_md_written_units - ly_pre_md_written_units) / NULLIF(ly_pre_md_written_units, 0) as pre_md_w_sls_units_wp_ly_var_perc,
			(wp_post_md_written_units - ly_post_md_written_units) / NULLIF(ly_post_md_written_units, 0) as post_md_w_sls_units_wp_ly_var_perc,
			wp.wp_w_aur as wp_w_aur, wp_w_aur_3m_avg, wp_w_aur_6m_avg, wp_w_aur_9m_avg, op_w_aur, ly_w_aur,
			wp.w_dr_perc as wp_w_dr_perc, op.w_dr_perc as op_w_dr_perc, ly_w_dr_perc,
			wp_w_gm_dollars, NULLIF(wp_w_gm_dollars, 0) / NULLIF(wp_w_sls_dollars, 0) as wp_w_gm_perc, 
			op_w_gm_dollars, NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0) as op_w_gm_perc,
			(wp_w_gm_dollars - op_w_gm_dollars) as w_gm_dollars_wp_op_var,
			((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)))/(NULLIF(op_w_gm_dollars, 0) / NULLIF(op_w_sls_dollars, 0)) as w_gm_perc_wp_op_var,
			(wp_w_gm_dollars - op_w_gm_dollars) / NULLIF(op_w_gm_dollars, 0) as w_gm_dollars_wp_op_var_perc,
			ly_w_gm_dollars as ly_w_gm_dollars, NULLIF(ly_w_gm_dollars, 0) / NULLIF(ly_w_sls_dollars, 0) as ly_w_gm_perc,
			(wp_w_gm_dollars - ly_w_gm_dollars) as w_gm_dollars_wp_ly_var,
			((NULLIF(wp_w_gm_dollars, 0)/NULLIF(wp_w_sls_dollars, 0)) - (NULLIF(ly_w_gm_dollars, 0) / NULLIF(ly_w_sls_dollars, 0)))/(NULLIF(ly_w_gm_dollars, 0) / NULLIF(ly_w_sls_dollars, 0)) as w_gm_perc_wp_ly_var,
			(wp_w_gm_dollars - ly_w_gm_dollars) / NULLIF(ly_w_gm_dollars, 0) as w_gm_dollars_wp_ly_var_perc,
			wp_aoh_units, wp_aoh_fwos_units, op_aoh_units, op_aoh_fwos_units,
			ly_aoh_units, ly_aoh_fwos_units as ly_aoh_fwos_units,
			wp_total_receipt_units, op_total_receipt_units, 
			(wp_total_receipt_units - op_total_receipt_units) as total_receipt_units_wp_op_var,
			(wp_total_receipt_units - op_total_receipt_units) / NULLIF(op_total_receipt_units, 0) as total_receipt_units_wp_op_var_perc,
			ly_total_receipt_units as ly_total_receipt_units,
			(wp_total_receipt_units - ly_total_receipt_units) as total_receipt_units_wp_ly_var,
			(wp_total_receipt_units - ly_total_receipt_units) / NULLIF(ly_total_receipt_units, 0) as total_receipt_units_wp_ly_var_perc,
			wp_oo_u_ttl_p, op_oo_u_ttl_p,
			(wp_oo_u_ttl_p - op_oo_u_ttl_p) as oo_u_ttl_p_wp_op_var,
			(wp_oo_u_ttl_p - op_oo_u_ttl_p)/NULLIF(op_oo_u_ttl_p, 0) as oo_u_ttl_p_wp_op_var_perc,
			ly_oo_u_ttl_p, (wp_oo_u_ttl_p - ly_oo_u_ttl_p) as oo_u_ttl_p_wp_ly_var,
			(wp_oo_u_ttl_p - ly_oo_u_ttl_p)/NULLIF(ly_oo_u_ttl_p, 0) as oo_u_ttl_p_wp_ly_var_perc,
			wp_atp_units, wp_atp_fwos_units, op_atp_units, op_atp_fwos_units, ly_atp_units, ly_atp_fwos_units,
			wp_d_sls_dollars, op_d_sls_dollars,
			(wp_d_sls_dollars - op_d_sls_dollars) as d_sls_dollars_wp_op_var,
			(wp_d_sls_dollars - op_d_sls_dollars)/NULLIF(op_d_sls_dollars, 0) as d_sls_dollars_wp_op_var_perc,
			ly_d_sls_dollars, 
			(wp_d_sls_dollars - ly_d_sls_dollars) as d_sls_dollars_wp_ly_var,
			(wp_d_sls_dollars - ly_d_sls_dollars)/NULLIF(ly_d_sls_dollars, 0) as d_sls_dollars_wp_ly_var_perc,
			wp_d_sls_units, op_d_sls_units,
			(wp_d_sls_units - op_d_sls_units) as d_sls_units_wp_op_var,
			(wp_d_sls_units - op_d_sls_units)/NULLIF(op_d_sls_units, 0) as d_sls_units_wp_op_var_perc,
			ly_d_sls_units, 
			(wp_d_sls_units - ly_d_sls_units) as d_sls_units_wp_ly_var,
			(wp_d_sls_units - ly_d_sls_units)/NULLIF(ly_d_sls_units, 0) as d_sls_units_wp_ly_var_perc,
			wp_d_aur as wp_d_aur, op_d_aur, ly_d_aur as ly_d_aur,
			wp_d_gm, NULLIF(wp_d_gm, 0) / NULLIF(wp_d_sls_dollars, 0) as wp_d_gm_perc, 
			op_d_gm, NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0) as op_d_gm_perc,
			(wp_d_gm - op_d_gm) as d_gm_wp_op_var,
			((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)))/(NULLIF(op_d_gm, 0) / NULLIF(op_d_sls_dollars, 0)) as d_gm_perc_wp_op_var,
			(wp_d_gm - op_d_gm) / NULLIF(op_d_gm, 0) as d_gm_wp_op_var_perc,
			ly_d_gm as ly_d_gm, NULLIF(ly_d_gm, 0) / NULLIF(ly_w_sls_dollars, 0) as ly_d_gm_perc,
			(wp_d_gm - ly_d_gm) as d_gm_wp_ly_var,
			((NULLIF(wp_d_gm, 0)/NULLIF(wp_d_sls_dollars, 0)) - (NULLIF(ly_d_gm, 0) / NULLIF(ly_d_sls_dollars, 0)))/(NULLIF(ly_d_gm, 0) / NULLIF(ly_d_sls_dollars, 0)) as d_gm_perc_wp_ly_var,
			(wp_d_gm - ly_d_gm) / NULLIF(ly_d_gm, 0) as d_gm_wp_ly_var_perc,
			wp_eop_cost, op_eop_cost,
			(wp_eop_cost - op_eop_cost) as eop_cost_wp_op_var,
			(wp_eop_cost - op_eop_cost) / NULLIF(op_eop_cost, 0) as eop_cost_wp_op_var_perc,
			ly_eop_cost,
			(wp_eop_cost - ly_eop_cost) as eop_cost_wp_ly_var,
			(wp_eop_cost - ly_eop_cost) / NULLIF(ly_eop_cost, 0) as eop_cost_wp_ly_var_perc,
			wp_eop_units, op_eop_units,
			(wp_eop_units - op_eop_units) as eop_units_wp_op_var,
			(wp_eop_units - op_eop_units) / NULLIF(op_eop_units, 0) as eop_units_wp_op_var_perc,
			ly_eop_units,
			(wp_eop_units - ly_eop_units) as eop_units_wp_ly_var,
			(wp_eop_units - ly_eop_units) / NULLIF(ly_eop_units, 0) as eop_units_wp_ly_var_perc
			from wp_final wp
			left join op using ('||report_type ||', channel, year, month)
			left join ly using ('||report_type ||', channel, year, month)
			order by year, month), omni_channel AS (
			    SELECT
			        '||report_type ||',
			        ''Omni'' AS channel,
			        year,
			        month,
			        final_data.sku_count, 
			        COALESCE(SUM( CAST(wp_store_count AS INT)), 0) AS wp_store_count,
			COALESCE(AVG(wp_w_air), 0) AS wp_w_air,
			COALESCE(AVG(wp_w_auc), 0) AS wp_w_auc,
			COALESCE(MAX(no_of_months), 0) AS no_of_months,
			COALESCE(SUM(avg_monthly_sls_dollars), 0) AS avg_monthly_sls_dollars,
			COALESCE(AVG(wp_w_sls_dollars_3m_avg), 0) AS wp_w_sls_dollars_3m_avg,
			COALESCE(AVG(wp_w_sls_dollars_6m_avg), 0) AS wp_w_sls_dollars_6m_avg,
			COALESCE(AVG(wp_w_sls_dollars_9m_avg), 0) AS wp_w_sls_dollars_9m_avg,
			COALESCE(SUM(avg_monthly_sls_units), 0) AS avg_monthly_sls_units,
			COALESCE(AVG(wp_w_sls_units_3m_avg), 0) AS wp_w_sls_units_3m_avg,
			COALESCE(AVG(wp_w_sls_units_6m_avg), 0) AS wp_w_sls_units_6m_avg,
			COALESCE(AVG(wp_w_sls_units_9m_avg), 0) AS wp_w_sls_units_9m_avg,
			COALESCE(SUM(wp_w_sls_dollars), 0) AS wp_w_sls_dollars,
			COALESCE(SUM(wp_pre_md_written_sales), 0) AS wp_pre_md_written_sales,
			COALESCE(SUM(wp_post_md_written_sales), 0) AS wp_post_md_written_sales,
			COALESCE(SUM(wp_w_sls_ecom_perc * wp_w_sls_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0), 0) AS wp_w_sls_ecom_perc,
			COALESCE(SUM(op_w_sls_dollars), 0) AS op_w_sls_dollars,
			COALESCE(SUM(op_pre_md_written_sales), 0) AS op_pre_md_written_sales,
			COALESCE(SUM(op_post_md_written_sales), 0) AS op_post_md_written_sales,
			COALESCE(SUM(op_w_sls_ecom_perc * op_w_sls_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS op_w_sls_ecom_perc,
			COALESCE(SUM(w_sls_dollars_wp_op_var), 0) AS w_sls_dollars_wp_op_var,
			COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var), 0) AS pre_md_w_sls_dollars_wp_op_var,
			COALESCE(SUM(post_md_w_sls_dollars_wp_op_var), 0) AS post_md_w_sls_dollars_wp_op_var,
			COALESCE(SUM(w_sls_dollars_wp_op_var) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS w_sls_dollars_wp_op_var_perc,
			COALESCE(SUM(pre_md_w_sls_dollars_wp_op_var) / NULLIF(SUM(op_pre_md_written_sales), 0), 0) AS pre_md_w_sls_dollars_wp_op_var_perc,
			COALESCE(SUM(post_md_w_sls_dollars_wp_op_var) / NULLIF(SUM(op_post_md_written_sales), 0), 0) AS post_md_w_sls_dollars_wp_op_var_perc,
			COALESCE(SUM(ly_w_sls_dollars), 0) AS ly_w_sls_dollars,
			COALESCE(SUM(ly_pre_md_written_sales), 0) AS ly_pre_md_written_sales,
			COALESCE(SUM(ly_post_md_written_sales), 0) AS ly_post_md_written_sales,
			COALESCE(SUM(ly_w_sls_ecom_perc * ly_w_sls_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS ly_w_sls_ecom_perc,
			COALESCE(SUM(w_sls_dollars_wp_ly_var), 0) AS w_sls_dollars_wp_ly_var,
			COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var), 0) AS pre_md_w_sls_dollars_wp_ly_var,
			COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var), 0) AS post_md_w_sls_dollars_wp_ly_var,
			COALESCE(SUM(w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS w_sls_dollars_wp_ly_var_perc,
			COALESCE(SUM(pre_md_w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_pre_md_written_sales), 0), 0) AS pre_md_w_sls_dollars_wp_ly_var_perc,
			COALESCE(SUM(post_md_w_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_post_md_written_sales), 0), 0) AS post_md_w_sls_dollars_wp_ly_var_perc,
			COALESCE(SUM(wp_w_sls_units), 0) AS wp_w_sls_units,
			COALESCE(SUM(wp_pre_md_written_units), 0) AS wp_pre_md_written_units,
			COALESCE(SUM(wp_post_md_written_units), 0) AS wp_post_md_written_units,
			COALESCE(SUM(op_w_sls_units), 0) AS op_w_sls_units,
			COALESCE(SUM(op_pre_md_written_units), 0) AS op_pre_md_written_units,
			COALESCE(SUM(op_post_md_written_units), 0) AS op_post_md_written_units,
			COALESCE(SUM(w_sls_units_wp_op_var), 0) AS w_sls_units_wp_op_var,
			COALESCE(SUM(pre_md_w_sls_units_wp_op_var), 0) AS pre_md_w_sls_units_wp_op_var,
			COALESCE(SUM(post_md_w_sls_units_wp_op_var), 0) AS post_md_w_sls_units_wp_op_var,
			COALESCE(SUM(w_sls_units_wp_op_var) / NULLIF(SUM(op_w_sls_units), 0), 0) AS w_sls_units_wp_op_var_perc,
			COALESCE(SUM(pre_md_w_sls_units_wp_op_var) / NULLIF(SUM(op_pre_md_written_units), 0), 0) AS pre_md_w_sls_units_wp_op_var_perc,
			COALESCE(SUM(post_md_w_sls_units_wp_op_var) / NULLIF(SUM(op_post_md_written_units), 0), 0) AS post_md_w_sls_units_wp_op_var_perc,
			COALESCE(SUM(ly_w_sls_units), 0) AS ly_w_sls_units,
			COALESCE(SUM(ly_pre_md_written_units), 0) AS ly_pre_md_written_units,
			COALESCE(SUM(ly_post_md_written_units), 0) AS ly_post_md_written_units,
			COALESCE(SUM(w_sls_units_wp_ly_var), 0) AS w_sls_units_wp_ly_var,
			COALESCE(SUM(pre_md_w_sls_units_wp_ly_var), 0) AS pre_md_w_sls_units_wp_ly_var,
			COALESCE(SUM(post_md_w_sls_units_wp_ly_var), 0) AS post_md_w_sls_units_wp_ly_var,
			COALESCE(SUM(w_sls_units_wp_ly_var) / NULLIF(SUM(ly_w_sls_units), 0), 0) AS w_sls_units_wp_ly_var_perc,
			COALESCE(SUM(pre_md_w_sls_units_wp_ly_var) / NULLIF(SUM(ly_pre_md_written_units), 0), 0) AS pre_md_w_sls_units_wp_ly_var_perc,
			COALESCE(SUM(post_md_w_sls_units_wp_ly_var) / NULLIF(SUM(ly_post_md_written_units), 0), 0) AS post_md_w_sls_units_wp_ly_var_perc,
			COALESCE(SUM(wp_w_sls_dollars) / NULLIF(SUM(wp_w_sls_units), 0), 0) AS wp_w_aur,
			COALESCE(AVG(wp_w_aur_3m_avg), 0) AS wp_w_aur_3m_avg,
			COALESCE(AVG(wp_w_aur_6m_avg), 0) AS wp_w_aur_6m_avg,
			COALESCE(AVG(wp_w_aur_9m_avg), 0) AS wp_w_aur_9m_avg,
			COALESCE(SUM(op_w_sls_dollars) / NULLIF(SUM(op_w_sls_units), 0), 0) AS op_w_aur,
			COALESCE(SUM(ly_w_sls_dollars) / NULLIF(SUM(ly_w_sls_units), 0), 0) AS ly_w_aur,
			COALESCE(AVG(wp_w_dr_perc), 0) AS wp_w_dr_perc,
			COALESCE(AVG(op_w_dr_perc), 0) AS op_w_dr_perc,
			COALESCE(AVG(ly_w_dr_perc), 0) AS ly_w_dr_perc,
			COALESCE(SUM(wp_w_gm_dollars), 0) AS wp_w_gm_dollars,
			COALESCE(SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0), 0) AS wp_w_gm_perc,
			COALESCE(SUM(op_w_gm_dollars), 0) AS op_w_gm_dollars,
			COALESCE(SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0) AS op_w_gm_perc,
			COALESCE(SUM(w_gm_dollars_wp_op_var), 0) AS w_gm_dollars_wp_op_var,
			COALESCE((SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0) - SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0)) / NULLIF(SUM(op_w_gm_dollars) / NULLIF(SUM(op_w_sls_dollars), 0), 0), 0) AS w_gm_perc_wp_op_var,
			COALESCE(SUM(w_gm_dollars_wp_op_var) / NULLIF(SUM(op_w_gm_dollars), 0), 0) AS w_gm_dollars_wp_op_var_perc,
			COALESCE(SUM(ly_w_gm_dollars), 0) AS ly_w_gm_dollars,
			COALESCE(SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0) AS ly_w_gm_perc,
			COALESCE(SUM(w_gm_dollars_wp_ly_var), 0) AS w_gm_dollars_wp_ly_var,
			COALESCE((SUM(wp_w_gm_dollars) / NULLIF(SUM(wp_w_sls_dollars), 0) - SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0)) / NULLIF(SUM(ly_w_gm_dollars) / NULLIF(SUM(ly_w_sls_dollars), 0), 0), 0) AS w_gm_perc_wp_ly_var,
			COALESCE(SUM(w_gm_dollars_wp_ly_var) / NULLIF(SUM(ly_w_gm_dollars), 0), 0) AS w_gm_dollars_wp_ly_var_perc,
			COALESCE(SUM(wp_aoh_units), 0) AS wp_aoh_units,
			COALESCE(SUM(wp_aoh_fwos_units), 0) AS wp_aoh_fwos_units,
			COALESCE(SUM(op_aoh_units), 0) AS op_aoh_units,
			COALESCE(SUM(op_aoh_fwos_units), 0) AS op_aoh_fwos_units,
			COALESCE(SUM(ly_aoh_units), 0) AS ly_aoh_units,
			COALESCE(SUM(ly_aoh_fwos_units), 0) AS ly_aoh_fwos_units,
			COALESCE(SUM(wp_total_receipt_units), 0) AS wp_total_receipt_units,
			COALESCE(SUM(op_total_receipt_units), 0) AS op_total_receipt_units,
			COALESCE(SUM(total_receipt_units_wp_op_var), 0) AS total_receipt_units_wp_op_var,
			COALESCE(SUM(total_receipt_units_wp_op_var) / NULLIF(SUM(op_total_receipt_units), 0), 0) AS total_receipt_units_wp_op_var_perc,
			COALESCE(SUM(ly_total_receipt_units), 0) AS ly_total_receipt_units,
			COALESCE(SUM(total_receipt_units_wp_ly_var), 0) AS total_receipt_units_wp_ly_var,
			COALESCE(SUM(total_receipt_units_wp_ly_var) / NULLIF(SUM(ly_total_receipt_units), 0), 0) AS total_receipt_units_wp_ly_var_perc,
			COALESCE(SUM(wp_oo_u_ttl_p), 0) AS wp_oo_u_ttl_p,
			COALESCE(SUM(op_oo_u_ttl_p), 0) AS op_oo_u_ttl_p,
			COALESCE(SUM(oo_u_ttl_p_wp_op_var), 0) AS oo_u_ttl_p_wp_op_var,
			COALESCE(SUM(oo_u_ttl_p_wp_op_var) / NULLIF(SUM(op_oo_u_ttl_p), 0), 0) AS oo_u_ttl_p_wp_op_var_perc,
			COALESCE(SUM(ly_oo_u_ttl_p), 0) AS ly_oo_u_ttl_p,
			COALESCE(SUM(oo_u_ttl_p_wp_ly_var), 0) AS oo_u_ttl_p_wp_ly_var,
			COALESCE(SUM(oo_u_ttl_p_wp_ly_var) / NULLIF(SUM(ly_oo_u_ttl_p), 0), 0) AS oo_u_ttl_p_wp_ly_var_perc,
			COALESCE(SUM(wp_atp_units), 0) AS wp_atp_units,
			COALESCE(SUM(wp_atp_fwos_units), 0) AS wp_atp_fwos_units,
			COALESCE(SUM(op_atp_units), 0) AS op_atp_units,
			COALESCE(SUM(op_atp_fwos_units), 0) AS op_atp_fwos_units,
			COALESCE(SUM(ly_atp_units), 0) AS ly_atp_units,
			COALESCE(SUM(ly_atp_fwos_units), 0) AS ly_atp_fwos_units,
			COALESCE(SUM(wp_d_sls_dollars), 0) AS wp_d_sls_dollars,
			COALESCE(SUM(op_d_sls_dollars), 0) AS op_d_sls_dollars,
			COALESCE(SUM(d_sls_dollars_wp_op_var), 0) AS d_sls_dollars_wp_op_var,
			COALESCE(SUM(d_sls_dollars_wp_op_var) / NULLIF(SUM(op_d_sls_dollars), 0), 0) AS d_sls_dollars_wp_op_var_perc,
			COALESCE(SUM(ly_d_sls_dollars), 0) AS ly_d_sls_dollars,
			COALESCE(SUM(d_sls_dollars_wp_ly_var), 0) AS d_sls_dollars_wp_ly_var,
			COALESCE(SUM(d_sls_dollars_wp_ly_var) / NULLIF(SUM(ly_d_sls_dollars), 0), 0) AS d_sls_dollars_wp_ly_var_perc,
			COALESCE(SUM(wp_d_sls_units), 0) AS wp_d_sls_units,
			COALESCE(SUM(op_d_sls_units), 0) AS op_d_sls_units,
			COALESCE(SUM(d_sls_units_wp_op_var), 0) AS d_sls_units_wp_op_var,
			COALESCE(SUM(d_sls_units_wp_op_var) / NULLIF(SUM(op_d_sls_units), 0), 0) AS d_sls_units_wp_op_var_perc,
			COALESCE(SUM(ly_d_sls_units), 0) AS ly_d_sls_units,
			COALESCE(SUM(d_sls_units_wp_ly_var), 0) AS d_sls_units_wp_ly_var,
			COALESCE(SUM(d_sls_units_wp_ly_var) / NULLIF(SUM(ly_d_sls_units), 0), 0) AS d_sls_units_wp_ly_var_perc,
			COALESCE(AVG(wp_d_aur), 0) AS wp_d_aur,
			COALESCE(AVG(op_d_aur), 0) AS op_d_aur,
			COALESCE(AVG(ly_d_aur), 0) AS ly_d_aur,
			COALESCE(SUM(wp_d_gm), 0) AS wp_d_gm,
			COALESCE(SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0), 0) AS wp_d_gm_perc,
			COALESCE(SUM(op_d_gm), 0) AS op_d_gm,
			COALESCE(SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0), 0) AS op_d_gm_perc,
			COALESCE(SUM(d_gm_wp_op_var), 0) AS d_gm_wp_op_var,
			COALESCE((SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0) - SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0)) / NULLIF(SUM(op_d_gm) / NULLIF(SUM(op_d_sls_dollars), 0), 0), 0) AS d_gm_perc_wp_op_var,
			COALESCE(SUM(d_gm_wp_op_var) / NULLIF(SUM(op_d_gm), 0), 0) AS d_gm_wp_op_var_perc,
			COALESCE(SUM(ly_d_gm), 0) AS ly_d_gm,
			COALESCE(SUM(ly_d_gm) / NULLIF(SUM(ly_d_sls_dollars), 0), 0) AS ly_d_gm_perc,
			COALESCE(SUM(d_gm_wp_ly_var), 0) AS d_gm_wp_ly_var,
			COALESCE((SUM(wp_d_gm) / NULLIF(SUM(wp_d_sls_dollars), 0) - SUM(ly_d_gm) / NULLIF(SUM(ly_d_sls_dollars), 0)) / NULLIF(SUM(ly_d_gm) / NULLIF(SUM(ly_d_sls_dollars), 0), 0), 0) AS d_gm_perc_wp_ly_var,
			COALESCE(SUM(d_gm_wp_ly_var) / NULLIF(SUM(ly_d_gm), 0), 0) AS d_gm_wp_ly_var_perc,
			COALESCE(SUM(wp_eop_cost), 0) AS wp_eop_cost,
			COALESCE(SUM(op_eop_cost), 0) AS op_eop_cost,
			COALESCE(SUM(eop_cost_wp_op_var), 0) AS eop_cost_wp_op_var,
			COALESCE(SUM(eop_cost_wp_op_var) / NULLIF(SUM(op_eop_cost), 0), 0) AS eop_cost_wp_op_var_perc,
			COALESCE(SUM(ly_eop_cost), 0) AS ly_eop_cost,
			COALESCE(SUM(eop_cost_wp_ly_var), 0) AS eop_cost_wp_ly_var,
			COALESCE(SUM(eop_cost_wp_ly_var) / NULLIF(SUM(ly_eop_cost), 0), 0) AS eop_cost_wp_ly_var_perc,
			COALESCE(SUM(wp_eop_units), 0) AS wp_eop_units,
			COALESCE(SUM(op_eop_units), 0) AS op_eop_units,
			COALESCE(SUM(eop_units_wp_op_var), 0) AS eop_units_wp_op_var,
			COALESCE(SUM(eop_units_wp_op_var) / NULLIF(SUM(op_eop_units), 0), 0) AS eop_units_wp_op_var_perc,
			COALESCE(SUM(ly_eop_units), 0) AS ly_eop_units,
			COALESCE(SUM(eop_units_wp_ly_var), 0) AS eop_units_wp_ly_var,
			COALESCE(SUM(eop_units_wp_ly_var) / NULLIF(SUM(ly_eop_units), 0), 0) AS eop_units_wp_ly_var
			        from final_data
			        group by 1,2,3,4,5
			        order by year, month
			) ,final_report as
			(SELECT * from final_data
			union all
			select *from omni_channel
			order by year, month
			)

			Select ' 
				||report_type||' as "' || INITCAP(report_type) || '",
				 channel as "Channel",
-- year as "YEAR",
-- month as "MONTH",
COALESCE(wp_store_count, 0) as "Store Count",
NULL as "# of SKUs",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_air, 0)::NUMERIC, 2), ''FM999999990.00'')) as "AIR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_auc, 0)::NUMERIC, 2), ''FM999999990.00'')) as "AUC",
COALESCE(no_of_months, 0) as "WP # of Months w/Sls",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(avg_monthly_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Avg Monthly W Sls$",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_3m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "3 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_6m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "6 mo Avg Month W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars_9m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "9 mo Avg Month W Sls $",
COALESCE(avg_monthly_sls_units, 0) as "WP Avg Monthly W U Sls",
COALESCE(wp_w_sls_units_3m_avg, 0) as "3 mo Avg Month W Sls U",
COALESCE(wp_w_sls_units_6m_avg, 0) as "6 mo Avg Month W Sls U",
COALESCE(wp_w_sls_units_9m_avg, 0) as "9 mo Avg Month W Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_pre_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_post_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_pre_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_post_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PreMD Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ % Var  to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - PreMD % Var  to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - PostMD % Var  to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_pre_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W Sls $ - PreMD",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_post_md_written_sales, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W Sls $ - PostMD",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_sls_ecom_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY W Sls $ - Ecom % Cont",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PreMD Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W Sls $ - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - PreMD % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls $ - PostMD % Var to LY",
COALESCE(wp_w_sls_units, 0) as "WP W Sls U",
COALESCE(wp_pre_md_written_units, 0) as "WP W Sls U - PreMD",
COALESCE(wp_post_md_written_units, 0) as "WP W Sls U - PostMD",
COALESCE(op_w_sls_units, 0) as "OP W Sls U",
COALESCE(op_pre_md_written_units, 0) as "OP W Sls U - PreMD",
COALESCE(op_post_md_written_units, 0) as "OP W Sls U - PostMD",
COALESCE(w_sls_units_wp_op_var, 0) as "WP W Sls U Var to OP",
COALESCE(pre_md_w_sls_units_wp_op_var, 0) as "WP W Sls U - PreMD Var to OP",
COALESCE(post_md_w_sls_units_wp_op_var, 0) as "WP W Sls U - PostMD Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U - PreMD % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U - PostMD % Var to OP",
COALESCE(ly_w_sls_units, 0) as "LY W Sls U",
COALESCE(ly_pre_md_written_units, 0) as "LY W Sls U - PreMD",
COALESCE(ly_post_md_written_units, 0) as "LY W Sls U - PostMD",
COALESCE(w_sls_units_wp_ly_var, 0) as "WP W Sls U Var to LY",
COALESCE(pre_md_w_sls_units_wp_ly_var, 0) as "WP W Sls U - PreMD Var to LY",
COALESCE(post_md_w_sls_units_wp_ly_var, 0) as "WP W Sls U - PostMD Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(pre_md_w_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U - PreMD % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(post_md_w_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W Sls U - PostMD % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_3m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "3 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_6m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "6 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_aur_9m_avg, 0)::NUMERIC, 2), ''FM999999990.00'')) as "9 mo Avg Month W Sls AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W AUR",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP W DR%",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_dr_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY W DR%",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(op_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_perc_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_w_gm_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY W GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_w_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY W GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP W GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_perc_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(w_gm_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP W GM $ % Var to LY",
COALESCE(wp_aoh_units, 0) as "WP AOH U",
COALESCE(wp_aoh_fwos_units, 0) as "WP AOH FWOS U",
COALESCE(op_aoh_units, 0) as "OP AOH U",
COALESCE(op_aoh_fwos_units, 0) as "OP AOH FWOS U",
COALESCE(ly_aoh_units, 0) as "LY AOH U",
COALESCE(ly_aoh_fwos_units, 0) as "LY AOH FWOS U",
COALESCE(wp_total_receipt_units, 0) as "WP Ttl Rcpt U",
COALESCE(op_total_receipt_units, 0) as "OP Ttl Rcpt U",
COALESCE(total_receipt_units_wp_op_var, 0) as "WP Ttl Rcpt U Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(total_receipt_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP Ttl Rcpt U % Var to OP",
COALESCE(ly_total_receipt_units, 0) as "LY Ttl Rcpt U",
COALESCE(total_receipt_units_wp_ly_var, 0) as "WP Ttl Rcpt U Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(total_receipt_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP Ttl Rcpt U % Var to LY",
COALESCE(wp_oo_u_ttl_p, 0) as "WP OO U (TTL-P)",
COALESCE(op_oo_u_ttl_p, 0) as "OP OO U (TTL-P)",
COALESCE(oo_u_ttl_p_wp_op_var, 0) as "WP OO U (TTL-P) Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(oo_u_ttl_p_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP OO U (TTL-P) % Var to OP",
COALESCE(ly_oo_u_ttl_p, 0) as "LY OO U (TTL-P)",
COALESCE(oo_u_ttl_p_wp_ly_var, 0) as "WP OO U (TTL-P) Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(oo_u_ttl_p_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP OO U (TTL-P) % Var to LY",
COALESCE(wp_atp_units, 0) as "WP ATP U",
COALESCE(wp_atp_fwos_units, 0) as "WP ATP FWOS U",
COALESCE(op_atp_units, 0) as "OP ATP U",
COALESCE(op_atp_fwos_units, 0) as "OP ATP FWOS U",
COALESCE(ly_atp_units, 0) as "LY ATP U",
COALESCE(ly_atp_fwos_units, 0) as "LY ATP FWOS U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to OP D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_d_sls_dollars, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY D Sls $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to LY D Sls $",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_dollars_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY D Sls $",
COALESCE(wp_d_sls_units, 0) as "WP D Sls U",
COALESCE(op_d_sls_units, 0) as "OP D Sls U",
COALESCE(d_sls_units_wp_op_var, 0) as "WP Var to OP D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP D Sls U",
COALESCE(ly_d_sls_units, 0) as "LY D Sls U",
COALESCE(d_sls_units_wp_ly_var, 0) as "WP Var to LY D Sls U",
CONCAT(TO_CHAR(ROUND(COALESCE(d_sls_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY D Sls U",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_d_aur, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY D AUR",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(wp_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(op_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "OP D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_gm_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D GM $ Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_perc_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM % Var to OP",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM $ % Var to OP",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_d_gm, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY D GM $",
CONCAT(TO_CHAR(ROUND(COALESCE(ly_d_gm_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "LY D GM %",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(d_gm_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP D GM $ Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_perc_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM % Var to LY",
CONCAT(TO_CHAR(ROUND(COALESCE(d_gm_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP D GM $ % Var to LY",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(wp_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(op_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) as "OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(eop_cost_wp_op_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to OP EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_cost_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(ly_eop_cost, 0)::NUMERIC, 2), ''FM999999990.00'')) as "LY EOP $",
CONCAT(''$'', TO_CHAR(ROUND(COALESCE(eop_cost_wp_ly_var, 0)::NUMERIC, 2), ''FM999999990.00'')) as "WP Var to LY EOP $",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_cost_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY EOP $",
COALESCE(wp_eop_units, 0) as "WP EOP U",
COALESCE(op_eop_units, 0) as "OP EOP U",
COALESCE(eop_units_wp_op_var, 0) as "WP Var to OP EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_units_wp_op_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to OP EOP U",
COALESCE(ly_eop_units, 0) as "LY EOP U",
COALESCE(eop_units_wp_ly_var, 0) as "WP Var to LY EOP U",
CONCAT(TO_CHAR(ROUND(COALESCE(eop_units_wp_ly_var_perc, 0)::NUMERIC, 2), ''FM999999990.00''), ''%'') as "WP % Var to LY EOP U"

			from final_report where channel<>''Warehouse''
			; ';
			
  	END IF;
	  
	RAISE NOTICE 'final_query: %', _query_combine;
	OPEN $1 FOR execute _query_combine;
	RETURN $1;
		
	END;
	
$function$
;
