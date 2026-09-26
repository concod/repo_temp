--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_fetch_decisions_dashboard_table_data-4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: Added custom alerts to the table data

DROP FUNCTION if exists price_markdown.fn_fetch_decisions_dashboard_table_data;

CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_decisions_dashboard_table_data(
    _strategy_id integer[],
    currency_ids integer[],
    product_h1 integer[],
    product_h2 integer[],
    product_h3 integer[],
    product_h4 integer[],
    product_h5 integer[],
    _s0_ids integer[],
    _s1_ids integer[],
    _s2_ids integer[],
    _s3_ids integer[],
    _s4_ids integer[],
	strategy_status integer[],
    _timeline text,
    _view_by text,
    _start_date date,
    _end_date date,
    timezone text,
    in_user_id integer
)
 RETURNS TABLE(final_response jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    vl_test_query text :=  '';
   	dummy_data_query text:=    'select null::jsonb';
	filtered_strategy_ids integer[];
	product_hierarchy_level integer;
	product_hierarchy_values integer[];
	strategy_where_arr text[];
	start_time TIMESTAMP;
    end_time TIMESTAMP;
	pcd_buffer text;
	buffer_start_date date;
	target_currency_multiplier float;
begin
	select tasm.remarks into pcd_buffer from metaschema.tb_app_sub_master tasm where  tasm.is_active = 1 and tasm.name = 'pcd_buffer_alerts';
	execute format('select date(timezone(''%2$s'', now())) + interval ''%1$s'' ', pcd_buffer, timezone) into buffer_start_date;
	raise notice ' buffer_start_date ----- %', buffer_start_date;

	if array_length(_strategy_id, 1) > 0 then
		filtered_strategy_ids := _strategy_id;
	else
	    if array_length(product_h5, 1) > 0 then
			product_hierarchy_level := 4;
			product_hierarchy_values := product_h5;
		elsif array_length(product_h4, 1) > 0 then
			product_hierarchy_level := 3;
			product_hierarchy_values := product_h4;
		elsif array_length(product_h3, 1) > 0 then
			product_hierarchy_level := 2;
			product_hierarchy_values := product_h3;
		elsif array_length(product_h2, 1) > 0 then
			product_hierarchy_level := 1;
			product_hierarchy_values := product_h2;
		elsif array_length(product_h1, 1) > 0 then
			product_hierarchy_level := 0;
			product_hierarchy_values := product_h1;
		else
			product_hierarchy_level := -1;
		end if;


		if product_hierarchy_level <> -1 then
			strategy_where_arr := array_append(strategy_where_arr, format('and sm.strategy_id IN (
				    SELECT
			            strategy_id
			        FROM
			            price_markdown.tb_strategy_hierarchy
			        WHERE is_product_hierarchy = 1
				    AND hierarchy_level = %1$s::integer
				    AND hierarchy_value = ANY(array[%2$s])
		    	)', product_hierarchy_level, array_to_string(product_hierarchy_values, ','))) ;
		end if;

		strategy_where_arr := array_append(strategy_where_arr, format('and sm.strategy_id IN (
            select
                strategy_id
            from price_markdown.tb_strategy_store_hierarchies tsh
            where
                s0_ids && array[%1$s]::bigint[]
                and (
                    array_length(array[%2$s]::bigint[],1) is null
                    or s1_ids && array[%2$s]::bigint[]
                )
                and (
                    array_length(array[%3$s]::bigint[],1) is null
                    or s2_ids && array[%3$s]::bigint[]
                )
                and (
                    array_length(array[%4$s]::bigint[],1) is null
                    or s3_ids && array[%4$s]::bigint[]
                )
                and (
                    array_length(array[%5$s]::bigint[],1) is null
                    or s4_ids && array[%5$s]::bigint[]
                )
        )',
        array_to_string(_s0_ids,','),
        array_to_string(_s1_ids,','),
        array_to_string(_s2_ids,','),
        array_to_string(_s3_ids,','),
        array_to_string(_s4_ids,',')
        )
    );

		if array_length(strategy_status, 1) > 0 then
			strategy_where_arr := array_append(strategy_where_arr, format('and sm.status = ANY(array[%s])', array_to_string(strategy_status, ',')));
		else
			strategy_where_arr := array_append(strategy_where_arr, format('and sm.status in (1,2,3,4,6)'));
		end if;
		vl_test_query := format('select
								array_agg(sm.strategy_id)
							from
								price_markdown.tb_strategy_master sm
							where
								sm.start_date <= ''%2$s''::date  + interval ''%4$s''
								and sm.end_date >= ''%1$s''::date
								%3$s', _start_date, _end_date, array_to_string(strategy_where_arr, ' '), _timeline);
		raise notice ' strategy filter query ----- %', vl_test_query;
		execute vl_test_query into filtered_strategy_ids;
	end if;

	select * from price_markdown.fn_v3_fetch_currency_forex_multiplier(currency_ids) into target_currency_multiplier;
	RAISE NOTICE 'Target currency multiplier  : %', target_currency_multiplier;

	if array_length(filtered_strategy_ids, 1) > 0 then


      vl_test_query :=  'drop table if exists tb_tmp_strategy_metrics;';
	  execute vl_test_query;

      vl_test_query:= ('Create temp table tb_tmp_strategy_metrics as
                 select *
    	from price_markdown.tb_strategy_date_metrics_fin' || Format(' where strategy_id = ANY(%L)', filtered_strategy_ids) || Format(' and recommendation_date between %L and %L::date + interval %3$L', _start_date, _end_date, _timeline) || ' and is_approved = 1'
        );

		RAISE NOTICE 'SQL 1 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
        RAISE NOTICE 'Time taken SQL 1 statement: %', end_time - start_time;


      vl_test_query :=  'drop table if exists tb_tmp_strategy_ia_reco;';
	  execute vl_test_query;


      vl_test_query:= ('Create temp table tb_tmp_strategy_ia_reco as
            select *
    	from price_markdown.tb_strategy_date_metrics_ia' || Format(' where strategy_id = ANY(%L)', filtered_strategy_ids) || Format(' and recommendation_date between %L and %L::date + interval %3$L', _start_date, _end_date, _timeline) || ' and is_approved = 1'
        );

		RAISE NOTICE 'SQL 2 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL 2 statement: %', end_time - start_time;

		vl_test_query := 'drop table if exists tb_temp_approval_counts';
		execute vl_test_query;

		vl_test_query := format('create temp table tb_temp_approval_counts as(
							SELECT
						        tsd.pcd_id,
						        COUNT(DISTINCT tsd.approval_status) AS alert_count,
						        COUNT(DISTINCT CASE WHEN tsd.approval_status = ''Initially Approved'' THEN (tsd.product_level_id, tsd.channel_info, tsd.pcd_id) END) AS initially_approved,
						        COUNT(DISTINCT CASE WHEN tsd.approval_status = ''Finally Approved'' THEN (tsd.product_level_id, tsd.channel_info, tsd.pcd_id) END) AS finally_approved,
						        COUNT(DISTINCT CASE WHEN tsd.approval_status = ''Not Approved'' THEN (tsd.product_level_id, tsd.pcd_id) END) AS not_approved
						    FROM price_markdown.tb_strategy_discount tsd
							join price_markdown.tb_strategy_pcd tsp
							on tsd.pcd_id = tsp.pcd_id
						    WHERE tsd.strategy_id = ANY(%1$L) and tsp.pcd_start_date > %2$L
						    GROUP BY tsd.pcd_id
						);', filtered_strategy_ids, buffer_start_date);

		execute vl_test_query;

	raise notice 'Alert count query : %', vl_test_query;

      vl_test_query :=  'drop table if exists tb_tmp_strategy_pcd_details;';
	  execute vl_test_query;



		vl_test_query:= format('Create temp table tb_tmp_strategy_pcd_details as
			select sm.strategy_id,
			sm.strategy_name,
			tsssda.pcd_id ,
			false as is_sub_total,
			coalesce(
				min(tsssda.recommendation_date),
				greatest(min(tsp.pcd_start_date),  %2$L::date)
			) as pcd_start_date,
			coalesce(
				max(tsssda.recommendation_date),
				least(min(tsp.pcd_end_date),%1$L::date
				+ interval %3$L)) as pcd_end_date,
			min(tsssda.sku_count) as products_count,
			min(tsssda.store_count) as stores_count,
			round((sum(tsssda.margin * %5$s)/NULLIF(sum(tsssda.revenue * %5$s), 0))::numeric,2)*100 as bl_gm_percent,
			round((sum(tsssda.margin * %5$s)/NULLIF(sum(tsssda.sales_units),0))::numeric,2) as bl_aum_$,
			round((sum(tsssda.revenue * %5$s)/NULLIF(sum(tsssda.sales_units),0))::numeric,2) as bl_aur_$,
			round((sum(tsssda.revenue * %5$s))::numeric,2) as bl_revenue_$,
			round((sum(tsssda.margin * %5$s))::numeric,2) as bl_gm_$,
			round(sum(tsssda.sales_units)) as bl_sales_units,
			round((sum(tsssda.sales_units * tsssda.clearance_discount) / NULLIF(sum(tsssda.sales_units), 0) )::numeric, 2) as bl_clearance_discount,
			round(sum(tsssda.spend * %5$s)::numeric, 2) as bl_markdown_$,
			--round(sum(tsssda.inventory_cost)::numeric, 2) as bl_inventory_cost,
			--round(sum(tsssda.inventory_retail)::numeric, 2) as bl_inventory_retail,
			round((sum(tsssda2.margin * %5$s)/NULLIF(sum(tsssda2.revenue * %5$s), 0))::numeric,2)*100 as ia_reco_gm_percent,
			round((sum(tsssda2.margin * %5$s)/NULLIF(sum(tsssda2.sales_units),0))::numeric,2) as ia_reco_aum_$,
			round((sum(tsssda2.revenue * %5$s)/NULLIF(sum(tsssda2.sales_units),0))::numeric,2) as ia_reco_aur_$,
			round((sum(tsssda2.revenue * %5$s))::numeric,2) as ia_reco_revenue_$,
			round((sum(tsssda2.margin * %5$s))::numeric,2) as ia_reco_gm_$,
			round(sum(tsssda2.sales_units)) as ia_reco_sales_units,
			round((sum(tsssda2.sales_units * tsssda2.clearance_discount) / NULLIF(sum(tsssda2.sales_units),0) )::numeric, 2) as ia_reco_clearance_discount,
			round(sum(tsssda2.spend * %5$s)::numeric, 2) as ia_reco_markdown_$,
			--round(sum(tsssda2.inventory_cost)::numeric, 2) as ia_reco_inventory_cost,
			--round(sum(tsssda2.inventory_retail)::numeric, 2) as ia_reco_inventory_retail,
			min(ac.alert_count) as alert_count,
	        min(ac.initially_approved) as initially_approved,
	       	min(ac.finally_approved) as finally_approved,
	       	min(ac.not_approved) as not_approved
			from tb_tmp_strategy_metrics tsssda
			join price_markdown.tb_strategy_master sm
			using(strategy_id)
			left join (select
	                        strategy_id,
	                        pcd_id,
	                        min(pcd_start_date) as pcd_start_date,
	                        max(pcd_end_date) as pcd_end_date
	                    from price_markdown.tb_strategy_pcd
	                    where strategy_id = any(%4$L)
	                    group by strategy_id, pcd_id) tsp
			using (strategy_id, pcd_id)
			left join
			tb_tmp_strategy_ia_reco tsssda2 on
			tsssda2.strategy_id = tsssda.strategy_id and tsssda2.recommendation_date = tsssda.recommendation_date
			and tsssda2.pcd_id = tsssda.pcd_id
			LEFT JOIN tb_temp_approval_counts ac ON ac.pcd_id = tsssda.pcd_id
			where sm.strategy_id = any (%4$L)
			group by 1,2,3;',_end_date,_start_date,_timeline,filtered_strategy_ids, target_currency_multiplier);

		RAISE NOTICE 'SQL 4 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL 4 statement: %', end_time - start_time;

      vl_test_query :=  'drop table if exists tb_tmp_strategy_details;';
	  execute vl_test_query;


		vl_test_query:= format('Create temp table tb_tmp_strategy_details as
			select sm.strategy_id,
			sm.strategy_name || ''( Sub-Total )'' as "strategy_name",
			null::integer as pcd_id,
			true as is_sub_total,
			coalesce(
				min(tsssda.recommendation_date),
				greatest(min(tsp.pcd_start_date),  %2$L::date)
			) as pcd_start_date,
			coalesce(
				max(tsssda.recommendation_date),
				least(min(tsp.pcd_end_date),%1$L::date
			+ interval %3$L)) as pcd_end_date,
			min(tsssda.sku_count) as products_count,
			min(tsssda.store_count) as stores_count,
			round((sum(tsssda.margin * %5$s)/NULLIF(sum(tsssda.revenue * %5$s), 0))::numeric,2)*100 as bl_gm_percent,
			round((sum(tsssda.margin * %5$s)/NULLIF(sum(tsssda.sales_units),0))::numeric,2) as bl_aum_$,
			round((sum(tsssda.revenue * %5$s)/NULLIF(sum(tsssda.sales_units),0))::numeric,2) as bl_aur_$,
			round((sum(tsssda.revenue * %5$s))::numeric,2) as bl_revenue_$,
			round((sum(tsssda.margin * %5$s))::numeric,2) as bl_gm_$,
			round(sum(tsssda.sales_units)::numeric) as bl_sales_units,
			round((sum(tsssda.sales_units * tsssda.clearance_discount) / NULLIF(sum(tsssda.sales_units), 0) )::numeric, 2) as bl_clearance_discount,
			round(sum(tsssda.spend * %5$s)::numeric, 2) as bl_markdown_$,
			--round(sum(tsssda.inventory_cost)::numeric, 2) as bl_inventory_cost,
			--round(sum(tsssda.inventory_retail)::numeric, 2) as bl_inventory_retail,
			round((sum(tsssda2.margin * %5$s)/NULLIF(sum(tsssda2.revenue * %5$s), 0))::numeric,2)*100 as ia_reco_gm_percent,
			round((sum(tsssda2.margin * %5$s)/NULLIF(sum(tsssda2.sales_units),0))::numeric,2) as ia_reco_aum_$,
			round((sum(tsssda2.revenue * %5$s)/NULLIF(sum(tsssda2.sales_units),0))::numeric,2) as ia_reco_aur_$,
			round((sum(tsssda2.revenue * %5$s))::numeric,2) as ia_reco_revenue_$,
			round((sum(tsssda2.margin * %5$s))::numeric,2) as ia_reco_gm_$,
			round(sum(tsssda2.sales_units)::numeric) as ia_reco_sales_units,
			round((sum(tsssda2.sales_units * tsssda2.clearance_discount) / NULLIF(sum(tsssda2.sales_units),0))::numeric, 2) as ia_reco_clearance_discount,
			round(sum(tsssda2.spend * %5$s)::numeric, 2) as ia_reco_markdown_$,
			--round(sum(tsssda2.inventory_cost)::numeric, 2) as ia_reco_inventory_cost,
			--round(sum(tsssda2.inventory_retail)::numeric, 2) as ia_reco_inventory_retail,
			null::integer as alert_count,
			null::integer as initially_approved,
			null::integer as finally_approved,
			null::integer as not_approved
			from tb_tmp_strategy_metrics tsssda
			join price_markdown.tb_strategy_master sm
			using (strategy_id)
			left join (select
	                        strategy_id,
	                        min(pcd_start_date) as pcd_start_date,
	                        max(pcd_end_date) as pcd_end_date
	                    from price_markdown.tb_strategy_pcd
	                    where strategy_id = any(%4$L)
	                    group by strategy_id) tsp
			using (strategy_id)
			left join
			tb_tmp_strategy_ia_reco tsssda2 on
			tsssda2.strategy_id = tsssda.strategy_id and tsssda2.recommendation_date = tsssda.recommendation_date
			where tsssda.strategy_id = any(%4$L)
			group by 1,2;',_end_date,_start_date,_timeline,filtered_strategy_ids, target_currency_multiplier);

		RAISE NOTICE 'SQL 5 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL 5 statement: %', end_time - start_time;

      vl_test_query :=  'drop table if exists tb_tmp_strategy_pcd_bl_inventory_at_end;';
	  execute vl_test_query;


		vl_test_query:= format('Create temp table tb_tmp_strategy_pcd_bl_inventory_at_end as
			select strategy_id,pcd_id,sum(remaining_inv) as remaining_inv,
					sum(inventory_cost) as inventory_cost,
					sum(inventory_retail) as inventory_retail
			 from (
				select
				row_number() over (
					partition by strategy_id,pcd_id
					order by strategy_id,pcd_id,recommendation_date asc
				) as rank_,
				inventory as remaining_inv,
					inventory_cost,
					inventory_retail,
				strategy_id,
				pcd_id
				from tb_tmp_strategy_metrics bl
				) inventory_subquery
			where rank_ = 1
			group by strategy_id,pcd_id;',_end_date,_start_date,_timeline);

		RAISE NOTICE 'SQL 6 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL 6 statement: %', end_time - start_time;

      vl_test_query :=  'drop table if exists tb_tmp_strategy_pcd_ia_reco_inventory_at_end;';
	  execute vl_test_query;


		vl_test_query:= format('Create temp table tb_tmp_strategy_pcd_ia_reco_inventory_at_end as
			select strategy_id,pcd_id,sum(remaining_inv) as remaining_inv,
					sum(inventory_cost) as inventory_cost,
					sum(inventory_retail) as inventory_retail
			 from (
				select
				row_number() over (
					partition by strategy_id,pcd_id
					order by strategy_id,pcd_id,recommendation_date asc
				) as rank_,
				inventory as remaining_inv,
					inventory_cost,
					inventory_retail,
				strategy_id,
				pcd_id
				from tb_tmp_strategy_ia_reco ia_reco
				) inventory_subquery
			where rank_ = 1
			group by strategy_id,pcd_id;',_end_date,_start_date,_timeline);

		RAISE NOTICE 'SQL 7 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL 7 statement: %', end_time - start_time;

      vl_test_query :=  'drop table if exists tb_tmp_strategy_bl_inventory_at_end;';
	  execute vl_test_query;


		vl_test_query:= format('Create temp table tb_tmp_strategy_bl_inventory_at_end as
			select strategy_id,sum(remaining_inv) as remaining_inv,
					sum(inventory_cost) as inventory_cost,
					sum(inventory_retail) as inventory_retail
			 from (
				select
				row_number() over (
					partition by strategy_id
					order by strategy_id,recommendation_date asc
				) as rank_,
				inventory as remaining_inv,
					inventory_cost,
					inventory_retail,
				strategy_id
				from tb_tmp_strategy_metrics bl
				) inventory_subquery
			where rank_ = 1
			group by strategy_id;',_end_date,_start_date,_timeline);

		RAISE NOTICE 'SQL 8 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL 8 statement: %', end_time - start_time;

      vl_test_query :=  'drop table if exists tb_tmp_strategy_ia_reco_inventory_at_end;';
	  execute vl_test_query;


		vl_test_query:= format('Create temp table tb_tmp_strategy_ia_reco_inventory_at_end as
			select strategy_id,sum(remaining_inv) as remaining_inv,
					sum(inventory_cost) as inventory_cost,
					sum(inventory_retail) as inventory_retail
			 from (
				select
				row_number() over (
					partition by strategy_id
					order by strategy_id,recommendation_date asc
				) as rank_,
				inventory as remaining_inv,
					inventory_cost,
					inventory_retail,
				strategy_id
				from tb_tmp_strategy_ia_reco ia_reco
				) inventory_subquery
			where rank_ = 1
			group by strategy_id;',_end_date,_start_date,_timeline);

		RAISE NOTICE 'SQL 9 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL 9 statement: %', end_time - start_time;

      vl_test_query :=  'drop table if exists tb_tmp_strategy_pcd_metrics;';
	  execute vl_test_query;


		vl_test_query:= format('Create temp table tb_tmp_strategy_pcd_metrics as
			select sd.*,
				null::numeric as lw_gm_percent,
				null::numeric as lw_aum,
				null::numeric as lw_aur,
				null::numeric as lw_revenue,
				null::numeric as lw_gm_dollar,
				null::numeric as lw_sales_units,
				null::numeric as lw_inventory,
				null::numeric as lw_clearance_discount,
				null::numeric as lw_markdown_dollar,
				null::numeric as till_date_gm_percent,
				null::numeric as till_date_aum,
				null::numeric as till_date_aur,
				null::numeric as till_date_revenue,
				null::numeric as till_date_gm_dollar,
				null::numeric as till_date_sales_units,
				null::numeric as till_date_inventory,
				null::numeric as till_date_clearance_discount,
				null::numeric as till_date_markdown_dollar,
				round((bl_inv.remaining_inv)::numeric) as bl_inventory,
				round(bl_inv.inventory_cost::numeric) as bl_inventory_cost,
				round(bl_inv.inventory_retail::numeric) as bl_inventory_retail,
				round((ia_reco_inv.remaining_inv)::numeric) as ia_reco_inventory,
				round(ia_reco_inv.inventory_cost::numeric) as ia_reco_inventory_cost,
				round(ia_reco_inv.inventory_retail::numeric) as ia_reco_inventory_retail,
				round(((sd.bl_sales_units/ NULLIF((bl_inv.remaining_inv),0))*100)::Decimal,2)::float as bl_sell_through,
				round(((sd.ia_reco_sales_units/NULLIF((ia_reco_inv.remaining_inv),0))*100)::Decimal,2)::float as ia_reco_sell_through,
				null::numeric as lw_sell_through,
				null::numeric as till_date_sell_through
			from  tb_tmp_strategy_pcd_details sd
			left join tb_tmp_strategy_pcd_bl_inventory_at_end bl_inv
				on bl_inv.strategy_id = sd.strategy_id and bl_inv.pcd_id = sd.pcd_id
			left join  tb_tmp_strategy_pcd_ia_reco_inventory_at_end ia_reco_inv
				on ia_reco_inv.strategy_id = sd.strategy_id and ia_reco_inv.pcd_id = sd.pcd_id
			order by sd.strategy_id,pcd_id;',_end_date,_start_date,_timeline);

		RAISE NOTICE 'SQL 10 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL 10 statement: %', end_time - start_time;


      vl_test_query :=  'drop table if exists tb_tmp_strategy_sub_total_metrics;';
	  execute vl_test_query;


		vl_test_query:= format('Create temp table tb_tmp_strategy_sub_total_metrics as
			select sd.*,
				round(strategy_lw_till_date.lw_gm_percent::numeric,2) as lw_gm_percent,
				round(strategy_lw_till_date.lw_aum::numeric,2) as lw_aum,
				round(strategy_lw_till_date.lw_aur::numeric,2) as lw_aur,
				round(strategy_lw_till_date.lw_revenue::numeric,2) as lw_revenue,
				round(strategy_lw_till_date.lw_gm_dollar::numeric,2) as lw_gm_dollar,
				round(strategy_lw_till_date.lw_sales_units::numeric) as lw_sales_units,
				round(strategy_lw_till_date.lw_inventory::numeric) as lw_inventory,
				round(strategy_lw_till_date.lw_clearance_discount::numeric,2) as lw_clearance_discount,
				round(strategy_lw_till_date.lw_markdown_dollar::numeric,2) as lw_markdown_dollar,
				round(strategy_lw_till_date.till_date_gm_percent::numeric,2) as till_date_gm_percent,
				round(strategy_lw_till_date.till_date_aum::numeric,2) as till_date_aum,
				round(strategy_lw_till_date.till_date_aur::numeric,2) as till_date_aur,
				round(strategy_lw_till_date.till_date_revenue::numeric,2) as till_date_revenue,
				round(strategy_lw_till_date.till_date_gm_dollar::numeric,2) as till_date_gm_dollar,
				round(strategy_lw_till_date.till_date_sales_units::numeric) as till_date_sales_units,
				round(strategy_lw_till_date.till_date_inventory::numeric) as till_date_inventory,
				round(strategy_lw_till_date.till_date_clearance_discount::numeric,2) as till_date_clearance_discount,
				round(strategy_lw_till_date.till_date_markdown_dollar::numeric,2) as till_date_markdown_dollar,
				round((bl_inv.remaining_inv)::numeric) as bl_inventory,
				round(bl_inv.inventory_cost::numeric) as bl_inventory_cost,
				round(bl_inv.inventory_retail::numeric) as bl_inventory_retail,
				round((ia_reco_inv.remaining_inv)::numeric) as ia_reco_inventory,
				round(ia_reco_inv.inventory_cost::numeric) as ia_reco_inventory_cost,
				round(ia_reco_inv.inventory_retail::numeric) as ia_reco_inventory_retail,
				round(((sd.bl_sales_units/ NULLIF((bl_inv.remaining_inv),0))*100)::Decimal,2)::float as bl_sell_through,
				round(((sd.ia_reco_sales_units/NULLIF((ia_reco_inv.remaining_inv),0))*100)::Decimal,2)::float as ia_reco_sell_through,
				round(strategy_lw_till_date.lw_st_percent::numeric,2) as lw_sell_through,
				round(strategy_lw_till_date.till_date_st_percent::numeric,2) as till_date_sell_through
			from  tb_tmp_strategy_details sd
			left join tb_tmp_strategy_bl_inventory_at_end bl_inv
				on bl_inv.strategy_id = sd.strategy_id
			left join tb_tmp_strategy_ia_reco_inventory_at_end ia_reco_inv
				on ia_reco_inv.strategy_id = sd.strategy_id
			left join price_markdown.tb_strategy_actuals strategy_lw_till_date
				on strategy_lw_till_date.strategy_id = sd.strategy_id
			order by sd.strategy_id;',_end_date,_start_date,_timeline);

		RAISE NOTICE 'SQL 11 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL 11 statement: %', end_time - start_time;

      vl_test_query :=  'drop table if exists tb_tmp_final_metrics;';
	  execute vl_test_query;


		vl_test_query:= format('Create temp table tb_tmp_final_metrics as
			select * from
			(select * from tb_tmp_strategy_pcd_metrics
			union
			select * from tb_tmp_strategy_sub_total_metrics
			) s
			order by strategy_id,strategy_name,pcd_start_date;',_end_date,_start_date,_timeline);


		RAISE NOTICE 'SQL 12 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL 12 statement: %', end_time - start_time;

      vl_test_query :=  'drop table if exists tb_tmp_last_pcd_dates_cte;';
	  execute vl_test_query;

		vl_test_query:= format('Create temp table tb_tmp_last_pcd_dates_cte as
			select
				strategies.strategy_id,
				max(pcd_start_date) as pcd_start_date
			from
				(select distinct strategy_id from tb_tmp_final_metrics) strategies
			left join
				price_markdown.tb_strategy_pcd tsp
				on strategies.strategy_id = tsp.strategy_id
			group by
				strategies.strategy_id;',_end_date,_start_date,_timeline);

		RAISE NOTICE 'SQL 13 statement: %', vl_test_query		;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL 13 statement: %', end_time - start_time;

		vl_test_query:=format('drop table if exists public.TB_dashboard_table_data_%1$s',in_user_id);
        execute vl_test_query;

		vl_test_query:= format('create unlogged table public.TB_dashboard_table_data_%5$s as select jsonb_build_object(
			''timeline'',jsonb_build_object(
				''start_date'',  %2$L::date,
				''end_date'',(%1$L::date + interval %3$L)::date
			),
			''table_data'',
				jsonb_agg(
					json_build_object(
						''strategy_id'',fm.strategy_id,
						''strategy_name'',fm.strategy_name,
						''step_count'', tsm.step_count,
						''pcd_id'',fm.pcd_id,
						''pcd_start_date'',fm.pcd_start_date::date,
						''pcd_end_date'',fm.pcd_end_date::date,
						''is_sub_total'',fm.is_sub_total,
						''alert_count'',fm.alert_count,
						''initially_approved'',fm.initially_approved,
						''finally_approved'',fm.finally_approved,
						''not_approved'',fm.not_approved,
						''unique_key'',gen_random_uuid(),
						''products_count'',fm.products_count,
						''stores_count'',fm.stores_count,
						''read_only'', case when date(timezone(%4$L, now())) >= pcd_data.pcd_start_date then true else false end,
					''metrics'',jsonb_build_object(
						''bl_gm_percent'',fm.bl_gm_percent,
						''bl_aum_$'',fm.bl_aum_$,
						''bl_aur_$'',fm.bl_aur_$,
						''bl_revenue_$'',fm.bl_revenue_$,
						''bl_gm_$'',fm.bl_gm_$,
						''bl_sales_units'',fm.bl_sales_units,
						''bl_clearance_discount'',fm.bl_clearance_discount,
						''bl_markdown_$'',fm.bl_markdown_$,
						''bl_inventory_cost'',fm.bl_inventory_cost,
						''bl_inventory_retail'',fm.bl_inventory_retail,
						''ia_reco_gm_percent'',fm.ia_reco_gm_percent,
						''ia_reco_aum_$'',fm.ia_reco_aum_$,
						''ia_reco_aur_$'',fm.ia_reco_aur_$,
						''ia_reco_revenue_$'',fm.ia_reco_revenue_$,
						''ia_reco_gm_$'',fm.ia_reco_gm_$,
						''ia_reco_sales_units'',fm.ia_reco_sales_units,
						''ia_reco_clearance_discount'',fm.ia_reco_clearance_discount,
						''ia_reco_markdown_$'',fm.ia_reco_markdown_$,
						''ia_reco_inventory_cost'',fm.ia_reco_inventory_cost,
						''ia_reco_inventory_retail'',fm.ia_reco_inventory_retail,
						''lw_gm_percent'',fm.lw_gm_percent,
						''lw_aum'',fm.lw_aum,
						''lw_aur_$'',fm.lw_aur,
						''lw_revenue_$'',fm.lw_revenue,
						''lw_gm_$'',fm.lw_gm_dollar,
						''lw_sales_units'',fm.lw_sales_units,
						''lw_clearance_discount'',fm.lw_clearance_discount,
						''lw_markdown_dollar'',fm.lw_markdown_dollar,
						''till_date_gm_percent'',fm.till_date_gm_percent,
						''till_date_aum_$'',fm.till_date_aum,
						''till_date_aur_$'',fm.till_date_aur,
						''till_date_revenue_$'',fm.till_date_revenue,
						''till_date_gm_$'',fm.till_date_gm_dollar,
						''till_date_sales_units'',fm.till_date_sales_units,
						''till_date_clearance_discount'',fm.till_date_clearance_discount,
						''till_date_markdown_dollar'',fm.till_date_markdown_dollar,
						''bl_inventory'',fm.bl_inventory,
						''ia_reco_inventory'',fm.ia_reco_inventory,
						''bl_sell_through'',fm.bl_sell_through,
						''ia_reco_sell_through'',fm.ia_reco_sell_through,
						''lw_sell_through'',fm.lw_sell_through,
						''till_date_sell_through'',fm.till_date_sell_through,
						''lw_inventory'',fm.lw_inventory,
						''till_date_inventory'',fm.till_date_inventory
					)
					)
					order by fm.strategy_id,fm.strategy_name,fm.pcd_start_date
				)
			) as final_response,
			%6$L as _strategy_id,
			%7$L as product_h1 ,
			%8$L as product_h2 ,
			%9$L as product_h3 ,
			%10$L as product_h4 ,
			%11$L as product_h5      ,
			%12$L as store_h1   ,
			%13$L as store_h2   ,
			%14$L as store_h3   ,
			%15$L as store_h4   ,
			%16$L as store_h5   ,
			%3$L as _timeline  ,
			%17$L as _view_by   ,
			%2$L as _start_date,
			%1$L as _end_date ,
			%4$L as timezone
			from
				tb_tmp_final_metrics fm
			left join
				tb_tmp_last_pcd_dates_cte pcd_data
				on fm.strategy_id = pcd_data.strategy_id
			left join
				price_markdown.tb_strategy_master tsm
				on fm.strategy_id = tsm.strategy_id;',_end_date,_start_date,_timeline,timezone,in_user_id,
							   _strategy_id, product_h1 , product_h2 , product_h3 , product_h4, product_h5,
							   _s0_ids, _s1_ids, _s2_ids, _s3_ids, _s4_ids, _view_by);

		RAISE NOTICE 'SQL final statement: %', vl_test_query;
		start_time := clock_timestamp();
		execute vl_test_query;
		end_time := clock_timestamp();
		RAISE NOTICE 'Time taken SQL final statement: %', end_time - start_time;
		vl_test_query := format('Select final_response from public.TB_dashboard_table_data_%1$s;',in_user_id);
		return query  execute vl_test_query;
	else
		return query  execute dummy_data_query;
	end if;
	--raise notice 'query: %', q2;
END;
$function$
;
