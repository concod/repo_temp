--liquibase formatted sql
--changeset liquibase:estimate_dc_availability_list_download runOnChange:true stripComments:false splitStatements:false context:Release_1_0_3 labels:MTP-65972
--comment: MTP-65972
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.estimate_dc_availability_list_download(input refcursor, jsonb, jsonb, jsonb, integer, integer, date, date);
CREATE OR REPLACE FUNCTION inventory_smart.estimate_dc_availability_list_download(input refcursor, jsonb, jsonb, jsonb, integer, integer, date, date)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text := '';
		_query_sa text := '';
		_channel text := inventory_smart.get_channel_from_input($3);
		_query_combine text := '';
	begin
		_query_pa := global.form_main_table_filters(
 		  'product_attributes_filter',
 		  $2
 		);
 		_query_sa := global.form_main_table_filters(
 		  'store_attributes_filter',
 		  $3
 		);
 		_query_combine := $$
 			WITH paf as materialized(
                SELECT article, product_description, model_description, style_color_id, brand, size, size_name, style, l1_name, l2_name, l3_name, l4_name, l1_id, l2_id, l3_id, l4_id, product_code,supersede_flag, source_code               
                FROM global.product_attributes_filter
                $$||_query_pa||$$ and active
            ),
            saf as materialized (
                SELECT store_code, channel, country, special_classification FROM global.store_attributes_filter
                $$||_query_sa||$$ and active
            ),
			ssd_fdata as materialized(
				select 
                    product_code,
                    country,
                    dc_code,
                    round(coalesce(instock_pct::NUMERIC, 0), 2) as instock_pct,
                    round(coalesce(instock_pct_details::NUMERIC, 0), 2) as instock_pct_details
                from
                inventory_smart.store_stock_drilldown ssd
                join "global".store_attributes_filter using(store_code)
                where product_code in (select product_code from paf)
                and special_classification = 'WHS'
                and ssd.channel = '$$|| _channel ||$$'
            ),
            store_on_hand as (
             	select product_code, article, saf.channel, size, sum(li.oh) as oh
                from saf
                join inventory_smart.latest_inventory li TABLESAMPLE SYSTEM (1) using(store_code, channel)
                join paf using(product_code)
                where special_classification != 'WHS'
                group by 1,2,3,4
            ),
            store_on_hand_data as (
            	select
            	l1_name,
            	l2_name,
            	l3_name,
            	l4_name,
            	l1_id,
            	l2_id,
            	l3_id,
            	l4_id,
            	soh.size,
            	source_code as source,
            	size_name,
            	brand,
            	style_color_id,
            	product_description,
				model_description,
            	paf.article,
            	style,
            	channel,
            	soh.product_code,
            	supersede_flag,
            	soh.oh
            	from store_on_hand soh
            	join paf using(product_code)
            ),
            dc_data_latest as (
            	SELECT 
            		article, 
            		product_code,
            		dc_code,
            		dc.name as dc_name,
            		sum(oh) as dc_oh
            		FROM 
            		global.distribution_centres dc
            		join inventory_smart.sku_dc_available_units('{}', (SELECT ARRAY_AGG(distinct article) FROM paf)) sdau using(dc_code)
            		where channel =  '$$|| _channel ||$$'
            		group by 1,2,3,4
            ),
            final_result_initial as (
            	select
            		sohd.*,
            		dc_code,
            		dc_name,
            		dc_oh
            		from store_on_hand_data sohd
            		join dc_data_latest using(article, product_code)
			)
 			select count(*)*100 as total_count from final_result_initial;
		   $$;
		raise notice ' %', _query_combine;
		open $1 for execute _query_combine;
    	RETURN $1;
	END;
$function$
;