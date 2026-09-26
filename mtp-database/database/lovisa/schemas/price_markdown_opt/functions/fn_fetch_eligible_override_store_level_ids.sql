--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:fn_fetch_eligible_override_store_level_ids_17022026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_fetch_eligible_override_store_level_ids

DROP FUNCTION IF EXISTS price_markdown_opt.fn_fetch_eligible_override_store_level_ids;

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_fetch_eligible_override_store_level_ids(
    p_strategy_id integer
)
RETURNS TABLE(store_level_id bigint)
LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
    SELECT distinct ssm.store_level_id
    FROM price_markdown.tb_strategy_sku_store_mapping ssm
    INNER JOIN price_markdown.tb_store_master sm
        ON sm.store_id = ssm.store_id
    WHERE ssm.strategy_id = p_strategy_id
      AND sm.s0_name = 'ASIA'
      AND sm.country_name IN ('Ghana', 'Lebanon', 'Cyprus')
    GROUP BY ssm.store_level_id
    HAVING COUNT(DISTINCT sm.s1_id) = 1;

END;
$function$;
