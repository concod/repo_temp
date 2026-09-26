--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.co:fn_get_mkd_resimulate_arg_06012026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_get_mkd_resimulate_arg

DROP FUNCTION IF EXISTS price_markdown_opt.fn_get_mkd_resimulate_arg(int4, int4, int4);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_get_mkd_resimulate_arg(_strategy_id integer, _min_strategy_disc_id integer, _max_strategy_disc_id integer)
 RETURNS TABLE(pcd_start_date character varying, min_week_start character varying, max_week_start character varying)
 LANGUAGE plpgsql
AS $function$
declare
_fn_get_mkd_resimulate_arg_query text;
begin
    _fn_get_mkd_resimulate_arg_query = format('with pcd_start_end as (
    SELECT 1 as id,
             MIN(a2.pcd_start_date) pcd_start_date
         FROM (
            SELECT tsd.pcd_id
              FROM price_markdown_opt_temp.tb_stg_disc_local_temp_%1$s tsd
              WHERE tsd.strategy_id = %1$s
              and tsd.id BETWEEN %2$s AND %3$s
              group by 1
              ) a1
         INNER JOIN (
            SELECT tsp.pcd_id, tsp.pcd_start_date
            FROM price_markdown.tb_strategy_pcd tsp
            WHERE tsp.strategy_id = %1$s
            ) a2 
         ON a1.pcd_id = a2.pcd_id
    ),
    min_week as (
    select 1 as id,
        fisc.weeks_start_date -7 min_week_start
    from pcd_start_end t1
    JOIN global.tb_fiscal_date_mapping fisc
    ON fisc.date =  t1.pcd_start_date
    group by 1,2
    ),
    max_week as (
    select 1 as id, fisc.weeks_start_date + 7 as max_week_start
    from (
        SELECT tsm.end_date as pcd_end_date
        FROM price_markdown.tb_strategy_master tsm
        WHERE tsm.strategy_id = %1$s) q1
    inner join global.tb_fiscal_date_mapping fisc
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
    on b1.id = b3.id;', _strategy_id, _min_strategy_disc_id, _max_strategy_disc_id);
   raise notice '_fn_get_mkd_resimulate_arg_query : %', _fn_get_mkd_resimulate_arg_query;
  return query execute _fn_get_mkd_resimulate_arg_query;
   end;
    $function$
;