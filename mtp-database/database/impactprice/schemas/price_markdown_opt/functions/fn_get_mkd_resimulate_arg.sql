--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co::fn_get_mkd_resimulate_arg_01042026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_get_mkd_resimulate_arg_01042026

DROP FUNCTION IF EXISTS price_markdown_opt.fn_get_mkd_resimulate_arg(int4, int4, int4);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_get_mkd_resimulate_arg(_strategy_id integer, _min_strategy_disc_id integer, _max_strategy_disc_id integer)
 RETURNS TABLE(pcd_start_date character varying, min_week_start character varying, max_week_start character varying)
 LANGUAGE plpgsql
AS $function$
begin
    return query
    with pcd_start_end as (
    SELECT 1 as id,
             MIN(a2.pcd_start_date) pcd_start_date
         FROM (
            SELECT (pcd.value->>'pcd_id')::integer as pcd_id
            FROM price_markdown.tb_strategy_discount_level tsd
            CROSS JOIN LATERAL jsonb_each(tsd.pcd_data) as pcd(key, value)
            WHERE tsd.strategy_id = _strategy_id
            AND tsd.id BETWEEN _min_strategy_disc_id AND _max_strategy_disc_id
            AND (pcd.value->>'sim_flag')::integer = 1
            GROUP BY 1
            ) a1
         INNER JOIN (
            SELECT tsp.pcd_id, tsp.pcd_start_date
            FROM price_markdown.tb_strategy_pcd_new tsp
            WHERE tsp.strategy_id = _strategy_id
            ) a2 
         ON a1.pcd_id = a2.pcd_id
    ),
    min_week as (
    select 1 as id,
        fisc.weeks_start_date -7 min_week_start
    from pcd_start_end t1
    JOIN pricesmart.tb_fiscal_date_mapping fisc
    ON fisc.date =  t1.pcd_start_date
    group by 1,2
    ),
    max_week as (
    select 1 as id, fisc.weeks_start_date + 7 as max_week_start
    from (
        SELECT tsm.end_date as pcd_end_date
        FROM price_markdown.tb_strategy_master tsm
        WHERE tsm.strategy_id = _strategy_id) q1
    inner join pricesmart.tb_fiscal_date_mapping fisc
    ON q1.pcd_end_date = fisc.date
    group by 1,2
    )
    select b1.pcd_start_date::varchar as pcd_start_date,
           b2.min_week_start::varchar as min_week_start, 
           b3.max_week_start::varchar as max_week_start
    from pcd_start_end b1 
    inner join min_week b2 
    ON b1.id = b2.id
    inner join max_week b3
    on b1.id = b3.id;
   end;
    $function$
;