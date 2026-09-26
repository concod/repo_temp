--liquibase formatted sql
--changeset liquibase:estimate_lost_sales_article_store_size_list_download runOnChange:true stripComments:false splitStatements:false context:Release_1_0_1 labels:MTP-65972
--comment: MTP-65972
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.estimate_lost_sales_article_store_size_list_download(input refcursor, jsonb, jsonb, jsonb, integer, integer, date, date);
CREATE OR REPLACE FUNCTION inventory_smart.estimate_lost_sales_article_store_size_list_download(input refcursor, jsonb, jsonb, jsonb, integer, integer, date, date)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text := '';
		_query_sa text := '';
		_channel text := inventory_smart.get_channel_from_input($3);
		_query_combine text := '';
		_fiscal_year_week int;
	begin
		_query_pa := global.form_main_table_filters(
 		  'product_attributes_filter',
 		  $2
 		);
 		_query_sa := global.form_main_table_filters(
 		  'store_attributes_filter',
 		  $3
 		);
 		SELECT (CAST($6 AS TEXT) || LPAD(CAST($5 AS TEXT), 2, '0'))::INTEGER into _fiscal_year_week;
 		_query_combine := $$
			WITH paf as materialized (
                SELECT article, product_description, color, model_description, style_color_id, size, product_code, brand, supersede_flag, l0_name, l1_name, l2_name, l3_name, l4_name
                FROM global.product_attributes_filter
                $$||_query_pa||$$
            ),
            saf as materialized (
                SELECT store_code, store_name, retail_facility_code, currency_cd FROM global.store_attributes_filter
                $$||_query_sa||$$ and special_classification != 'WHS'
            ),
            lost_sales_aggregated as(
            	select
            		paf.product_code,
            		store_code,
            		ROUND(COALESCE(SUM(lost_sales), 0)::numeric, 2) lost_sales,
					ROUND(COALESCE(SUM(lost_units), 0)::numeric, 2) lost_units,
					ROUND(COALESCE(SUM(wos_pred), 0)::numeric, 2) wos_pred,
					ROUND(COALESCE(SUM(opening_inventory), 0)::numeric, 2) week_open_balance,
					ROUND(COALESCE(SUM(quantity), 2)::numeric, 2) total_quantity,
					ROUND(COALESCE(AVG(cluster_avg_sales), 0)::numeric, 2) cluster_avg_sales,
					ROUND(COALESCE(SUM(line_amount), 0)::numeric, 2) line_amount
            	from inventory_smart.loss_units_sku_store_level lu TABLESAMPLE SYSTEM (1)
            	join paf ON paf.product_code = lu.product_code
				JOIN saf USING(store_code)
				where fiscal_year_week = $$||_fiscal_year_week||$$
				group by 1, 2		
            ),
			lost_sales_data as (
				SELECT
					article,
					size,
					l0_name,
					l1_name,
					l2_name,
					l3_name,
					l4_name,
					model_description,
					lsa.store_code,
					$$||$6||$$ as fiscal_year,
					$$||$5||$$ as fiscal_week,
					product_description,
					color,
					style_color_id,
					brand,
					supersede_flag,
					retail_facility_code,
					saf.store_name,
					saf.currency_cd,
					lsa.product_code,
					concat(article,'-',lsa.store_code,'-',size) as key,
					lost_sales,
					lost_units,
					wos_pred,
					week_open_balance,
					total_quantity,
					cluster_avg_sales,
					line_amount
				FROM lost_sales_aggregated lsa
				join paf ON paf.product_code = lsa.product_code 
				JOIN saf USING(store_code)
			)
			SELECT count(*)*100 as total_count FROM lost_sales_data;
			$$;
	raise notice ' %', _query_combine;
	open $1 for execute _query_combine;
    RETURN $1;
	END;
$function$
;