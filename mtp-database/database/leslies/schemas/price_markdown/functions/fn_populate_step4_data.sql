--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_populate_step4_data_7 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_populate_step4_data_7
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_populate_step4_data;


CREATE OR REPLACE FUNCTION price_markdown.fn_populate_step4_data(in_strategy_id integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$


declare
	vl_rule_id int;
	vl_rule_type int ;
	vl_end_rule real;

	start_time TIMESTAMP;
    end_time TIMESTAMP;
    _client_timezone text;
	vl_test_query text;

begin
	select rule_id into vl_rule_id from price_markdown.tb_rule_master trm where rule_type = 44;
	select end_rule into vl_end_rule from (select unnest(applicable_value) as end_rule from price_markdown.tb_strategy_rule t1  where strategy_id = in_strategy_id and constraint_type = 0 and status = 0 and constraint_id = vl_rule_id) ddd limit 1;
	raise notice 'vl_end_rule -- %' , vl_end_rule;

    _client_timezone = (select remarks from metaschema.tb_app_sub_master where name = 'client_timezone');

	execute format('drop table if exists price_markdown_temp.tb_strategy_step4_full_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_temp.tb_sku_store_date_cte_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_temp.tb_override_cte%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_temp.tb_override_final_cte_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_temp.tb_ia_recc_cte_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_temp.tb_current_week_metric_cte_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_temp.tb_ia_recc_cte_final_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_temp.tb_overall_metrics_cte_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_temp.tb_future_week_data_%1$s;', in_strategy_id);
    execute format('drop table if exists price_markdown_temp.tb_table_data_cte_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_temp.tb_step4_final_result_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_temp.tb_step4_data_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_temp.tb_strategies_combine_%1$s ;',in_strategy_id);
    execute format('drop table if exists price_markdown_temp.tb_strategies_union_ia_%1$s ;',in_strategy_id);
	execute format('drop table if exists price_markdown_temp.tb_strategy_step4_full_%1$s ;',in_strategy_id);
	execute format('drop table if exists price_markdown_temp.tb_agg_actuals_alerts_%1$s ;',in_strategy_id);

	vl_test_query := format('
        create unlogged table price_markdown_temp.tb_sku_store_date_cte_%1$s as
        select
            tsp.strategy_id,
            sssm.product_level_id,
            sssm.store_level_id,
            sssm.product_level_value,
            sssm.store_level_value,
            tsp.pcd_id,
            tsp.pcd_start_date,
            tsp.pcd_end_date,
			sssm.brand,
            sssm.department,
            sssm.class,
            sssm.mfg,
			sssm.age
        from
            (select * from price_markdown.tb_strategy_pcd where strategy_id = %1$L) tsp
            inner join
            (
                select strategy_id, product_level_id, store_level_id, product_level_value, store_level_value,
                array_agg(distinct pm.brand) as brand,
                array_agg(distinct pm.l2_cuq) as department,
                array_agg(distinct pm.l3_cuq) as class,
                array_agg(distinct pm.mfg_name) as mfg,
				case 
			        when tssm.channel_info = ''Omni'' then avg(pm.max_age)
			        when tssm.channel_info = ''Store'' then avg(pm.store_age)
			        else avg(pm.ecom_age) 
			    end as age
                from price_markdown.tb_strategy_sku_store_mapping tssm
                join price_markdown.product_master pm
                	on 
                		tssm.product_id = pm.product_id
                where strategy_id = %1$L
                group by 1,2,3,4,5,tssm.channel_info
            ) sssm using(strategy_id);',
        in_strategy_id
    );

    execute vl_test_query;


	vl_test_query := format('
        create unlogged table price_markdown_temp.tb_strategies_combine_%1$s as
        select
            fin.pcd_id,
            fin.product_level_id,
            fin.store_level_id,
            case when SUM(fin.sales_units) > 0 then (SUM(fin.effective_price_point * fin.sales_units) / SUM(fin.sales_units))
            else AVG(fin.effective_price_point)
            end as selling_price,
            round(sum(fin.sales_units)::decimal, 2) as sales_units,
            round(sum(fin.margin)::decimal, 2) as margin,
            round(sum(fin.revenue)::decimal, 2) as revenue,
			(coalesce(sum(fin.rem_inv) filter(where fin.recommendation_date = cte.pcd_end_date), 0)) + round(sum(fin.sales_units)::decimal, 2) as inventory,
            round(sum(fin.spend)::decimal, 2) as markdown_dollar
        from
            price_markdown.tb_agg_fin fin
		join 
        price_markdown_temp.tb_sku_store_date_cte_%1$s cte
	        on fin.pcd_id = cte.pcd_id
	        and fin.product_level_id = cte.product_level_id
	        and fin.store_level_id = cte.store_level_id
        where fin.strategy_id = %1$s
        group by
            fin.pcd_id,
            fin.product_level_id,
            fin.store_level_id
;',
        in_strategy_id
    );

	raise notice 'Query 2-A ---- %', vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken SQL 2-A statement: %', end_time - start_time;


	vl_test_query := format('
        create unlogged table price_markdown_temp.tb_override_cte%1$s as
        select
            sdc.strategy_id,
            sdc.product_level_id,
            sdc.store_level_id,
            sdc.product_level_value,
            sdc.store_level_value,
            sdc.pcd_id,
            fin.selling_price,
            fin.sales_units,
            fin.margin,
            fin.revenue,
            sdc.pcd_start_date,
            sdc.pcd_end_date,
            coalesce(
                round(cast(fin.selling_price as numeric), 2),
                round(cast(fin.selling_price -(%2$L::numeric / 100) as numeric), 1)+( %2$L::numeric/ 100)
            ) as effective_price_point,
			fin.inventory,
            fin.markdown_dollar,
			case 
			    when fin.inventory = 0 then 0
			    else (fin.sales_units * 100) / fin.inventory
			end as sell_through,
			sdc.brand,
            sdc.department,
            sdc.class,
            sdc.mfg,
			sdc.age
        from
            price_markdown_temp.tb_sku_store_date_cte_%1$s  sdc
        left join
            price_markdown_temp.tb_strategies_combine_%1$s fin on
        (fin.pcd_id = sdc.pcd_id and fin.product_level_id = sdc.product_level_id and fin.store_level_id = sdc.store_level_id);',
        in_strategy_id,
        vl_end_rule
    );

	raise notice 'query-2-B --%' , vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken SQL 2-B statement: %', end_time - start_time;


	vl_test_query := format('
        create unlogged table price_markdown_temp.tb_override_final_cte_%1$s as
        select
            bl.*,
            round(sd.markdown_percentage::decimal,2) as recommended_offer_percentage,
            sd.incremental_discount,
            round(sd.previous_markdown_percentage::decimal,2) as previous_markdown_percentage,
            sd.approval_status,
            sd.average_retail_price,
            case
                when sd.is_locked is null then 0
                else sd.is_locked
            end as is_locked
        from
            price_markdown_temp.tb_override_cte%1$s bl
        left join
            price_markdown.tb_strategy_discount_%1$s  sd
        on bl.product_level_id = sd.product_level_id and bl.store_level_id = sd.store_level_id and sd.pcd_id = bl.pcd_id ;',
        in_strategy_id
    );

	raise notice 'query-3 A --%' , vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken SQL 3 statement: %', end_time - start_time;

	vl_test_query := format('
        create unlogged table price_markdown_temp.tb_strategies_union_ia_%1$s as
        select
            ia.strategy_id,
            ia.product_level_id,
            ia.store_level_id,
            ia.pcd_id,
            case
                when SUM(ia.sales_units) > 0 then (SUM(ia.effective_price_point * ia.sales_units) / SUM(ia.sales_units))
                else AVG(ia.effective_price_point)
            end as ia_selling_price,
            round(sum(ia.sales_units)::decimal, 2) as ia_sales_units,
            round(sum(ia.margin)::decimal, 2) as ia_margin,
            round(sum(ia.revenue)::decimal, 2) as ia_revenue,
			(coalesce(sum(ia.rem_inv) filter(where ia.recommendation_date = cte.pcd_end_date), 0)) + round(sum(ia.sales_units)::decimal, 2) as inventory,
            round(sum(ia.spend)::decimal, 2) as markdown_dollar
        from
            price_markdown.tb_agg_ia ia
		join 
	        price_markdown_temp.tb_sku_store_date_cte_%1$s cte
	        on ia.pcd_id = cte.pcd_id
	        and ia.product_level_id = cte.product_level_id
	        and ia.store_level_id = cte.store_level_id
        where ia.strategy_id = %1$s
        group by
            ia.strategy_id,
            ia.product_level_id,
            ia.store_level_id,
            ia.pcd_id;',
        in_strategy_id
    );

	raise notice 'query-4-A --%' , vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken SQL 4-A statement: %', end_time - start_time;

	vl_test_query := format('
        create unlogged table price_markdown_temp.tb_ia_recc_cte_%1$s as
        select
            sdc.strategy_id,
            sdc.product_level_id,
            sdc.store_level_id,
            sdc.product_level_value,
            sdc.store_level_value,
            sdc.pcd_id,
            ia.ia_selling_price,
            ia.ia_sales_units,
            ia.ia_margin,
            ia.ia_revenue,
            sdc.pcd_start_date,
            sdc.pcd_end_date,
            case
                when %2$L is null then round(cast(ia.ia_selling_price as numeric), 2)
                else ROUND(cast(ia.ia_selling_price -(%2$L::numeric / 100) as numeric), 1)+(%2$L::numeric / 100)
            end as ia_effective_price_point,
			ia.inventory,
			ia.markdown_dollar,
			case 
			    when ia.inventory = 0 then 0
			    else (ia.ia_sales_units * 100) / ia.inventory
			end as sell_through
        from
            price_markdown_temp.tb_sku_store_date_cte_%1$s sdc
        left join
            price_markdown_temp.tb_strategies_union_ia_%1$s ia on ia.product_level_id = sdc.product_level_id and ia.store_level_id = sdc.store_level_id and ia.pcd_id = sdc.pcd_id;',
        in_strategy_id,
        vl_end_rule
    );

	raise notice 'query-4-B --%' , vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken SQL 4-B statement: %', end_time - start_time;


	vl_test_query := format('
        create unlogged table price_markdown_temp.tb_ia_recc_cte_final_%1$s as
        select
            ia.*,
            round(sd.markdown_percentage::decimal,2) as ia_recommended_offer_percentage,
            round(sd.previous_markdown_percentage::decimal,2) as ia_previous_markdown_percentage,
            sd.incremental_discount as ia_incremental_discount
        from
            price_markdown_temp.tb_ia_recc_cte_%1$s ia
        left join
            price_markdown.tb_strategy_discount_ia_%1$s  sd
        on ia.product_level_id = sd.product_level_id and ia.store_level_id = sd.store_level_id and sd.pcd_id = ia.pcd_id;
        ',
        in_strategy_id
    );

	raise notice 'query-5 --%' , vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken SQL 5 statement: %', end_time - start_time;

	--Subtotal query
	vl_test_query := format('
        create table price_markdown_temp.tb_overall_metrics_cte_%1$s as
        select
            1 as order_,
            true as is_footer_row,
            ''Sub total'' as rowId,
            null::int as product_level_id,
            ''Sub total'' as product_level_value,
            null::int as store_level_id,
            null::text as store_level_value,
            null::float as cw_offer_percentage,
            null::float as cw_incremental_discount,
            null::float as cw_effective_price_point,
            0 as is_row_locked,
            null::price_markdown.strategy_approval_status_enum as min_approval_status,
            null::price_markdown.strategy_approval_status_enum as max_approval_status,
			null::text[] as brand,
            null::text[] as department,
            null::text[] as class,
            null::text[] as mfg,
			null::float8 as age,
            null::float8 as base_price,
			null::integer as upcoming_pcd_id,
            jsonb_object_agg(
                ''pcd_'' || od.pcd_id::text,
                jsonb_build_object(
                    ''finalized_discount_percent'', round(recommended_offer_percentage, 0),
                    ''finalized_pp'', round(effective_price_point::numeric, 2),
                    ''incremental_discount'',price_markdown.fn_get_incremental_discount(
                        recommended_offer_percentage,
                        coalesce(previous_markdown_percentage,0)
                    ),
                    ''ia_incremental_discount'', price_markdown.fn_get_incremental_discount(
                        ia_recommended_offer_percentage,
                        ia_previous_markdown_percentage
                    ),
                    ''ia_reco_discount_percent'', round(ia_recommended_offer_percentage, 0),
                    ''ia_reco_pp'', round(ia_effective_price_point::numeric, 2),
                    ''ia_incremental_discount'',round(ia_incremental_discount::numeric,2),
                    ''margin_finalized'', round(margin::decimal, 2),
                    ''revenue_finalized'', round(revenue::decimal, 2),
                    ''unit_finalized'', round(sales_units::decimal, 2),
                    ''unit_ia_reco'', round(ia_sales_units::decimal, 2),
                    ''margin_ia_reco'', round(ia_margin::decimal, 2),
                    ''revenue_ia_reco'', round(ia_revenue::decimal, 2),
					''finalized_inventory'', bl_inventory,
					''finalized_markdown_dollar'', bl_markdown_dollar,
					''ia_inventory'', ia_inventory,
					''ia_markdown_dollar'', ia_markdown_dollar,
					''finalized_sell_through'', bl_sell_through,
					''ia_sell_through'', ia_sell_through
                )
            ) as pcd_metrics
        from (
            select
                bl.pcd_id,
                recommended_offer_percentage,
                ia_recommended_offer_percentage,
                previous_markdown_percentage,
                ia_previous_markdown_percentage,
                coalesce(
                    effective_price_point,
                    (100-recommended_offer_percentage)*average_retail_price/100
                ) as effective_price_point,
                coalesce(
                    ia_effective_price_point,
                    (100-ia_recommended_offer_percentage)*average_retail_price/100
                ) as ia_effective_price_point,
                ia_incremental_discount,
                ia_sales_units,
                ia_margin,
                ia_revenue,
                sales_units,
                margin,
                revenue,
				bl_inventory,
				bl_markdown_dollar,
				ia_inventory,
				ia_markdown_dollar,
				bl_sell_through,
				ia_sell_through
            from (
                select
                    bl.pcd_id,
                    avg(recommended_offer_percentage) as recommended_offer_percentage,
                    avg(previous_markdown_percentage) as previous_markdown_percentage,
                    avg(effective_price_point) as effective_price_point,
                    avg(average_retail_price) as average_retail_price,
                    sum(sales_units) as sales_units,
                    sum(margin) as margin,
                    sum(revenue) as revenue,
					sum(bl.inventory) as bl_inventory,
					sum(bl.markdown_dollar) as bl_markdown_dollar,
					avg(bl.sell_through) as bl_sell_through
                from
                    price_markdown_temp.tb_override_final_cte_%1$s bl
                group by
                    bl.pcd_id
            ) bl
            full outer join
            (
                select
                    ia.pcd_id,
                    avg(ia_recommended_offer_percentage) as ia_recommended_offer_percentage,
                    avg(ia_previous_markdown_percentage) as ia_previous_markdown_percentage,
                    avg(ia_effective_price_point) as ia_effective_price_point,
                    sum(ia_sales_units) as ia_sales_units,
                    sum(ia_margin) as ia_margin,
                    avg(ia_incremental_discount) as ia_incremental_discount,
                    sum(ia_revenue) as ia_revenue,
					sum(ia.inventory) as ia_inventory,
					sum(ia.markdown_dollar) as ia_markdown_dollar,
					avg(ia.sell_through) as ia_sell_through
                from
                    price_markdown_temp.tb_ia_recc_cte_final_%1$s ia
                group by
                    ia.pcd_id
            ) ia
            on bl.pcd_id = ia.pcd_id
        ) od',
        in_strategy_id
    );


	raise notice 'query-6 --%' , vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken SQL 6 statement: %', end_time - start_time;


	--current_week_metric_cte
	vl_test_query := format('
        create unlogged table price_markdown_temp.tb_current_week_metric_cte_%1$s as
                with current_pcd_cte as (
                    select pcd_id from price_markdown.tb_strategy_pcd b
                    where strategy_id = %1$L and
                    date(
                        timezone(
                            (select remarks from metaschema.tb_app_sub_master where name = ''client_timezone''),
                            now()
                        )
                    ) between b.pcd_start_date and b.pcd_end_date
                )
				select
					sdc.strategy_id,
					sdc.product_level_id,
					sdc.product_level_value,
					sdc.store_level_id,
					sdc.store_level_value,
					sdc.pcd_id,
					round(sdc.markdown_percentage::decimal, 2) as cw_offer_percentage,
                    sdc.incremental_discount as cw_incremental_discount,
                    coalesce(
                        current_pcd_metrics.effective_price_point,
                        (100-sdc.markdown_percentage)*average_retail_price/100
                    ) as cw_effective_price_point
				from price_markdown.tb_strategy_discount_%1$s sdc
                left join (
                    select
                        product_level_id,
                        store_level_id,
                        pcd_id,
                        case
						when %2$L is null then round(cast(fin.selling_price as numeric), 2)
						else ROUND(cast(fin.selling_price -(%2$L::numeric / 100) as numeric), 1)+(%2$L::numeric / 100)
                        end as effective_price_point
                    from (
                        select
                        product_level_id,
                        store_level_id,
                        pcd_id,
                        case
                            when SUM(fin.sales_units) > 0 then (SUM(fin.effective_price_point * fin.sales_units) / SUM(fin.sales_units))
                            else AVG(fin.effective_price_point)
                        end as selling_price
                        from price_markdown.tb_agg_fin fin
                        where pcd_id = (select pcd_id from current_pcd_cte) and strategy_id = %1$s
                        group by 1,2,3
                    ) fin
                ) current_pcd_metrics
                on current_pcd_metrics.product_level_id = sdc.product_level_id and
                    current_pcd_metrics.store_level_id = sdc.store_level_id
                    and current_pcd_metrics.pcd_id = sdc.pcd_id
                where
                    sdc.pcd_id = (select pcd_id from current_pcd_cte)
        ',
        in_strategy_id,
        vl_end_rule
    );

	raise notice 'query-7 --%' , vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken SQL 7 statement: %', end_time - start_time;


     vl_test_query = format(
        '
            create unlogged table price_markdown_temp.tb_future_week_data_%1$s as
            with future_pcd_cte as (
                select
                    min(pcd_id) as pcd_id
                from price_markdown.tb_strategy_pcd
                where strategy_id = %1$s
                    and (
                        pcd_start_date > date(timezone(''%2$s'',now()))
                        or pcd_end_date = (select end_date from price_markdown.tb_strategy_master where strategy_id = %1$s)
                    )
            )
            select
				pcd_id,
                product_level_id,
                store_level_id,
                min(approval_status) as fw_approval_status
            from price_markdown.tb_strategy_discount_%1$s
            where pcd_id = (select pcd_id from future_pcd_cte)
            group by pcd_id, product_level_id,store_level_id
        ',
        in_strategy_id,
        _client_timezone
    );

    raise notice 'Next Week Query - %'  , vl_test_query;
    execute vl_test_query;
   
   --Alerts query
	vl_test_query := format('
	    create unlogged table price_markdown_temp.tb_agg_actuals_alerts_%1$s as
	    select
	        act.strategy_id,
	        act.product_level_id,
	        act.store_level_id,
	        min(act.pcd_id) as pcd_id,
	        min(tfw.pcd_id) as next_pcd_id,
	        sum(act.sales_units) as actual_sales_units,
	        sum(fin.sales_units) as fin_sales_units,
            sum(act.sales_units) - sum(fin.sales_units) as sales_units_diff,
	        min(ia.markdown_percentage) as ia_discount_next_pcd,
	        min(next_fin.markdown_percentage) as fin_discount_next_pcd,
	        case
	            when (abs(sum(act.sales_units) - sum(fin.sales_units)) * 100 / nullif((sum(act.sales_units) + sum(fin.sales_units)) / 2, 0)) > 10
	                 and min(ia.markdown_percentage) != min(next_fin.markdown_percentage)
					 and abs(sum(act.sales_units) - sum(fin.sales_units)) >= 1 then true
	            else false
	        end as show_alert
	    from
	        price_markdown.tb_agg_actual act
	    join
	        price_markdown.tb_agg_fin fin
	        on act.pcd_id = fin.pcd_id
	        and act.product_level_id = fin.product_level_id
	        and act.store_level_id = fin.store_level_id
			and act.recommendation_date = fin.recommendation_date
	    left join 
	        price_markdown_temp.tb_future_week_data_%1$s tfw
	        on act.product_level_id = tfw.product_level_id
			and act.store_level_id = tfw.store_level_id
	    left join
	        price_markdown.tb_strategy_discount_ia ia
	        on ia.pcd_id = tfw.pcd_id
	        and ia.product_level_id = act.product_level_id
	        and ia.store_level_id = act.store_level_id
	    left join
	        price_markdown.tb_strategy_discount next_fin
	        on next_fin.pcd_id = tfw.pcd_id
	        and next_fin.product_level_id = act.product_level_id
	        and next_fin.store_level_id = act.store_level_id
		where
			act.strategy_id = %1$s
			and fin.strategy_id = %1$s
			and ia.strategy_id = %1$s
			and next_fin.strategy_id = %1$s
		group by
			act.strategy_id,
			act.product_level_id,
	        act.store_level_id;',
	    in_strategy_id
	);

	raise notice 'Alerts Query - %'  , vl_test_query;
	execute vl_test_query;

	--table_data_cte
	vl_test_query := format('
        create unlogged table price_markdown_temp.tb_table_data_cte_%1$s as
        select
            bl.strategy_id,
            bl.pcd_id,
            0 as order_,
            false as is_footer_row,
            bl.product_level_value || ''_'' || bl.store_level_value as rowId,
            bl.product_level_id::int,
            bl.product_level_value::text,
            bl.store_level_id::int,
            bl.store_level_value::text,
            cw_offer_percentage,
            cw_incremental_discount,
            cw_effective_price_point,
            bl.is_locked as is_row_locked,
            recommended_offer_percentage,
            bl.incremental_discount,
            bl.approval_status,
			bl.inventory as bl_inventory,
            bl.markdown_dollar as bl_markdown_dollar,
			ia.inventory as ia_inventory,
            ia.markdown_dollar as ia_markdown_dollar,
			bl.sell_through as bl_sell_through,
			ia.sell_through as ia_sell_through,
			bl.brand,
            bl.department,
            bl.class,
            bl.mfg,
			bl.age,
			coalesce(taa.show_alert, false) as show_alert,
			taa.sales_units_diff,
        	taa.ia_discount_next_pcd,
			bl.average_retail_price as base_price,
			taa.next_pcd_id as upcoming_pcd_id,
            coalesce(
                round(effective_price_point::numeric, 2),
                round(
                    ((100-bl.recommended_offer_percentage)*bl.average_retail_price/100)::decimal,
                    2
                )
            ) as effective_price_point,
            margin,
            revenue,
            sales_units,
            ia_recommended_offer_percentage,
            ia_incremental_discount,
            coalesce(
                round(ia_effective_price_point::numeric,2),
                round(
                    ((100-ia_recommended_offer_percentage)*bl.average_retail_price/100)::decimal,
                    2
                )
            ) as ia_effective_price_point,
            ia_sales_units,
            ia_margin,
            ia_revenue,
            bl.is_locked,
            case
                when bl.recommended_offer_percentage is null then false
                else true
            end as enable_lock
        from
            price_markdown_temp.tb_override_final_cte_%1$s bl
                left join
            (select
                ia.strategy_id,
                ia.product_level_id,
                ia.store_level_id,
                ia.product_level_value,
                ia.store_level_value,
                ia.pcd_id,
                ia.ia_selling_price,
                ia.ia_sales_units,
                ia.ia_margin,
                ia.ia_revenue,
                ia.pcd_start_date,
                ia.pcd_end_date,
                ia.ia_effective_price_point,
                ia.ia_recommended_offer_percentage,
                ia.ia_incremental_discount,
                cw.cw_offer_percentage,
                cw.cw_incremental_discount,
                cw.cw_effective_price_point,
				ia.inventory,
				ia.markdown_dollar,
				ia.sell_through
            from
                price_markdown_temp.tb_ia_recc_cte_final_%1$s ia
            left join
                price_markdown_temp.tb_current_week_metric_cte_%1$s cw on cw.product_level_id = ia.product_level_id and ia.store_level_id = cw.store_level_id
        ) ia on (bl.strategy_id = ia.strategy_id and bl.pcd_id = ia.pcd_id and bl.product_level_id = ia.product_level_id and bl.store_level_id = ia.store_level_id and bl.pcd_id = ia.pcd_id)
		left join(
				select 
					pcd_id,
					next_pcd_id,
					sales_units_diff,
	        		ia_discount_next_pcd,
					show_alert,
					product_level_id,
					store_level_id
				from
					price_markdown_temp.tb_agg_actuals_alerts_%1$s 
			) taa on ia.pcd_id = taa.pcd_id and taa.product_level_id = ia.product_level_id and taa.store_level_id = ia.store_level_id;',
        in_strategy_id
    );


	raise notice 'query-8 --%' , vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken SQL 8 statement: %', end_time - start_time;


	vl_test_query:= format('
		create table price_markdown_temp.tb_strategy_step4_full_%1$s as
		with pcd_mapping as (

            select tsp.pcd_id,next_pcd.pcd_id as next_pcd_id,
            previous_pcd.pcd_id as previous_pcd_id
            from price_markdown.tb_strategy_pcd tsp
            left  join (
                select pcd_id,pcd_start_date from price_markdown.tb_strategy_pcd where strategy_id =  %1$L
            ) next_pcd
            on tsp.pcd_end_date = next_pcd.pcd_start_date - interval ''1 day''
            left join (
                select pcd_id, pcd_end_date from price_markdown.tb_strategy_pcd where strategy_id = %1$L

            ) previous_pcd
            on tsp.pcd_start_date = previous_pcd.pcd_end_date + interval ''1 day''
            where tsp.strategy_id = %1$L

		)
		select * from (
			select
				rowId,
				is_footer_row,
				min(is_row_locked) as is_row_locked,
				product_level_id,
				product_level_value,
				store_level_id,
				store_level_value ,
				max(cw_offer_percentage) as cw_offer_percentage,
                max(cw_incremental_discount) as cw_incremental_discount,
                max(cw_effective_price_point) as cw_effective_price_point,
				min(recommended_offer_percentage) as min_offer_value,
				max(recommended_offer_percentage) as max_offer_value,
                coalesce(min(approval_status),''Not Approved''::price_markdown.strategy_approval_status_enum) as min_approval_status,
                coalesce(max(approval_status),''Not Approved''::price_markdown.strategy_approval_status_enum) as max_approval_status,
				brand,
	            department,
	            class,
	            mfg,
				age,
				max(base_price) as base_price,
				bool_or(coalesce(show_alert, false)) as show_alert,
				max(sales_units_diff) as sales_units_diff,
	        	max(ia_discount_next_pcd) as ia_discount_next_pcd,
				max(upcoming_pcd_id) as upcoming_pcd_id,
				jsonb_object_agg(
					''pcd_'' || pcd_id::text, jsonb_build_object(
						''finalized_is_locked'', false,
						''finalized_discount_percent'', recommended_offer_percentage,
                        ''incremental_discount'', incremental_discount,
                        ''approval_status'',coalesce(approval_status,''Not Approved''::price_markdown.strategy_approval_status_enum),
						''finalized_pp'', effective_price_point::numeric,
						''margin_finalized'', margin,
						''revenue_finalized'', revenue,
						''unit_finalized'', round(sales_units),
						''ia_reco_discount_percent'', ia_recommended_offer_percentage,
                        ''ia_incremental_discount'',ia_incremental_discount,
						''ia_reco_pp'', ia_effective_price_point::numeric,
						''unit_ia_reco'', round(ia_sales_units),
						''margin_ia_reco'', ia_margin,
						''revenue_ia_reco'', ia_revenue,
						''is_locked'', is_locked,
						''enable_lock'', enable_lock,
						''next_pcd'',next_pcd_id,
						''previous_pcd'',previous_pcd_id,
						''finalized_inventory'', bl_inventory,
						''finalized_markdown_dollar'', bl_markdown_dollar,
						''ia_inventory'', ia_inventory,
						''ia_markdown_dollar'', ia_markdown_dollar,
						''finalized_sell_through'', bl_sell_through,
						''ia_sell_through'', ia_sell_through
					)
				) as pcd_metrics,
				null::integer as optimisation_type
			from
				price_markdown_temp.tb_table_data_cte_%1$s
			inner join
				pcd_mapping using(pcd_id)
			group by
				product_level_id,
				product_level_value,
				store_level_id,
				store_level_value ,
				rowId,
				is_footer_row,
				brand,
	            department,
	            class,
	            mfg,
				age
		) dd;',in_strategy_id);

	raise notice 'query- Final --%' , vl_test_query;
	start_time := clock_timestamp();
	execute vl_test_query;
	end_time := clock_timestamp();
	RAISE NOTICE 'Time taken SQL 9 statement: %', end_time - start_time;


	execute format('update price_markdown.tb_strategy_master set final_data_prepared=true where strategy_id=%1$s', in_strategy_id);
	raise notice 'Strategy data flag updated';

  end;
$function$
;