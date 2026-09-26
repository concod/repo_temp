--liquibase formatted sql
--changeset liquibase:vamsi.balaga@impactanalytics.co:fn_load_simulate_input_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_load_simulate_input_table

drop function if exists price_markdown.fn_load_simulate_input_table;
CREATE OR REPLACE FUNCTION price_markdown.fn_load_simulate_input_table(
    p_strategy_id int,
    p_input_discounts text,
    p_user_id int,
    copy_from_ia bool default false
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    declare
        _query text;
    begin

        insert into price_markdown.tb_simulation_speed (strategy_id,user_id,discount_insertion_start)
        values (p_strategy_id,p_user_id,now())
        on conflict(strategy_id) do update
        set (discount_insertion_start, user_id, is_bulk_simulation) = (now(), p_user_id, false);

        execute format('drop table if exists price_markdown_temp.tb_simulate_input_%1$s',p_strategy_id);


        if copy_from_ia then
            _query =  format(
                'create unlogged table price_markdown_temp.tb_simulate_input_%1$s as
                    WITH data(json_array) AS (
                        VALUES (''%2$s''::json)
                    ),
                    updated_discount_values as (
                        SELECT
                            %1$s as strategy_id,
                            case when (json_data->>''product_level_id'') is not null then (json_data->>''product_level_id'')::int8 else cpy.product_level_id end as product_level_id,
                            case when (json_data->>''product_level_value'') is not null then (json_data->>''product_level_value'') else cpy.product_level_value end as product_level_value,
                            case when (json_data->>''store_level_id'') is not null then (json_data->>''store_level_id'')::int8 else cpy.store_level_id end as store_level_id,
                            case when (json_data->>''store_level_value'') is not null then (json_data->>''store_level_value'') else cpy.store_level_value end as store_level_value,
                            case when (json_data->>''pcd_id'') is not null then (json_data->>''pcd_id'')::int else cpy.pcd_id end as pcd_id,
                            tsp.pcd_start_date,
                            case when (json_data->>''discount_percent'') is not null then (json_data->>''discount_percent'')::float else cpy.discount_percent end as discount_percent,
                            case when (json_data->>''is_locked'') is not null then (json_data->>''is_locked'')::int2 else cpy.is_locked end as is_locked,
                            ''Not Approved''::price_markdown.strategy_approval_status_enum as approval_status,
                            array[]::int[] as include_pcds
                        FROM
                            data, json_array_elements(json_array) AS json_data
                        full outer join
                            (
                                select
                                    strategy_id,
                                    pcd_id,
                                    product_level_id,
                                    product_level_value,
                                    store_level_id,
                                    store_level_value,
                                    is_row_locked as is_locked,
                                    recommended_offer_percentage as discount_percent
                                from
                                price_markdown_temp.tb_copy_table_data_cte_%1$s
                                where copied_from_ia is true
                            ) cpy
                        on
                            cpy.pcd_id = (json_data->>''pcd_id'')::int
                            and cpy.product_level_id = (json_data->>''product_level_id'')::int8
                            and cpy.store_level_id = (json_data->>''store_level_id'')::int8
                        inner join
                            price_markdown.tb_strategy_pcd tsp
                        on tsp.pcd_id = coalesce((json_data->>''pcd_id'')::int,cpy.pcd_id)
                    )
                    select
                        udv.*,
                        array_agg(pcd_id) over (partition by product_level_id,store_level_id) as updated_pcd_ids
                    from updated_discount_values udv
                ',
                p_strategy_id,
                p_input_discounts
            );
        else
            _query = format('
                create unlogged table price_markdown_temp.tb_simulate_input_%1$s as
                WITH data(json_array) AS (
                    VALUES (''%2$s''::jsonb)
                )
                SELECT
                    %1$s as strategy_id,
                    (json_data->>''product_level_id'')::int8 AS product_level_id,
                    (json_data->>''product_level_value'') AS product_level_value,
                    (json_data->>''store_level_id'')::int8 AS store_level_id,
                    (json_data->>''store_level_value'') AS store_level_value,
                    (json_data->>''pcd_id'')::int AS pcd_id,
                    (json_data->>''discount_percent'')::float AS discount_percent,
                    (json_data->>''is_locked'')::int2 AS is_locked,
                    translate(json_data->>''include_pcds''::text,''[]'',''{}'')::int[] as include_pcds,
                    ''Not Approved''::price_markdown.strategy_approval_status_enum as approval_status,
                    false as copied_from_ia
                FROM data, jsonb_array_elements(json_array) AS json_data
                order by
                    product_level_value, store_level_value, pcd_id;
            ',
            p_strategy_id,
            p_input_discounts
            );
        end if;


        execute _query;

    end;
$function$
;
