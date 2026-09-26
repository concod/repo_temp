--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_fetch_workbench_table_data_12 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changed store hierarchy filter logic
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_fetch_workbench_table_data;
CREATE OR REPLACE FUNCTION price_markdown.fn_fetch_workbench_table_data(_strategy_ids integer[], _l0_ids integer[], _l1_ids integer[], _l2_ids integer[], _l3_ids integer[], _l4_ids integer[], _brand integer[], _s0_ids integer[], _s1_ids integer[], _s2_ids integer[], _start_date date, _end_date date, _timezone text, _user_id integer DEFAULT NULL::integer, _status integer[] DEFAULT NULL::integer[])
 RETURNS TABLE(
    strategy_id integer, strategy_name text, step_count integer, status text, status_id integer, created_at date, start_date date, end_date date,
    version_number integer,root_strategy integer,is_child boolean, product_recommendation_level text, store_recommendation_level text,
    is_optimisation_running boolean, products integer, stores integer,
    sales_units integer, revenue double precision, margin double precision, markdown_spend double precision, sell_through_target real, revenue_target real,
    gm_dollar_target real, gm_percent_target real, sales_units_target real, sell_through_priority integer, revenue_priority integer, gm_dollar_priority integer,
    gm_percent_priority integer, sales_units_priority integer, alert_message text, read_only boolean, current_main_strategy boolean
)
 LANGUAGE plpgsql
AS $function$
DECLARE
    query_ text :=  '';
    filtered_strategy_ids integer[];
    product_hierarchy_level integer;
    product_hierarchy_values integer[];
    strategy_where_arr text[];
    start_time TIMESTAMP;
    end_time TIMESTAMP;

begin
    if array_length(_strategy_ids, 1) > 0 then
        query_ = format(
            '
            with root_strategy_cte as (
                select  
                    coalesce(root_strategy,strategy_id) as root_strategy
                from price_markdown.tb_strategy_master
                where strategy_id in (%1$s)
            ),
            strategy_with_other_versions_cte as (
                select
                    strategy_id
                from price_markdown.tb_strategy_master
                where coalesce(root_strategy,strategy_id) in (select root_strategy from root_strategy_cte)
            )
            select 
                array_agg(strategy_id)
            from price_markdown.tb_strategy_master
            where strategy_id in (select strategy_id from strategy_with_other_versions_cte);
        ',
        array_to_string(_strategy_ids,',')
        );
        raise notice 'query: %',query_;
       	execute query_ into filtered_strategy_ids; 
    else
        if array_length(_l4_ids, 1) > 0 then
            product_hierarchy_level := 4;
            product_hierarchy_values := _l4_ids;
        elsif array_length(_l3_ids, 1) > 0 then
            product_hierarchy_level := 3;
            product_hierarchy_values := _l3_ids;
        elsif array_length(_l2_ids, 1) > 0 then
            product_hierarchy_level := 2;
            product_hierarchy_values := _l2_ids;
        elsif array_length(_l1_ids, 1) > 0 then
            product_hierarchy_level := 1;
            product_hierarchy_values := _l1_ids;
        elsif array_length(_l0_ids,1) > 0 then
            product_hierarchy_level := 0;
            product_hierarchy_values := _l0_ids;
        end if;

        if product_hierarchy_level is not null then
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
                    and s1_ids && array[%2$s]::bigint[]
                    and (
                        array_length(array[%3$s]::bigint[],1) is null
                        or s2_ids && array[%3$s]::bigint[]
                    )
            )',
            array_to_string(_s0_ids,','),
            array_to_string(_s1_ids,','),
            array_to_string(_s2_ids,',')
            )
        );

        if array_length(_brand, 1) > 0 then
                strategy_where_arr := array_append(strategy_where_arr, format('and sm.strategy_id IN (
                        SELECT
                            strategy_id
                        FROM
                            price_markdown.tb_strategy_hierarchy
                        WHERE is_product_hierarchy = 1
                        AND hierarchy_level = 0
                        AND hierarchy_value = ANY(array[%1$s])
                    )', array_to_string(_brand, ','))) ;
        end if;

       	if array_length(_status, 1) > 0 then
        	strategy_where_arr := array_append(strategy_where_arr, format(' and sm.status in (%1$s) ', array_to_string(_status, ',')));
        end if;

        query_ := format('select array_agg(sm.strategy_id) from price_markdown.tb_strategy_master sm where
                    sm.start_date <= ''%1$s''::date
                    and sm.end_date >= ''%2$s''::date
                    %3$s', _end_date, _start_date, array_to_string(strategy_where_arr, ' '));
        raise notice ' strategy filter query ----- %', query_;
        start_time := clock_timestamp();
        execute query_ into filtered_strategy_ids;
        end_time := clock_timestamp();
        RAISE NOTICE 'query1 time: %', end_time - start_time;

    end if;

    if array_length(filtered_strategy_ids, 1) > 0 then
        query_ := format('
                    with fin_metrics_cte as (
                        select
                            strategy_id,
                            sales_units_fin AS sales_units,
                            revenue_fin AS revenue,
                            margin_fin AS margin,
                            spend_fin AS spend
                        from
                            price_markdown.tb_stg_metric
                        where strategy_id in  (%1$s)
                    ),
                    strategy_objectives_cte as (
                        select
                            tso.strategy_id ,
                            max(case when tasm."name" = ''st_percent'' then tso.objective_value end) as sell_through,
                            max(case when tasm."name" = ''revenue'' then tso.objective_value end) as revenue,
                            max(case when tasm."name" = ''gm_dollar'' then tso.objective_value end) as gm_dollar,
                            max(case when tasm."name" = ''gm_percent'' then tso.objective_value end) as gm_percent,
                            max(case when tasm."name" = ''sales_units'' then tso.objective_value end) as sales_units,
                            max(case when tasm."name" = ''st_percent'' then tso.strategy_objective_id end) as sell_through_id,
                            max(case when tasm."name" = ''revenue'' then tso.strategy_objective_id end) as revenue_id,
                            max(case when tasm."name" = ''gm_dollar'' then tso.strategy_objective_id end) as gm_dollar_id,
                            max(case when tasm."name" = ''gm_percent'' then tso.strategy_objective_id end) as gm_percent_id,
                            max(case when tasm."name" = ''sales_units'' then tso.strategy_objective_id end) as sales_units_id
                        from
                            price_markdown.tb_strategy_objective tso
                        left join metaschema.tb_app_sub_master tasm on
                            tso.objective_type_id = tasm.id
                        where
                            tso.strategy_id in (%1$s)
                        group by
                            tso.strategy_id
                    ),
                    draft_child_strategy_exists_cte as (
                        select
                            distinct
                            parent_strategy
                        from price_markdown.tb_strategy_master
                        where parent_strategy in (%1$s)
                        and status not in (-1,-2)
                    ),
                    strategy_objectives_rules_cte as (
                        select
                            soc.strategy_id,
                            soc.sell_through,
                            soc.revenue,
                            soc.gm_dollar,
                            soc.gm_percent,
                            soc.sales_units,
                            max(case when soc.sell_through_id = tsr.constraint_id then tsr.priority end) as sell_through_priority,
                            max(case when soc.revenue_id = tsr.constraint_id then tsr.priority end) as revenue_priority,
                            max(case when soc.gm_dollar_id = tsr.constraint_id then tsr.priority end) as gm_dollar_priority,
                            max(case when soc.gm_percent_id = tsr.constraint_id then tsr.priority end) as gm_percent_priority,
                            max(case when soc.sales_units_id = tsr.constraint_id then tsr.priority end) as sales_units_priority
                        from
                            strategy_objectives_cte soc
                        left join price_markdown.tb_strategy_rule tsr
                            on soc.strategy_id = tsr.strategy_id
                        group by
                            soc.strategy_id,
                            soc.sell_through,
                            soc.revenue,
                            soc.gm_dollar,
                            soc.gm_percent,
                            soc.sales_units
                    ),
                    last_pcd_dates_cte as(
                        select
                            tsm.strategy_id,
                            max(pcd_start_date) as pcd_start_date
                        from
                            (select strategy_id from price_markdown.tb_strategy_master where strategy_id in (%1$s)) tsm
                        left join
                            price_markdown.tb_strategy_pcd tsp
                            on tsm.strategy_id = tsp.strategy_id
                        group by
                            tsm.strategy_id
                    ),
                    current_main_strategy_cte as (
                        select
                            coalesce(root_strategy,strategy_id) as strategy_id,
                            max(version_number) as version_number
                        from price_markdown.tb_strategy_master
                        where strategy_id in (%1$s)
                        and status not in (-1,-2)
                        group by coalesce(root_strategy,strategy_id)
                    )
                    select
                        str_mstr.strategy_id as strategy,
                        str_mstr.strategy_name,
                        str_mstr.step_count::integer,
                        ssc.status_name::text as status,
						ssc.status_id,
                        Date(str_mstr.created_at),
                        str_mstr.start_date,
                        str_mstr.end_date,
                        str_mstr.version_number,
                        coalesce(str_mstr.root_strategy,str_mstr.strategy_id) as root_strategy,
                        case when str_mstr.parent_strategy is null then false else true end as is_child,
                        tvbc1.display_name::text as product_recommendation_level,
                        tvbc2.display_name::text as store_recommendation_level,
                        str_mstr.is_optimisation_running,
                        cnt_cte.sku_count::integer as products,
                        cnt_cte.store_count::integer as stores,
                        max(bmc.sales_units)::integer as sales_units,
                        max(bmc.revenue)::double precision as revenue,
                        max(bmc.margin)::double precision as margin,
                        max(bmc.spend)::double precision as markdown_spend,
                        sorc.sell_through::real as sell_through_target,
                        sorc.revenue::real as revenue_target,
                        sorc.gm_dollar::real as gm_dollar_target,
                        sorc.gm_percent::real as gm_percent_target,
                        sorc.sales_units::real as sales_units_target,
                        sorc.sell_through_priority::integer,
                        sorc.revenue_priority::integer,
                        sorc.gm_dollar_priority::integer,
                        sorc.gm_percent_priority::integer,
                        sorc.sales_units_priority::integer,
                        case
                            when usc.alert_message_disable_flag is not true and str_mstr.status in (0, 1) and date(timezone(''%2$s'', now())) >= str_mstr.start_date - 3 and date(timezone(''%2$s'', now())) < str_mstr.start_date then ''Finalise the strategy before '' || to_char(str_mstr.start_date, ''MM/DD/YYYY'')::text
                            else null::text
                        end as alert_message,
                        case
                            when date(timezone(''%2$s'', now())) >= max(pcd_data.pcd_start_date) then true
							when str_mstr.status in (-1,-2,6) then true
                            when csec.parent_strategy is not null then true
                            else false
                        end as read_only,
                        case
                            when str_mstr.version_number = cmsc.version_number or cmsc.version_number is null then true
                            else false
                        end as current_main_strategy

                    from
                        (select * from price_markdown.tb_strategy_master where strategy_id in (%1$s) ) str_mstr
                    left join
                        price_markdown.tb_strategy_sku_store_count cnt_cte on cnt_cte.strategy_id = str_mstr.strategy_id
                    left join
                        price_markdown.tb_strategy_status_config ssc on str_mstr.status = ssc.status_id
                    left join
                        fin_metrics_cte bmc on str_mstr.strategy_id = bmc.strategy_id
                    left join
                        price_markdown.tb_view_by_config tvbc1 on str_mstr.product_recommendation_level = tvbc1.value and tvbc1.category = ''product_level''
                    left join
                        price_markdown.tb_view_by_config tvbc2 on str_mstr.store_recommendation_level = tvbc2.value and tvbc2.category = ''store_level''
                    left join
                        strategy_objectives_rules_cte sorc on str_mstr.strategy_id = sorc.strategy_id
                    left join
                        last_pcd_dates_cte pcd_data on str_mstr.strategy_id = pcd_data.strategy_id
                    left join
                        price_markdown.user_strategy_config as usc on str_mstr.strategy_id = usc.strategy_id
                    left join
                        draft_child_strategy_exists_cte csec on csec.parent_strategy = str_mstr.strategy_id
                    left join
                        current_main_strategy_cte cmsc on cmsc.strategy_id = coalesce(str_mstr.root_strategy,str_mstr.strategy_id)
                    group by
                        str_mstr.strategy_id,
                        str_mstr.strategy_name,
                        str_mstr.step_count,
                        ssc.status_name,
                        ssc.status_id,
                        str_mstr.status,
                        str_mstr.created_at,
                        str_mstr.start_date,
                        str_mstr.end_date,
                        str_mstr.version_number,
                        str_mstr.root_strategy,
                        csec.parent_strategy,
                        tvbc1.display_name,
                        tvbc2.display_name,
                        str_mstr.is_optimisation_running,
                        sorc.sell_through,
                        sorc.revenue,
                        sorc.gm_dollar,
                        sorc.gm_percent,
                        sorc.sales_units,
                        sorc.sell_through_priority,
                        sorc.revenue_priority,
                        sorc.gm_dollar_priority,
                        sorc.gm_percent_priority,
                        sorc.sales_units_priority,
                        cnt_cte.sku_count,
                        cnt_cte.store_count,
                        str_mstr.parent_strategy,
                        usc.alert_message_disable_flag,
                        cmsc.version_number
                    order by
                        Date(str_mstr.created_at) DESC;
        ',
        array_to_string(filtered_strategy_ids,','),
        _timezone
        );
    else
        query_ := 'select   null::integer, null::text, null::integer, null::text, null::integer, null::date, null::date, null::date, null::integer, null::integer,
							null::boolean, null::text, null::text, null::boolean, null::integer, null::integer, null::integer, null::double precision, null::double precision,
							null::double precision, null::real, null::real, null::real, null::real, null::real, null::integer, null::integer, null::integer, null::integer,
							null::integer, null::text, null::boolean, null::boolean';
    end if;
    raise notice 'final query ---------- %', query_;
    start_time := clock_timestamp();
    return query execute query_;
    end_time := clock_timestamp();
    RAISE NOTICE 'query2 time: %', end_time - start_time;
END;
$function$
;