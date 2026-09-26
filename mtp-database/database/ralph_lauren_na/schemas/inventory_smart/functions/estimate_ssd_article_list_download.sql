--liquibase formatted sql
--changeset liquibase:estimate_ssd_article_list_download runOnChange:true stripComments:false splitStatements:false context:Release_1_0_2 labels:MTP-65972
--comment: MTP-65972
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.estimate_ssd_article_list_download(input refcursor, jsonb, jsonb, jsonb, integer, integer, date, date);
CREATE OR REPLACE FUNCTION inventory_smart.estimate_ssd_article_list_download(input refcursor, jsonb, jsonb, jsonb, integer, integer, date, date)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare 
		_query_pa text := '';
		_query_sa text := '';
		_channel text := inventory_smart.get_channel_from_input($3);
		_query_combine_format text := '';

	begin
		_query_pa := inventory_smart.form_main_table_filters(
 		  			'ph_master',
 		  			$2
 					);

		_query_sa := global.form_main_table_filters(
 		  			'store_attributes_filter',
 		  			$3
 					);
		_query_combine_format := $$
            WITH paf as (
                SELECT article, product_description, color, model_description, style_color_id, l0_name, l1_name, l2_name, l3_name, l4_name, brand, supersede_flag, clearance, string_agg(article_status_tag, ', ') as article_status_tag
                FROM inventory_smart.ph_master pm
                $$||_query_pa||$$ and channel = '$$||_channel||$$'
                group by 1,2,3,4,5,6,7,8,9,10,11,12,13
                order by article
            ),
            aid as (
          		select 
          			article, store_code, channel, oh, oo, it, store_level_prediction, si, style_color_status, tot_inv, special_classification, lw_qty, min_constraints, max_constraints, sales_1_ago, sales_3_ago, sales_4_ago, week_to_date_sales, capped_demand, estimated_demand, twos, instock_pct, floorset_date
            	from inventory_smart.article_inventory_dashboard aid TABLESAMPLE SYSTEM (1)
            	join global.store_attributes_filter using(store_code, channel)
            	$$||_query_sa||$$
            ),
            ssd_aggregated_data as(
            	select
            		article,
            		style_color_status,
            		channel,
            		special_classification,
            		round(sum(coalesce(sales_1_ago, 0))::numeric, 2) as one_week_ago_sales_units,
					round(sum(coalesce(sales_3_ago, 0))::numeric, 2) as three_week_ago_sales_units,
					round(sum(coalesce(sales_4_ago, 0))::numeric, 2) as four_week_ago_sales_units,
					round(sum(coalesce(week_to_date_sales, 0))::numeric, 2) as week_to_date_sales_units,
					round(avg(coalesce(twos, 0))::numeric, 2) as twos,
					round(sum(coalesce(capped_demand, 0))::numeric, 2) as capped_demand,
					round(sum(coalesce(estimated_demand, 0))::numeric, 2) as estimated_demand,
					min(floorset_date) as floorset_date,
					count(store_code) as store_count,
					case
    					when sum(oo+oh+it) = 0 then 0
    					else round((sum(coalesce(min_constraints, 0)) / nullif(sum(oo+oh+it), 0))::numeric, 2)
					end as min_supply_ratio,
					case 
						when sum(oh) = 0 then 0
						else round((sum(coalesce(min_constraints, 0))/sum(oh))::numeric, 2)
					end as min_stock_ratio,
					sum(coalesce(tot_inv,0)) as tot_inv,
					round(sum(coalesce(min_constraints, 0))::numeric, 2) as min_constraints,
					round(sum(coalesce(max_constraints, 0))::numeric, 2) as max_constraints,
					round(coalesce(avg(instock_pct)*100, 0)::numeric, 2) as instock_pct,
					ROUND(coalesce(SUM((case when aid.special_classification = 'Outlet' then oh + oo + it else 0 end)) / SUM(case when aid.special_classification = 'Outlet' then store_level_prediction end ), 0):: numeric, 1):: text wos_predicted, 
					sum(coalesce(oh, 0)) as oh,
					sum(coalesce(it, 0)) as it,
					sum(coalesce(oo,0)) as oo,
					ROUND(coalesce(AVG(case when aid.special_classification = 'Outlet' then si else null end), 0):: numeric, 2):: numeric size_integrity,
					sum(coalesce(aid.lw_qty,0)) as lw_qty
				from aid
				where special_classification != 'WHS'
				group by 1, 2, 3, 4
            ),
            ssd_data as (
          		select 
          			paf.article, 
          			color,
          			case when clearance = true then 'True' else 'False' end as clearance, 
					l0_name,
					l1_name,
					l2_name,
					l3_name,
					l4_name,
					brand,
					paf.product_description,
					paf.style_color_id,
					paf.supersede_flag,
					model_description,
					channel,
					case when style_color_status is not null then style_color_status
					else '-'
					end as style_color_status,
					article_status_tag,
					one_week_ago_sales_units,
					three_week_ago_sales_units,
					four_week_ago_sales_units,
					week_to_date_sales_units,
					twos,
					capped_demand,
					estimated_demand,
					floorset_date,
					store_count,
					min_supply_ratio,
					min_stock_ratio,
					min_constraints,
					max_constraints,
					instock_pct,
					tot_inv,
					wos_predicted,
					oh,
					it,
					oo,
					size_integrity,
					lw_qty
				from ssd_aggregated_data
				join paf using(article)
				where special_classification != 'WHS'
				order by article
			)
      		select count(*)*100 as total_count from ssd_data;
      		$$;
		raise notice ' %', _query_combine_format;
		open $1 for execute _query_combine_format;
    	RETURN $1;
	end;
	$function$
;