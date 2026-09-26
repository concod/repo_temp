--liquibase formatted sql
--changeset liquibase:details_metric runOnChange:true stripComments:false splitStatements:false context:MTP-31185  labels:MTP-31185
--comment: MTP-31185-round-off-2
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb, jsonb, character varying[]);
CREATE OR REPLACE FUNCTION inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb, jsonb, character varying[])
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /*
 
 begin;
 
 select
 	*
 from
 inventory_smart.details_metric('my_cur',
 '{"l0_name": [{"operator": "in", "type": "list", "values": ["Home"]}], "l1_name": [{"operator": "in", "type": "list", "values": ["Home"]}], "color": [{"operator": "not in", "type": "list", "values": ["2ND"]}], "article_status_tag": [{"operator": "not in", "type": "list", "values": ["Old"]}]}',
 '{"channel": [{"operator": "in", "type": "list", "values": ["Full Line Retail"]}, {"operator": "not in", "type": "list", "values": ["Ecom", "Wholesale", "Online_Outlet", "Web", "Specialty", "Amazon", "Key_Account"]}]}',
 '{"search": [], "sort": [], "range": [], "limit": null}');
 
 fetch all in "my_cur";
 
 commit;
 
  */
  declare
  	_query_pa text := '';
  	_query_sa text := '';
  	_query_table_filters text := '';
  	_query_combine text := '';
  	_channel text := inventory_smart.get_channel_from_input($3);
  	_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);
  	_cache_table_id text;
  	_cache_schema text := 'inventory_smart';
  	_cache_sp text := '.details_metric';
  	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
  	_cache_dependencies text[] := '{inventory_smart.article_inventory_dashboard}';
  begin
  	$2 := $2 || jsonb_build_object('channel',  $3->>'channel');
  	_query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
  --	_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
  	_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
  	raise notice ' % ',  _query_sa;
  	_query_combine := '
  	  with 
  		ph_data as (
  			select * from inventory_smart.ph_master
  			' || _query_pa || '
  		), 
  		store_groups as (
  		  select 
  		    acm.article, 
  		    ARRAY_AGG(name) store_groups 
  		  from 
  		    (
  		      select 
  		        article, 
  		        channel, 
  		        unnest(default_store_groups) sg_code 
  		      from 
  		        ph_data ph
  		        join inventory_smart.ph_configuration_mapping acm using(ph_code, channel) 
  		    ) as acm 
  		    join global.store_groups sg using(sg_code) 
  		  group by 
  		    1
  		), 
  		allocated as (
  		  select 
  		    ph.article, 
  		    sum(
  		      case when type = ''oh'' then quantity else 0 end
  		    ) as allocated_oh, 
  		    sum(
  		      case when type = ''it'' then quantity else 0 end
  		    ) as allocated_it, 
  		    max(drq.updated_at) as allocated_time 
  		  from 
  		--    product_master_filters_data pmfd 
  		  	ph_data ph
  		    join global.product_mapping_product_dc pmpd -- to be reviewed and removed
  		    on pmpd.product_code = any(ph.product_codes)
  		    join inventory_smart.dc_reserve_quantity drq on pmpd.product_code = drq.product_code and pmpd.dc_code = drq.dc_code
  
  		  group by 
  		    1
  		)
  		--select * from allocated
  		, 
  		metric_table as (
  		  select 
  		    ad.article, 
  			
  		    ROUND(
  		      SUM(lw_qty):: numeric, 
  		      2
  		    ) as lw_qty, 
  		    ROUND(
  		      SUM(lw_revenue):: numeric, 
  		      2
  		    ) lw_revenue, 
  		    ROUND(
  		      SUM(lw_margin):: numeric, 
  		      2
  		    ) lw_margin, 
  		    ROUND(
  		      (
  --		        SUM(
  --		          (
  --		            case when lw_qty > 0 then lw_qty else 0 end
  --		          ) * promo_percentage
  --		        ) / SUM(
  --		          case when lw_qty > 0 then lw_qty else null end
  --		        )
  				avg(case when sid.store_code not like ''%STB%'' then promo_percentage else null end)
  		      ):: numeric, 
  		      2
  		    ):: text promo, 
  		    ROUND(
  		      (
  		        SUM(lw_revenue) / nullif(
  		          SUM(lw_qty), 
  		          0
  		        )
  		      ):: numeric, 
  		      2
  		    ) price, 
			-- When ∑wos*tot_inv=0 and denominator =0 then wos at style color should be 0
			-- When ∑wos*tot_inv>0 and denominator =0 then wos at style color should be 52
			-- When ∑wos*tot_inv<0 and denominator =0 then wos at style color should be 0
  		    LEAST( 
          		CASE
					WHEN sum(case when sid.store_code not like ''%STB%'' then (oo+it+oh) else 0 end) != 0 THEN
						ROUND(
						(
							sum(case when sid.store_code not like ''%STB%'' then wos * (oo+it+oh) else 0 end)/
							sum(case when sid.store_code not like ''%STB%'' then (oo+it+oh) else 0 end)
						):: numeric, 1)
            		WHEN sum(case when sid.store_code not like ''%STB%'' then wos * (oo+it+oh) else 0 end) <= 0 THEN 0
            		ELSE 52.0
          		END, 52.0
			) :: text wos, 
  		    ROUND(
  		      (
  		        AVG(
  --		          case when saf.special_classification = ''Outlet'' then si else null end
  				case when sid.store_code = ''STB'' then null else si end
  		        ) 
  			--	* 100
  		      ):: numeric, 
  		      2
  		    ):: text si, 
  		    coalesce(
  		      ROUND(
  		        sum(
  	--	          case when saf.special_classification = ''WHS'' then oh_dc else 0 end
  				  case when sid.store_code = ''STB'' then oh else 0 end
  		        ):: numeric, 
  		        2
  		      ), 
  		      0
  		    ) bulk_remaining, 
 		    coalesce(
 		      ROUND(
 		        sum(
 				  case when sid.store_code = ''STB'' then available_to_allocate else 0 end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) available_to_allocate, 
 			coalesce(
 		      ROUND(
 		        SUM(
 				  case when sid.store_code = ''STB'' then 0 else sales_1_ago end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) sales_1_ago, 
 		    coalesce(
 		      ROUND(
 		        SUM(
 				  case when sid.store_code = ''STB'' then 0 else sales_2_ago end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) sales_2_ago, 
 		    coalesce(
 		      ROUND(
 		        SUM(
 				  case when sid.store_code = ''STB'' then 0 else sales_3_ago end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) sales_3_ago, 
 		   coalesce(
 		      ROUND(
 		        SUM(
 				  case when sid.store_code = ''STB'' then 0 else sales_4_ago end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) sales_4_ago, 
			coalesce(
 		      ROUND(
 		        SUM(
 				  case when sid.store_code = ''STB'' then 0 else sales_revenue_1_ago end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) sales_revenue_1_ago, 
 		    coalesce(
 		      ROUND(
 		        SUM(
 				  case when sid.store_code = ''STB'' then 0 else sales_revenue_2_ago end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) sales_revenue_2_ago, 
 		    coalesce(
 		      ROUND(
 		        SUM(
 				  case when sid.store_code = ''STB'' then 0 else sales_revenue_3_ago end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) sales_revenue_3_ago, 
 		   coalesce(
 		      ROUND(
 		        SUM(
 				  case when sid.store_code = ''STB'' then 0 else sales_revenue_4_ago end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) sales_revenue_4_ago,
 		   coalesce(
 		      ROUND(
 		        SUM(
 				  case when sid.store_code = ''STB'' then dc_oh_1 else 0 end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) dc_oh_1, 
 		     coalesce(
 		      ROUND(
 		        SUM(
 				  case when sid.store_code = ''STB'' then dc_oh_qcloc else 0 end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) dc_oh_qcloc, 
 		    coalesce(
 		      ROUND(
 		        SUM(
 				  case when sid.store_code = ''STB'' then dc_oh_cwc else 0 end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) dc_oh_cwc, 
 		     coalesce(
 		      ROUND(
 		        SUM(
 				  case when sid.store_code = ''STB'' then dc_oh_10 else 0 end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) dc_oh_10, 
 		     coalesce(
 		      ROUND(
 		        SUM(
 				  case when sid.store_code = ''STB'' then oo_dc else 0 end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) oo_dc, 
 		     coalesce(
 		      ROUND(
 		        SUM(
 				  case when sid.store_code = ''STB'' then it_dc else 0 end
 		        ):: numeric, 
 		        2
 		      ), 
 		      0
 		    ) it_dc, 
  		    coalesce(
  		      ROUND(
  		        SUM(
  --		          case when saf.special_classification = ''WHS'' then it_dc else 0 end
  				  case when sid.store_code = ''STB'' then it else 0 end
  		        ):: numeric, 
  		        2
  		      ), 
  		      0
  		    ) bulk_remaining_intransit, 
  		    ROUND(
  		      SUM(
  --		        case when saf.special_classification = ''Outlet'' then oh else 0 end
  				case when sid.store_code = ''STB'' then 0 else oh end
  		      ):: numeric, 
  		      2
  		    ) oh, 
  		    ROUND(
  		      SUM(
  --		        case when saf.special_classification = ''Outlet'' then oo else 0 end
  				case when sid.store_code = ''STB'' then 0 else oo end
  		      ):: numeric, 
  		      2
  		    ) oo, 
  		    ROUND(
  		      SUM(
  --		        case when saf.special_classification = ''Outlet'' then it else 0 end
  				case when sid.store_code = ''STB'' then 0 else it end
  		      ):: numeric, 
  		      2
  		    ) it, 
  		    ROUND(
  		      SUM(stockout):: numeric, 
  		      2
  		    ) stockout, 
  		    ROUND(
  		      SUM(shortfall):: numeric, 
  		      2
  		    ) shortfall, 
  		    ROUND(
  		      SUM(normal):: numeric, 
  		      2
  		    ) normal, 
  		    ROUND(
  		      SUM(excess):: numeric, 
  		      2
  		    ) excess,
  		    coalesce(sum(week_to_date_sales), 0) as week_to_date_sales, 
  			coalesce(sum(last_day_sales), 0) as last_day_sales, 
			round(coalesce(sum(week_to_date_sales_revenue), 0)::numeric, 2) as week_to_date_sales_revenue,
			round(coalesce(sum(last_day_sales_revenue), 0)::numeric, 2) as last_day_sales_revenue,
  			round( coalesce (avg(available_stores_percentage) * 100, 0)::decimal, 2) as available_stores_perc
   
  		  from 
  		    ph_data ad 
  		    join inventory_smart.article_inventory_dashboard sid using(article,channel)
  		    --join global.store_attributes_filter saf using(store_code, channel) 
  			join (select * from global.store_attributes_filter ' || _query_sa || ' or store_code=''STB'') saf using(store_code) 
  		  group by 
  		    ad.article
  		)
  		--select * from metric_table
  		, 
		dc_pack_config as (
			select ph.article, 
			array_agg(dpc.parent_article) parent_article, 
			array_agg(dpc.pack_description) pack_description 
			from ph_data ph
			left join inventory_smart.dc_pack_configuration dpc on dpc.article = ph.article
			group by ph.article
		)
  		,final_result as (
  		  select
			dpc.parent_article, dpc.pack_description, 
  			ph.ph_code,
  		    ph.l0_name, 
  		    ph.l1_name, 
  		    ph.l2_name, 
  		    ph.l3_name, 
  		--    ph.l4_name, 
  		    ph.style, 
  		    ph.article, 
  		    ph.style_description, 
  		    ph.color, 
  		    ph.color_code, 
  		   -- ph.human_readable_color, 
  		   	to_char(ph.launch_date,''YYYY-MM-DD'') as launch_date, 
  		--    ph.assortment_indicator, 
  		--    ph.factory_type, 
  		--	ph.merchant_pyramid,
  		    ph.article_status_tag, 
  			ph.sub_class,
  			to_char(ph.selldown_date,''YYYY-MM-DD'') as selldown_date,
  			to_char(ph.clearance_start_date,''YYYY-MM-DD'') as clearance_start_date,
  			to_char(ph.retirement_date,''YYYY-MM-DD'') as retirement_date,
  		    allocated_time, 
  		    store_groups, 
  		    lw_qty, 
  		    lw_revenue, 
  		    lw_margin, 
  		    promo, 
  		    price, 
  		    wos, 
  		    si, 
  		    bulk_remaining, 
  		    bulk_remaining_intransit, 
 			available_to_allocate,
 		    sales_1_ago,
 		    sales_2_ago,
 		    sales_3_ago,
 		    sales_4_ago,
			sales_revenue_1_ago,
 		    sales_revenue_2_ago,
 		    sales_revenue_3_ago,
 		    sales_revenue_4_ago,
 		    dc_oh_1,
 		    dc_oh_qcloc,
 		    dc_oh_cwc,
 		    dc_oh_10,
 			oo_dc,
 			it_dc,
  		    oh, 
  		    oo, 
  		    it, 
  		    stockout, 
  		    shortfall, 
  		    normal, 
  		    excess ,
  		    available_stores_perc,
  			week_to_date_sales,
  			last_day_sales,
			week_to_date_sales_revenue,
  			last_day_sales_revenue,
  		    coalesce(u.factor, 1) as case_pack_qty
  		  from 
  		    ph_data ph 
  		--    left 
  			join metric_table mt on ph.article = mt.article
  			
  		    left join allocated al on ph.article = al.article 
  		    left join store_groups sg on ph.article = sg.article 
  			left join inventory_smart.uom u on ph.style = u.item_id
		--	left join inventory_smart.sku_dc_available_units avu on ph.ph_code = avu.ph_code 
			left join dc_pack_config dpc on ph.article = dpc.article
  		  where 
  			available_to_allocate > 0
  			order by lw_qty desc
  		--    (
  		--      bulk_remaining - coalesce(allocated_oh, 0)
  		--    ) > 0 
  		--    or (
  		--      bulk_remaining_intransit - coalesce(allocated_it, 0)
  		--    ) > 0
  		)
  		select * from final_result ';
  		raise notice '%',_query_combine; 
  		select * from cache.wrap_sp(
  			_cache_schema,
  			_cache_sp,
  			_cache_payload,
  			_query_combine,
  			_cache_dependencies,
  			_cache_key_pattern) into _cache_table_id;
  		_query_table_filters := global.form_table_query($5);
  		perform set_config('myvars.cache_table_id', _cache_table_id, true);
  		-- raise notice '%', 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
  		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
  		RETURN $1;
  	end
  $function$
;
