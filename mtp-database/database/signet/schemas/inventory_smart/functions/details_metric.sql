--liquibase formatted sql
--changeset liquibase:details_metric runOnChange:true stripComments:false splitStatements:false context:count mapped stores labels:MTP-43890
--comment: Details Table: the Last Allocated
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.details_metric(input refcursor, jsonb, jsonb, jsonb, jsonb, character varying[])
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
		)
		, store_groups as (
		  select 
		    acm.article, 
		    ARRAY_AGG(distinct name) store_groups,
			count(distinct sgm.store_code) store_groups_count 
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
			join global.store_groups_mapping sgm using(sg_code)
			join (select * from global.store_master where active) sm using (store_code)
			join global.product_mapping_product_store pmps on acm.article = pmps.product_code and sm.store_code = pmps.store_code
			where sg.is_deleted = False
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
		allocation_date as (
			select aat.article, max(aat.updated_at) as allocated_time from inventory_smart.article_allocation_tracker aat
			join ph_data using(article) 
			group by 1
		) ,
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
	--	    ROUND(
	--	      (
	--	        SUM(
	--	          (
	--	            case when lw_qty > 0 then lw_qty else 0 end
	--	          ) * 
	--				promo
	--	        ) / SUM(
	--	          case when lw_qty > 0 then lw_qty else null end
	--	        )
	--	      ):: numeric, 
	--	      2
	--	    ):: text promo,
			ROUND(
				avg(promo_percentage)::numeric,
				2
			):: text promo,
			ROUND(	
			sum(coalesce(model_stock,0))::numeric,0
			):: text model_stock,
			ROUND(
				avg(lw_margin_percentage)::numeric,
				2
			):: text margin_perc,
	--	    ROUND(
	--	      (
	--	        SUM(lw_revenue) / nullif(
	--	          SUM(lw_qty), 
	--	          0
	--	        )
	--	      ):: numeric, 
	--	      2
	--	    ) price, 
			ROUND(
				avg(price_point)::numeric,
				2
			) price,
	--	    ROUND(
	--	      (
	--	        SUM(
	--	          (
	--	            case when saf.special_classification = ''Outlet'' then oh + oo + it else 0 end
	--	          )
	--	        ) / SUM(
	--	          case when saf.special_classification = ''Outlet'' then store_level_prediction end
	--	        )
	--	      ):: numeric, 
	--	      1
	--	    ):: text wos,
			ROUND(
				avg(wos)::numeric,
				2
			):: text wos, 
	--	    ROUND(
	--	      (
	--	        AVG(
	--	          case when saf.special_classification = ''Outlet'' then si else null end
	--	        )
	--	      ):: numeric, 
	--	      2
	--	    ):: text si,
			ROUND(
	--			(avg(si)
	--			/100)::numeric,
	--			2
			1):: text si,
	--	    coalesce(
	--	      ROUND(
	--	        SUM(
	--	          case when saf.special_classification = ''WHS'' then oh else 0 end
	--	        ):: numeric, 
	--	        2
	--	      ), 
	--	      0
	--	    ) bulk_remaining,
			coalesce(
			ROUND(
				avg(bulk_remaining)::numeric,
				2
			),0
			):: numeric bulk_remaining,
	--	    coalesce(
	--	      ROUND(
	--	        SUM(
	--	          case when saf.special_classification = ''WHS'' then it else 0 end
	--	        ):: numeric, 
	--	        2
	--	      ), 
	--	      0
	--	    ) bulk_remaining_intransit, 
		    ROUND(
		      SUM(
		        case when saf.special_classification != ''WHS'' then oh else 0 end
		      ):: numeric, 
		      2
		    ) oh, 
		    ROUND(
		      SUM(
		        case when saf.special_classification != ''WHS'' then oo else 0 end
		      ):: numeric, 
		      2
		    ) oo, 
		    ROUND(
		      SUM(
		        case when saf.special_classification != ''WHS'' then it else 0 end
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
			coalesce(ROUND(
				avg(system_reserve)::numeric,
				2
			),0) system_reserve,
			coalesce(ROUND(
				avg(ecomm_reserve)::numeric,
				2
			),0) ecomm_reserve,
			coalesce(ROUND(
				avg(dc_ecomm_reserve)::numeric,
				2
			),0) dc_ecomm_reserve,
			coalesce(ROUND(
				avg(sma_ecomm_reserve)::numeric,
				2
			),0) sma_ecomm_reserve
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
		    ph.article, 
		    ph.article_status_tag,
			ph.planning_ownership,
			ph.product_description,
			ph.sku_grade,
			ph.product_type,
			ph.merchandise_brand,
			ph.product_channel_name,
			ph.store_pack_size,
		    ad.allocated_time,
		    coalesce(store_groups,''{}'') as store_groups, 
			store_groups_count,
			model_stock,
			margin_perc,
			ph.merchandise_category,
		    mt.lw_qty, 
		    mt.lw_revenue, 
		    mt.lw_margin, 
		    mt.promo, 
		    mt.price, 
		    mt.wos, 
		    mt.si, 
		    mt.bulk_remaining, 
	--	    mt.bulk_remaining_intransit, 
		    mt.oh, 
		    mt.oo, 
		    mt.it, 
		    mt.stockout, 
		    mt.shortfall, 
		    mt.normal, 
		    mt.excess,
			mt.bulk_remaining - coalesce(drq.user_reserve,0) - mt.system_reserve - mt.ecomm_reserve as net_available_inventory,
			drq.user_reserve,
		    mt.system_reserve,
		    mt.ecomm_reserve,
		    mt.dc_ecomm_reserve,
		    mt.sma_ecomm_reserve
		  from 
		    ph_data ph 
--		    left 
		    join metric_table mt on ph.article = mt.article 
		    left join allocated al on ph.article = al.article 
		    left join store_groups sg on ph.article = sg.article 
			left join allocation_date ad on ph.article = ad.article
			left join (select quantity as user_reserve, product_code as article from inventory_smart.dc_reserve_quantity drq2 where type = ''U'') drq on ph.article = drq.article
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
		_query_table_filters := global.form_table_query($5);
		perform set_config('myvars.cache_table_id', _cache_table_id, true);
		raise notice '%', _query_combine;
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
		RETURN $1;
	end
$function$
;
