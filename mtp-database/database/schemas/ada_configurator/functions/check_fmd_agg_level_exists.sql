--liquibase formatted sql
--changeset manoj.solanki@impactanalytics.co:check_fmd_agg_level_exists1 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: same combination for skip or continous fix
--rollback: SELECT 1
DROP FUNCTION IF EXISTS ada_configurator.check_fmd_agg_level_exists(p_product_level jsonb, p_store_level jsonb, p_time_level jsonb);
CREATE OR REPLACE FUNCTION ada_configurator.check_fmd_agg_level_exists(p_product_level jsonb, p_store_level jsonb, p_time_level jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_agg_level_id INT;
BEGIN
    SELECT agg_level_id INTO v_agg_level_id
    FROM ada_configurator.fmd_agg_level
    WHERE (product_level::jsonb - 'hierarchy_type' - 'time_type' - 'options') = (p_product_level::jsonb - 'hierarchy_type' - 'time_type' - 'options')
    AND (store_level::jsonb - 'hierarchy_type' - 'time_type' - 'options') = (p_store_level::jsonb - 'hierarchy_type' - 'time_type' - 'options')
    AND (time_level::jsonb - 'hierarchy_type' - 'time_type' - 'options') = (p_time_level::jsonb - 'hierarchy_type' - 'time_type' - 'options');
    IF v_agg_level_id IS NOT NULL THEN
        RETURN v_agg_level_id;
    ELSE
        RETURN -1;
    END IF;
END;
$function$
;