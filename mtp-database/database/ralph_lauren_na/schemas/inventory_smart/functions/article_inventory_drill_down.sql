--liquibase formatted sql
--changeset shreyan.haldankar:article_selection_list runOnChange:true stripComments:false splitStatements:false context:MTP-66762 labels:MTP-66762-2
--comment: MTP-66762: Make the SP cursor based fix
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.article_inventory_drill_down(character varying, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.article_inventory_drill_down(input refcursor, character varying, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
  /* 
   * Function/Procedure name: inventory_smart.article_inventory_drill_down
   * Created by: Renugopal S
   * Created at: 28-05-2023
   * No of input parameter: 2
   * Parameter Description : 1 = article
   *                         2 = All filters, we only use channel
  
   * Purpose: 
   * This function is created to find the drill down of article inventory dashboard
   * Screen = Dashboard - AID
   * Calling Statement:  
		select
			*
		from
			inventory_smart.article_inventory_drill_down('24946-N10',
			'{"channel": [{"type":"list", "operator":"in", "values": ["Factory Line Retail"]}]}');
   *
   *
   * if any modification done in same function/procedure please record the changes in below format
   *
   * Updated_by       Updated_on      Purpose
   * ----------       -----------     --------
   *
   */
  declare
	_query_combine text:= '';
	  
	_channel text := inventory_smart.get_channel_from_input($3);

     begin
  
  		_query_combine := '
			select
				article,
				channel,
				store_code,
				store_name,
				size,
				is_dc,
        --        coalesce(available_to_allocate,0)::integer as available_to_allocate,
                coalesce(sum(oh), 0)::integer as oh,
                coalesce(sum(it), 0)::integer as it,
                coalesce(sum(oo), 0)::integer as oo,
                coalesce(sum(lw_qty), 0)::integer as lw_qty,
                round(coalesce(sum(lw_revenue), 0)::decimal,2) as lw_revenue,
                round(coalesce(sum(lw_margin), 0)::decimal,2) as lw_margin,
                coalesce(sum(week_to_date_sales), 0)::integer as week_to_date_sales,
                coalesce(sum(last_day_sales), 0)::integer as last_day_sales,
                coalesce(sum(sales_1_ago), 0)::integer as sales_1_ago,
                coalesce(sum(sales_2_ago), 0)::integer as sales_2_ago,
                coalesce(sum(sales_3_ago), 0)::integer as sales_3_ago,
                coalesce(sum(sales_4_ago), 0)::integer as sales_4_ago,
				coalesce(sum(sales_5_ago), 0)::integer as sales_5_ago,
                coalesce(sum(sales_6_ago), 0)::integer as sales_6_ago,
                coalesce(sum(sales_7_ago), 0)::integer as sales_7_ago,
                coalesce(sum(sales_8_ago), 0)::integer as sales_8_ago,
		--		round(coalesce(sum(week_to_date_sales_revenue), 0)::decimal, 2) as week_to_date_sales_revenue,
		--		round(coalesce(sum(last_day_sales_revenue), 0)::decimal, 2) as last_day_sales_revenue,
		--		round(coalesce(sum(sales_revenue_1_ago), 0)::decimal, 2) as sales_revenue_1_ago,
		--		round(coalesce(sum(sales_revenue_2_ago), 0)::decimal, 2) as sales_revenue_2_ago,
		--		round(coalesce(sum(sales_revenue_3_ago), 0)::decimal, 2) as sales_revenue_3_ago,
		--		round(coalesce(sum(sales_revenue_4_ago), 0)::decimal, 2) as sales_revenue_4_ago,
         --       coalesce(sum(dc_oh_1), 0)::integer as dc_oh_1,
         --       coalesce(sum(dc_oh_qcloc), 0)::integer as dc_oh_qcloc,
         --       coalesce(sum(dc_oh_cwc), 0)::integer as dc_oh_cwc,
				coalesce(sum(oh_dc), 0)::integer as oo_dc,
                coalesce(sum(oo_dc), 0)::integer as oo_dc,
                coalesce(sum(it_dc), 0)::integer as it_dc,
                order_num::bigint
			from
				(
				select
					paf.article,
					paf.size,
					store_name,
					saf.retail_facility_code as store_code,
					ssd.channel,
					ssd.store_avail_oh as oh,
					ssd.store_in_transit as it,
					ssd.oo as oo,
					ssd.lw_qty,
					ssd.lw_revenue,
					ssd.lw_margin,
					ssd.week_to_date_sales,
					ssd.last_day_sales,
					ssd.sales_1_ago,
					ssd.sales_2_ago,
					ssd.sales_3_ago,
					ssd.sales_4_ago,
					ssd.sales_5_ago,
					ssd.sales_6_ago,
					ssd.sales_7_ago,
					ssd.sales_8_ago,
			--		aid.week_to_date_sales_revenue,
			--		aid.last_day_sales_revenue,
			--		ssd.sales_revenue_1_ago,
			--		ssd.sales_revenue_2_ago,
			--		ssd.sales_revenue_3_ago,
			--		ssd.sales_revenue_4_ago,
			--		ssd.available_to_allocate,
			--		ssd.dc_oh_1,
			--		ssd.dc_oh_qcloc,
			--		ssd.dc_oh_cwc,
					ssd.oh_dc,
					ssd.oo_dc,
					ssd.it_dc,
					ast.order as order_num,
				case when ssd.store_code in (select linked_store_code from global.distribution_centres) then true else false end as is_dc
				from
					inventory_smart.store_stock_drilldown ssd
				 join global.product_attributes_filter paf
						using(product_code, article)
				LEFT JOIN inventory_smart.article_status_tag ast USING (product_code, channel)
				left join "global".store_attributes_filter saf
					using(store_code, channel) --left to allow dc also to come
			--	join inventory_smart.article_inventory_dashboard aid using(article, store_code, channel)
				where 
					paf.article = '''||$2||'''  and
					ssd.channel = '''|| replace(_channel, '%', '%%') ||'''
					) a
			group by
				article,
				channel,
				store_code,
				store_name,
				size,
				is_dc,
				order_num
              -- ,available_to_allocate
			ORDER BY
				order_num;
			';
  			raise notice '%', _query_combine;
  		-- RETURN QUERY execute _query_combine;	
		open $1 for execute _query_combine;
		RETURN $1;
        end
  $function$
;
