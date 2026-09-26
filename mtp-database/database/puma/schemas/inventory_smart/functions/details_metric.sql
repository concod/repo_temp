--liquibase formatted sql
--changeset liquibase:details_metric runOnChange:true stripComments:false splitStatements:false context:puma-test labels:liquibase_project_start
--comment: initial changeset for details_metric - puma -test
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb, jsonb, character varying[])
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
  /*
   * 
   * Article Inventory Dashboard -SP
   * -------------------------
   * 
   * Dashboard Details table
   * 
   * Inputs :-
   * -------
   * $1 - refcursor
   * $2 - product attributes
   * $3 - store attributes
   * $4 - dc filter
   * $4 - table - search sort limit
   * 
   * SP Call :-
   * ---------
    	begin;
   	select * from inventory_smart.details_metric
   	    ('my_cur',
  		'{"l0_name": [{"operator": "in", "type": "list", "values": ["Accessories"]}], "l1_name": [{"operator": "in", "type": "list", "values": ["Infant"]}], "l2_name": [{"operator": "in", "type": "list", "values": ["***", "ACHT", "ACKK", "ACMK", "ACMS", "ACWK", "AKID", "AMBT", "AMLJ", "AMNW", "AMPT", "AMSH", "AMTT", "AWBS", "AWSH", "Basketball", "CUBG", "CUBL", "CUHB", "CUNW", "CUSA", "CUSG", "CUWA", "Ecosphere", "Esports", "Fundamentals", "FUNW", "FWRN", "Golf", "Licensing", "Lifestyle", "Motorsport", "Other Business", "Running", "Run/Train", "Sportstyle Core", "Sportstyle Core / Kids", "Sportstyle Kids", "Sportstyle Prime / Select", "Swimwear", "Teamsport", "Training & Fitness", "Tretorn Fundamentals", "Tretorn Lifestyle", "Tretorn Outdoor", "Undefined"]}], "article_status_tag": [{"operator": "not in", "type": "list", "values": ["Old"]}]}',
  		'{"channel": [{"operator": "in", "type": "list", "values": ["Outlet"]}, {"operator": "not in", "type": "list", "values": ["WHS"]}]}',
  		'{"dc_code": [{"operator": "in", "type": "list", "values": [92,96]}]}',
   	    '{"search": [], "sort": [], "range": [], "limit": null}');
   	 FETCH ALL IN "my_cur";
   	commit;
   	
   */
   declare
   	_query_pa text := '';
   	_query_sa text := '';
  	_query_dc text := '';
   	_query_table_filters text := '';
   	_query_combine text := '';
   	_channel text := inventory_smart.get_channel_from_input($3);
   	--cache attributes :- 
   	_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'dc_attributes', $4);
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
   	_query_dc := global.form_main_table_filters('distribution_centres', $4);
   
   	--raise notice 'store attributes - % ',  _query_sa;
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
   		    article, 
  			date(max(drq.updated_at) AT TIME ZONE ''EST''::text) allocated_time
   		  from 
  			global.product_mapping_product_dc pmpd 
   		    join inventory_smart.sku_dc_allocations drq
   		    on pmpd.product_code = drq.product_code and pmpd.dc_code = drq.dc_code
   		  group by 
   		    1
   		)
   		--select * from allocated
  		,
  		common_cte as ( 
   			select 
  	 			ph.ph_code,
  	 		    ph.l0_name, 
  	 		    ph.l1_name, 
  	 		    ph.l2_name, 
  	 		    ph.l3_name, 
  				ph.l4_name,
  				ph.l5_name,
  				ph.product_description,
  	 		    ph.style, 
  	 		    ph.color, 
  	 		   	to_char(ph.launch_date,''YYYY-MM-DD'') as launch_date, 
  	 		    ph.article_status_tag,
  	 			sid.*
   			from 
   		 		ph_data ph 
   		    join inventory_smart.article_inventory_dashboard sid using(article)
   			join (select * from global.store_attributes_filter   ' || _query_sa || '  or channel=''WHS'') saf using(store_code) 
   		)
   		--select * from common_cte;
   		, 
   		metric_table as (
   		  select 
   		    sid.article, 
   		    sid.style,
   		    sid.ph_code,
   		    sid.l0_name, 
   		    sid.l1_name, 
   		    sid.l2_name, 
   		    sid.l3_name, 
  			sid.l4_name,
  			sid.l5_name,
  			sid.product_description,
   		    sid.color, 
   		    sid.article_status_tag,
   		    sid.launch_date,
   			
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
   		    coalesce(ROUND(
   		      (
   --		        SUM(
   --		          (
   --		            case when lw_qty > 0 then lw_qty else 0 end
   --		          ) * promo_percentage
   --		        ) / SUM(
   --		          case when lw_qty > 0 then lw_qty else null end
   --		        )
   				avg(case when sid.channel not like ''%WHS%'' then promo_percentage else null end)
   		      ):: numeric, 
   		      2
   		    ),0):: text promo, 
   		    ROUND(
   		      (
   		        SUM(lw_revenue) / nullif(
   		          SUM(lw_qty), 
   		          0
   		        )
   		      ):: numeric, 
   		      2
   		    ):: text price, 
   		    ROUND(
   		      (
   				sum((case when sid.channel not like ''%WHS%'' then wos else 0 end)*
   				(case when sid.channel not like ''%WHS%'' then (case when lw_qty>0 then lw_qty else 1 end) else null end))/
   				sum(case when sid.channel not like ''%WHS%'' then (case when lw_qty>0 then lw_qty else 1 end) else null end)
   				
   		      ):: numeric, 
   		      1
   		    ):: text wos, 
  			ROUND(
  			(
   				sum((case when sid.channel not like ''%WHS%'' then wos_predicted_oh else 0 end)*
   				(case when sid.channel not like ''%WHS%'' then (case when lw_qty>0 then lw_qty else 1 end) else null end))/
   				sum(case when sid.channel not like ''%WHS%'' then (case when lw_qty>0 then lw_qty else 1 end) else null end)
   				
   		      ):: numeric, 
   		      1
   		    ):: text wos_predicted_oh, 
  			ROUND(
  			(
   				sum((case when sid.channel not like ''%WHS%'' then wos_predicted_oh_oo else 0 end)*
   				(case when sid.channel not like ''%WHS%'' then (case when lw_qty>0 then lw_qty else 1 end) else null end))/
   				sum(case when sid.channel not like ''%WHS%'' then (case when lw_qty>0 then lw_qty else 1 end) else null end)
   				
   		      ):: numeric, 
   		      1
   		    ):: text wos_predicted_oh_oo, 
  			
   		    coalesce(ROUND(
   		      (
   		        AVG(
   --		          case when saf.special_classification = ''Outlet'' then si else null end
   				case when sid.channel = ''WHS'' then null else si end
   		        ) 
   			--	* 100
   		      ):: numeric, 
   		      2
   		    ),0):: text si, 
  			coalesce(ROUND(
   		      (
   		        AVG(
  				case when sid.channel = ''WHS'' then si_dc else null end
   		        ) 
   			--	* 100
   		      ):: numeric, 
   		      2
   		    ),0):: text si_dc, 
   		    coalesce(
   		      ROUND(
   		        sum(
   	--	          case when saf.special_classification = ''WHS'' then oh_dc else 0 end
   				  case when sid.channel = ''WHS'' then oh else 0 end
   		        ):: numeric, 
   		        2
   		      ), 
   		      0
   		    ) bulk_remaining, 
   		    coalesce(
   		      ROUND(
   		        SUM(
   --		          case when saf.special_classification = ''WHS'' then it_dc else 0 end
   				  case when sid.channel = ''WHS'' then it else 0 end
   		        ):: numeric, 
   		        2
   		      ), 
   		      0
   		    ) bulk_remaining_intransit, 
   		    ROUND(
   		      SUM(
   --		        case when saf.special_classification = ''Outlet'' then oh else 0 end
   				case when sid.channel = ''WHS'' then 0 else oh end
   		      ):: numeric, 
   		      2
   		    ) oh, 
   		    ROUND(
   		      SUM(
   --		        case when saf.special_classification = ''Outlet'' then oo else 0 end
   				case when sid.channel = ''WHS'' then 0 else oo end
   		      ):: numeric, 
   		      2
   		    ) oo, 
   		    ROUND(
   		      SUM(
   --		        case when saf.special_classification = ''Outlet'' then it else 0 end
   				case when sid.channel = ''WHS'' then 0 else it end
   		      ):: numeric, 
   		      2
   		    ) it, 
   		    ROUND(
   		      SUM(case when sid.channel = ''Outlet'' then stockout else 0 end):: numeric,
   		      2
   		    ) stockout, 
   		    ROUND(
   		      SUM(case when sid.channel = ''Outlet'' then shortfall else 0 end):: numeric, 
   		      2
   		    ) shortfall, 
   		    ROUND(
   		      SUM(case when sid.channel = ''Outlet'' then normal else 0 end):: numeric, 
   		      2
   		    ) normal, 
   		    ROUND(
   		      SUM(case when sid.channel = ''Outlet'' then excess else 0 end):: numeric, 
   		      2
   		    ) excess,
   		    coalesce(sum(week_to_date_sales), 0) as week_to_date_sales, 
   			coalesce(sum(last_day_sales), 0) as last_day_sales, 
   			round( coalesce (avg(available_stores_percentage) * 100, 0)::decimal, 2) as available_stores_perc
    
   		  from 
  			common_cte sid
   		  group by 
   		  	1,2,3,4,5,6,7,8,9,10,11,12, 13
   		)
   		--select * from metric_table
 		,store_dc as (
 			select dc.linked_store_code store_code, dc_code, "name"
  			from (select store_code, article from common_cte where channel != ''WHS'') x
 			join global.product_mapping_store_dc using (store_code)
  			join  global.distribution_centres dc using (dc_code)
  			 ' || _query_dc || ' 
  			group by 1,2,3
 		)
 		,bulk_remaining_dc_level as (
   			select article,
   					dc_code,
   					"name", 
  			 		 coalesce(
  			 		      ROUND(sum(oh):: numeric, 2), 0
  			 		    ) bulk_remaining_dc --bulk remaining at dc level
  			from common_cte 
 			join store_dc using (store_code)
  			group by 1,2,3
   		)
   		--select * from bulk_remaining_dc_level;
  		,
   		final_result as (
   		  select 
   		   	mt.article, 
   		   	dc_code,
   		   	"name",
   		    bulk_remaining_dc,
 			mt.style,
   		    mt.ph_code,
   		    mt.l0_name, 
   		    mt.l1_name, 
   		    mt.l2_name, 
   		    mt.l3_name, 
  			mt.l4_name,
  			mt.l5_name,
   		    mt.color, 
   		    mt.article_status_tag,
   		    mt.launch_date,
  			mt.product_description,
   		    
   		--    ph.l4_name, 
   		    --ph.style_description, 
   		    --ph.color_code, 
   		   -- ph.human_readable_color, 
   		--    ph.assortment_indicator, 
   		--    ph.factory_type, 
   		--	ph.merchant_pyramid,
   		--		ph.sub_class,
   		--	to_char(ph.selldown_date,''YYYY-MM-DD'') as selldown_date,
   		--	to_char(ph.clearance_start_date,''YYYY-MM-DD'') as clearance_date,
   		--	to_char(ph.retirement_date,''YYYY-MM-DD'') as retirement_date,
  
   		    allocated_time, 
   		    store_groups, 
   		    lw_qty, 
   		    lw_revenue, 
   		    lw_margin, 
   		    promo, 
   		    price, 
   		    wos,
  			wos_predicted_oh,
  			wos_predicted_oh_oo,
  			si_dc,
   		    si, 
   		    bulk_remaining, 
   		    bulk_remaining_intransit, 
   		    oh, 
   		    oo, 
   		    it, 
  			oo+oh+it as total_store_on_hand,
   		    stockout, 
   		    shortfall, 
   		    normal, 
   		    excess,
			stockout+shortfall+normal+excess as store_qty,
   		    available_stores_perc,
   			week_to_date_sales,
   			last_day_sales,
   		    coalesce(u.factor, 1) as case_pack_qty
   		  from 
   		     metric_table mt
   			
   		    left join allocated al using(article) 
   		    left join store_groups sg using(article) 
   			left join inventory_smart.uom u on mt.style = u.item_id
   			left join bulk_remaining_dc_level using(article)
   		  where 
   			bulk_remaining > 0
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
