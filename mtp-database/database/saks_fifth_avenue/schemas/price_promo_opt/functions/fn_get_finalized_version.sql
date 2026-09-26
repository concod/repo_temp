
--liquibase formatted sql
--changeset vaibhav@:fn_get_finalized_version_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_get_finalized_version

DROP FUNCTION IF EXISTS price_promo_opt.fn_get_finalized_version ;
     
CREATE OR REPLACE FUNCTION price_promo_opt.fn_get_finalized_version(p_promo_id integer[])
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    _result JSON;
BEGIN
    select JSON_OBJECT_AGG(finalized_version, scenario_id) into _result
from
(
select finalized_version, jsonb_agg(scenario_id) as scenario_id
from
(
SELECT promo_id,
    CASE
WHEN last_approved_scenario_id > 0 THEN 'scenario'
WHEN last_approved_scenario_id = 0
    THEN 'ia' end as finalized_version,
CASE
WHEN last_approved_scenario_id > 0 THEN last_approved_scenario_id
WHEN last_approved_scenario_id = 0
    THEN promo_id end as scenario_id
FROM
    (
    SELECT promo_id,
        last_approved_scenario_id,
        GENERATE_SERIES(start_date, end_date, INTERVAL '1 day') AS dates
    FROM
        price_promo.promo_master
    WHERE
        promo_id = any(p_promo_id)
        AND last_approved_scenario_id IS NOT NULL
    ) a
group by 1,2,3
) a
group by 1) b;

    RETURN _result;
END;
$function$
;
