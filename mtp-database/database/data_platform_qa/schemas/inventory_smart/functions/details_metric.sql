--liquibase formatted sql
--changeset liquibase:details_metric runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for details_metric
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
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
	raise notice '%', $3->>'channel';
	$2 := $2 || jsonb_build_object('channel',  $3->>'channel');
	_query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
	_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
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
		    sum(quantity) as allocated_oh, 
		    null::int as allocated_it, 
		    max(updated_at) as allocated_time 
		  from 
		    ph_data ph 
		    join inventory_smart.sku_dc_allocated_units using(article) 
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
		    ) lw_qty, 
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
		        SUM(
	--	          (
	--	            case when lw_qty > 0 then lw_qty else 0 end
	--	          ) * 
					promo
		        ) / SUM(
		          case when lw_qty > 0 then lw_qty else null end
		        )
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
		    ):: text price, 
		    ROUND(
		      (
		        SUM(
		          (
		            case when saf.special_classification = ''Outlet'' then oh + oo + it else 0 end
		          )
		        ) / SUM(
		          case when saf.special_classification = ''Outlet'' then store_level_prediction end
		        )
		      ):: numeric, 
		      1
		    ):: text wos, 
		    ROUND(
		      (
		        AVG(
		          case when saf.special_classification = ''Outlet'' then si else null end
		        )
		      ):: numeric, 
		      2
		    ):: text si, 
		    coalesce(
		      ROUND(
		        Sum(
		          case when saf.special_classification = ''WHS'' then oh else 0 end
		        ):: numeric, 
		        2
		      ), 
		      0
		    ) bulk_remaining, 
		    coalesce(
		      ROUND(
		        SUM(
		          case when saf.special_classification = ''WHS'' then it else 0 end
		        ):: numeric, 
		        2
		      ), 
		      0
		    ) bulk_remaining_intransit, 
		    ROUND(
		      SUM(
		        case when saf.special_classification = ''Outlet'' then oh else 0 end
		      ):: numeric, 
		      2
		    ) oh, 
		    ROUND(
		      SUM(
		        case when saf.special_classification = ''Outlet'' then oo else 0 end
		      ):: numeric, 
		      2
		    ) oo, 
		    ROUND(
		      SUM(
		        case when saf.special_classification = ''Outlet'' then it else 0 end
		      ):: numeric, 
		      2
		    ) it, 
		    ROUND(
		      SUM(stock_out):: numeric, 
		      2
		    ) stock_out, 
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
		    ) excess 
		  from 
		    ph_data ad 
		    join inventory_smart.article_inventory_dashboard sid using(article)
		    join (select * from global.store_attributes_filter ' || _query_sa || ') saf using(store_code) 
		  group by 
		    ad.article
		)
		--select * from metric_table
		, 
		final_result as (
		  select 
			ph.ph_code,
		    ph.l0_name, 
		    ph.l1_name, 
		    ph.l2_name, 
		    ph.l3_name, 
		    ph.style, 
		    ph.article, 
		    ph.style_description, 
		    ph.color, 
		    ph.color_code, 
		    ph.human_readable_color, 
		   	ph.launch_date,
		    ph.article_status_tag, 
		    allocated_time, 
		    store_groups, 
			ph.merchandise_category,
		    mt.lw_qty, 
		    mt.lw_revenue, 
		    mt.lw_margin, 
		    mt.promo, 
		    mt.price, 
		    mt.wos, 
		    mt.si, 
		    mt.bulk_remaining, 
		    mt.bulk_remaining_intransit, 
		    mt.oh, 
		    mt.oo, 
		    mt.it, 
		    mt.stock_out, 
		    mt.shortfall, 
		    mt.normal, 
		    mt.excess 
		  from 
		    ph_data ph 
--		    left 
		    join metric_table mt on ph.article = mt.article 
		    left join allocated al on ph.article = al.article 
		    left join store_groups sg on ph.article = sg.article 
--		  where 
--		    (
--		      bulk_remaining - coalesce(allocated_oh, 0)
--		    ) > 0 
--		    or (
--		      bulk_remaining_intransit - coalesce(allocated_it, 0)
--		    ) > 0
		) 
		select 
		  * 
		from 
		  final_result';
		select * from cache.wrap_sp(
			_cache_schema,
			_cache_sp,
			_cache_payload,
			_query_combine,
			_cache_dependencies,
			_cache_key_pattern) into _cache_table_id;
		_query_table_filters := global.form_table_query($4);
		perform set_config('myvars.cache_table_id', _cache_table_id, true);
		raise notice '%', _query_combine;
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
		RETURN $1;
	end
$function$
;
