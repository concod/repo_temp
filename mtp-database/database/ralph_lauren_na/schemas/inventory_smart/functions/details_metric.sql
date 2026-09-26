--liquibase formatted sql
--changeset chaitanyaprasad.reddy:details_metric_revert runOnChange:true stripComments:false splitStatements:false context:MTP-62853 labels:MTP-62863
--comment: MTP-62863 added cursor, handled deleted sg
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
 		'{"l0_name": [{"operator": "in", "type": "list", "values": ["CHILDRENS"]}], "l1_name": [{"operator": "in", "type": "list", "values": ["BABY"]}], "article_status_tag": [{"operator": "not in", "type": "list", "values": ["Old"]}]}',
 		'{"channel": [{"operator": "in", "type": "list", "values": ["PFS"]}, {"operator": "not in", "type": "list", "values": ["WHS"]}]}',
 		'{}',
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
  	_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'dc_attributes', $4, 'store_groups', $6);
  	_cache_table_id text;
  	_cache_schema text := 'inventory_smart';
  	_cache_sp text := '.details_metric';
  	_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
  	_cache_dependencies text[] := '{inventory_smart.article_inventory_dashboard}';
	_sg_codes varchar[] := $6;
	_sg_query text := '';
    _sg_join text := 'LEFT';
  begin
    set cursor_tuple_fraction TO 1.0;
  	 $2 := $2 || jsonb_build_object('channel',  $3->>'channel');
  	_query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
  --	_query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
  	_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
  	_query_dc := global.form_main_table_filters('distribution_centres', $4);

	if coalesce(array_length(_sg_codes, 1), 0) != 0
	then
--          _sg_query := format($$where default_store_groups @> %s::int4[]$$, concat(_sg_codes));
		_sg_query := format($$where default_store_groups && (select array_agg(sg_code) from global.store_groups where name = any('%s'::varchar[]))$$, _sg_codes::varchar[]);
		_sg_join := '';
	end if;

  	--raise notice 'store attributes - % ',  _query_sa;
  	_query_combine := '
  	  with 
  		ph_data as materialized(
  			select ph.ph_code,
                ph.article,
                ph.channel,
                ph.l0_name,
                ph.l1_name,
                ph.l2_name,
                ph.l3_name,
                ph.l4_name,
                ph.product_description,
                ph.model_description,
                ph.style,
                ph.color,
                ph.article_status_tag,
                ph.style_color_id,
                ph.supersede_flag,
                ph.brand,
                ph.vendor_case_pack from inventory_smart.ph_master as ph
  			' || _query_pa || $$ AND article_status_tag NOT IN ('Only Store Inventory', 'No Network Inventory') $$ ||'
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
				'|| _sg_query ||'
  		    ) as acm
  		    join global.store_groups sg using(sg_code)
  		    where sg.is_deleted = false
  		  group by
  		    1
  		),
  		allocated as (
  		  select
  		    article,
			channel,
			updated_at AT TIME ZONE ''EDT'' as allocated_time
 		--   	date(max(drq.updated_at) AT TIME ZONE ''EST''::text) allocated_time
  		  from
				inventory_smart.article_allocation_tracker aat
  		)
  		--select * from allocated
 		,
 		common_cte as (
  			select
                ph.vendor_case_pack,
                saf.special_classification,
				saf.country,
                sid.*
  			from
  		 		ph_data ph
  		    join inventory_smart.article_inventory_dashboard sid using(article, channel)
  			join (select
                store_code,
				country,
                special_classification
                from global.store_attributes_filter ' || _query_sa || ' and (special_classification::varchar = any(''{"WHS", "Store"}''::varchar[]))) saf using(store_code)
  		)
  		--select * from common_cte;
		,store_dc as (
			select dc.linked_store_code store_code, dc_code, "name"
 			from
            global.product_mapping_store_dc pmsd
            join  global.distribution_centres dc using (dc_code)
 			 ' || _query_dc || '
 			group by 1,2,3
		)
  		,
  		bulk_remaining_dc_level as (
  			select article,
  					dc_code,
  					"name",
 			 		 coalesce(
 			 		      ROUND(sum(oh_dc):: numeric, 2), 0
 			 		    ) bulk_remaining_dc --bulk remaining at dc level
 			from store_dc
			join common_cte cc using (store_code)
 			group by 1,2,3
  		),
		metric_table_pre as (
          select
            sid.article,
            sid.channel,
            (case when sid.vendor_case_pack=''NO INFO'' then 1 else vendor_case_pack::int end) vendor_case_pack,
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
              avg(lw_margin_percentage):: numeric,
              2
            ) lw_margin_percentage,
            ROUND(
              (
                avg(case when sid.special_classification not like ''%WHS%'' then promo_percentage else null end)
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
            ROUND(
              (
                sum((case when sid.special_classification not like ''%WHS%'' then wos else 0 end)*
                (case when sid.special_classification not like ''%WHS%'' then (case when lw_qty>0 then lw_qty else 1 end) else null end))/
                sum(case when sid.special_classification not like ''%WHS%'' then (case when lw_qty>0 then lw_qty else 1 end) else null end)

              ):: numeric,
              1
            ):: text wos,

            ROUND(
              (
                AVG(
                    case when sid.special_classification = ''Store'' then si else null end
                )
            --  * 100
              ):: numeric,
              2
            ):: text si,
            coalesce(
              ROUND(
                sum(
                    case when sid.special_classification = ''WHS'' then oh_dc else 0 end
                ):: numeric,
                2
              ),
              0
            ) bulk_remaining,
            coalesce(
              ROUND(
                SUM(
                  case when sid.special_classification = ''WHS'' then it_dc else 0 end
                ):: numeric,
                2
              ),
              0
            ) bulk_remaining_intransit,
            coalesce(
              ROUND(
                SUM(
                  case when sid.special_classification = ''WHS'' then oo_dc else 0 end
                ):: numeric,
                2
              ),
              0
            ) bulk_remaining_onorder,
            ROUND(
              SUM(
                case when sid.special_classification = ''Store'' then oh else 0 end
              ):: numeric,
              2
            ) oh,
            ROUND(
              SUM(
                case when sid.special_classification = ''Store'' then oo else 0 end
              ):: numeric,
              2
            ) oo,
                    ROUND(
              SUM(
                case when sid.special_classification = ''Store'' then it else 0 end
              ):: numeric,
              2
            ) it,
            coalesce(
              ROUND(
                SUM(
                  case when sid.special_classification = ''WHS'' then 0 else sales_1_ago end
                ):: numeric,
                2
              ),
              0
            ) sales_1_ago,
            coalesce(
              ROUND(
                SUM(
                  case when sid.special_classification = ''WHS'' then 0 else sales_2_ago end
                ):: numeric,
                2
              ),
              0
            ) sales_2_ago,
            coalesce(
              ROUND(
                SUM(
                  case when sid.special_classification = ''WHS'' then 0 else sales_3_ago end
                ):: numeric,
                2
              ),
              0
            ) sales_3_ago,
           coalesce(
              ROUND(
                SUM(
                  case when sid.special_classification = ''WHS'' then 0 else sales_4_ago end
                ):: numeric,
                2
              ),
              0
            ) sales_4_ago,
            coalesce(
              ROUND(
                SUM(
                  case when sid.special_classification = ''WHS'' then 0 else sales_5_ago end
                ):: numeric,
                2
              ),
              0
            ) sales_5_ago,
            coalesce(
              ROUND(
                SUM(
                  case when sid.special_classification = ''WHS'' then 0 else sales_6_ago end
                ):: numeric,
                2
              ),
              0
            ) sales_6_ago,
            coalesce(
              ROUND(
                SUM(
                  case when sid.special_classification = ''WHS'' then 0 else sales_7_ago end
                ):: numeric,
                2
              ),
              0
            ) sales_7_ago,
           coalesce(
              ROUND(
                SUM(
                  case when sid.special_classification = ''WHS'' then 0 else sales_8_ago end
                ):: numeric,
                2
              ),
              0
            ) sales_8_ago,
            ROUND(
              SUM(stockout):: numeric,
              2
            ) stockout,
            ROUND(
              SUM(shortfall):: numeric,
              2
            ) shortfall,
            ROUND(
              SUM(case when sid.special_classification = ''WHS'' then 0 else normal end):: numeric,
              2
            ) normal,
            ROUND(
              SUM(excess):: numeric,
              2
            ) excess,
            coalesce(
              ROUND(
                AVG(
                  case when sid.special_classification = ''WHS'' then 0 else weeks_oh end
                ):: numeric,
                2
              ),
              0
            ) weeks_oh,
            coalesce(
              ROUND(
                AVG(
                  case when sid.special_classification = ''WHS'' then 0 else inv_build end
                ):: numeric,
                2
              ),
              0
            ) inv_build,
            coalesce(
              ROUND(
                AVG(
                  case when sid.special_classification = ''WHS'' then 0 else stock_to_sales_ratio end
                ):: numeric,
                2
              ),
              0
            ) stock_to_sales_ratio,
            coalesce(
              ROUND(
                AVG(
                  case when sid.special_classification = ''WHS'' then 0 else inv_pen_pct end
                ):: numeric,
                2
              ),
              0
            ) inv_pen_pct,
            coalesce(
              ROUND(
                AVG(
                  case when sid.special_classification = ''WHS'' then 0 else sell_through_rate end
                ):: numeric,
                2
              ),
              0
            ) sell_through_rate,
            coalesce(
              ROUND(
                AVG(
                  case when sid.special_classification = ''WHS'' then 0 else sales_build end
                ):: numeric,
                2
              ),
              0
            ) sales_build,
            coalesce(
              ROUND(
                AVG(
                  case when sid.special_classification = ''WHS'' then 0 else sales_pen_pct end
                ):: numeric,
                2
              ),
              0
            ) sales_pen_pct,
            coalesce(
              ROUND(
                AVG(
                  case when sid.special_classification = ''WHS'' then 0 else available_stores_percentage end
                ):: numeric,
                2
              ),
              0
            ) available_stores_percentage,
            coalesce(sum(week_to_date_sales), 0) as week_to_date_sales,
            coalesce(sum(last_day_sales), 0) as last_day_sales,
            round( coalesce (avg(available_stores_percentage) * 100, 0)::decimal, 2) as available_stores_perc

          from
            common_cte sid
          group by 1,2,3
        )
		--select * from metric_table_pre;
        ,metric_table as(
            select
            mt.*,
            sid.style,
            sid.ph_code,
            sid.l0_name,
            sid.l1_name,
            sid.l2_name,
            sid.l3_name,
            sid.l4_name,
            sid.color,
            sid.article_status_tag,
            sid.product_description,
            sid.model_description,
            sid.style_color_id,
            sid.supersede_flag,
            sid.brand
            from metric_table_pre mt
            join ph_data sid using (article,channel)
        )
        --select * from metric_table
 		,
		dc_country
  		 as
  		 (
  		 	select article,channel,country,avg(dc_instock_pct) dc_instock_pct  from common_cte
  		 	where special_classification=''WHS'' group by 1,2,3
  		 ),
  		final_result as (
  		  select
  		   	mt.article,
  		   	bmdl.dc_code,
  		   	bmdl."name",
  		    bmdl.bulk_remaining_dc,
			mt.style,
  		    mt.ph_code,
  		    mt.l0_name,
  		    mt.l1_name,
  		    mt.l2_name,
  		    mt.l3_name,
 			mt.l4_name,
  		    mt.color,
  		    mt.article_status_tag,
 			mt.product_description,
			mt.model_description,
			mt.style_color_id,
			mt.supersede_flag,
			mt.brand,
  		    allocated_time,
  		    store_groups,
			sales_1_ago,
		    sales_2_ago,
		    sales_3_ago,
		    sales_4_ago,
			sales_5_ago,
		    sales_6_ago,
		    sales_7_ago,
		    sales_8_ago,
  		    lw_qty,
  		    lw_revenue,
  		    lw_margin,
					lw_margin_percentage,
  		    promo,
  		    price,
  		    wos,
  		    si,
  		    bulk_remaining,
  		    bulk_remaining_intransit,
			bulk_remaining_onorder,
  		    oh,
  		    oo,
  		    it,
 			oo+oh+it as total_store_on_hand,
  		    stockout,
  		    shortfall,
  		    normal,
  		    excess ,
  		    available_stores_perc,
  			week_to_date_sales,
  			last_day_sales,
			inv_build,
			weeks_oh,
			sales_pen_pct,
			inv_pen_pct,
			sell_through_rate,
			sales_build,
			stock_to_sales_ratio,
			available_stores_percentage,
			country,
			round(coalesce(CAST(dc_instock_pct as numeric), 0), 2) as dc_instock_pct,
  		    mt.vendor_case_pack as case_pack_qty
  		  from
  		    metric_table mt
  		    left join allocated al using(article, channel)
  		    '|| _sg_join ||' join store_groups sg using(article)
  			left join bulk_remaining_dc_level bmdl using(article)
			left join dc_country using(article,channel)
  		  where
  			bulk_remaining > 0
  			order by lw_qty desc
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