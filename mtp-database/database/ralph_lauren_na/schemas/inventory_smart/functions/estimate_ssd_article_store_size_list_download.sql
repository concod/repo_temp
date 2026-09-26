--liquibase formatted sql
--changeset liquibase:estimate_ssd_article_store_size_list_download runOnChange:true stripComments:false splitStatements:false context:Release_1_0_2 labels:MTP-65972
--comment: MTP-65972
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.estimate_ssd_article_store_size_list_download(input refcursor, jsonb, jsonb, jsonb, integer, integer, date, date);
CREATE OR REPLACE FUNCTION inventory_smart.estimate_ssd_article_store_size_list_download(input refcursor, jsonb, jsonb, jsonb, integer, integer, date, date)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text := '';
		_query_sa text := '';
		_channel text := inventory_smart.get_channel_from_input($3);
		_query_combine text := '';
		json_key text := '';
        json_value text := '';
       	filter_key text := '';
       	filter_value text := '';
        negative_inventory_oh_query text := '';
	begin
		_query_pa := inventory_smart.form_main_table_filters(
 		  'ph_master',
 		  $2
 		);
 		_query_sa := global.form_main_table_filters(
 		  'store_attributes_filter',
 		  $3
 		);
 	
 		FOR json_key, json_value IN SELECT * FROM jsonb_each($4) LOOP
	       	IF json_key = 'custom_filters' then
	       		FOR filter_key, filter_value in SELECT * FROM jsonb_each_text(json_value::jsonb) loop
		       		negative_inventory_oh_query = negative_inventory_oh_query || ' AND ' || filter_value;
	       			RAISE NOTICE 'filter_key: %, filter_value: %', filter_key, filter_value;
	       		end LOOP;
	       		EXIT;
        	end if;
    	END LOOP;
    
    	select REPLACE(negative_inventory_oh_query, 'negative_inventory_oh', '(coalesce(store_avail_oh, 0) < 0)') into negative_inventory_oh_query;

 		_query_combine := $$
			 WITH paf as materialized (
                SELECT article, color, l0_name, l1_name, l2_name, model_description, l3_name, l4_name, product_description, style_color_id, size, product_code, supersede_flag, brand, upc
                FROM global.product_attributes_filter
                $$||_query_pa||$$ and active
                order by product_code
            ),
            paf_ssd as materialized (
            	select paf.*,
            		   store_code,
            		   channel,
            		   store_status,
            		   style_color_status,
                       instock_pct,
                       instock_pct_details,
                       wos_predicted ,
                       store_avail_oh ,
                       store_in_transit,
                       oo,
                       tot_inv,
                       size_integrity,
                       lw_qty,
                       oh_dc,
                       financial_zone,
                       min_constraints,
                       max_constraints,
                       week_to_date_sales,
                       sales_1_ago,
                       sales_3_ago,
                       sales_4_ago,
                       estimated_demand,
                       capped_demand,
                       floorset_date,
                       twos
            	from paf paf
            	join inventory_smart.store_stock_drilldown ssd TABLESAMPLE SYSTEM (1)
            	on md5(ssd.article || '-' || ssd.product_code) = md5(paf.article || '-' || paf.product_code)
              	where channel = '$$||_channel||$$'
            ),
            saf as (
                SELECT store_code, channel, retail_facility_code, store_name, climate,region, special_classification, country
                FROM global.store_attributes_filter
                $$||_query_sa||$$
            ),
           ssd_data as (
          	select
          	paf.article,
          	color,
			paf.l0_name,
			paf.l1_name,
			paf.l2_name,
			paf.l3_name,
			paf.l4_name,
			paf.brand,
			paf.supersede_flag,
			store_status,
			model_description,
			case when style_color_status is not null then style_color_status
			else '-'
			end as style_color_status,
			paf.product_description,
			paf.style_color_id,
			store_code,
			channel,
			retail_facility_code,
			store_name,
			climate,
			region,
			country,
			size,
			product_code,
			financial_zone,
			upc,
			round(coalesce(sales_1_ago, 0)::numeric, 2) as one_week_ago_sales_units,
			round(coalesce(sales_3_ago, 0)::numeric, 2) as three_week_ago_sales_units,
			round(coalesce(sales_4_ago, 0)::numeric, 2) as four_week_ago_sales_units,
			round(coalesce(week_to_date_sales, 0)::numeric, 2) as week_to_date_sales_units,
			round(coalesce(twos, 0)::numeric, 2) as twos,
			round(coalesce(min_constraints, 0)::numeric, 2) as min_constraints,
			round(coalesce(max_constraints, 0)::numeric, 2) as max_constraints,
			round(coalesce(capped_demand, 0)::numeric, 2) as capped_demand,
			round(coalesce(estimated_demand, 0)::numeric, 2) as estimated_demand,
			case
    			when (oo + store_avail_oh + store_in_transit) = 0 then 0
    			else round((coalesce(min_constraints, 0) / nullif(coalesce(store_avail_oh, 0) + coalesce(store_in_transit, 0) + coalesce(oo, 0), 0))::numeric, 2)
			end as min_supply_ratio,
			case
				when coalesce(store_avail_oh, 0) = 0 then 0
				else round((coalesce(min_constraints, 0)/store_avail_oh)::numeric, 2)
			end as min_stock_ratio,
			round(coalesce(instock_pct_details, 0)::numeric, 2) as instock_pct_details,
			ROUND(coalesce(wos_predicted, 0)::numeric, 2) as wos_predicted,
			coalesce(tot_inv,0) as tot_inv,
			coalesce(store_avail_oh, 0) as oh,
			coalesce(store_in_transit, 0) as it,
			coalesce(oo,0) as oo,
			ROUND(coalesce(size_integrity::numeric, 0)*100, 2) as size_integrity,
			coalesce(lw_qty,0) as lw_qty,
			case WHEN coalesce(store_avail_oh, 0) < 0 THEN True ELSE False end as negative_inventory_oh
			from paf_ssd paf
			join saf using (store_code, channel)
			where special_classification != 'WHS'
			$$||negative_inventory_oh_query||$$
           )
		    select count(*)*100 as total_count from ssd_data;
		    $$;
		raise notice ' %', _query_combine;
		open $1 for execute _query_combine;
    	RETURN $1;	
	END;
$function$
;