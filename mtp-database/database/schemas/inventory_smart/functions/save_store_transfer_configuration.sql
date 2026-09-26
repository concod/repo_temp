--liquibase formatted sql
--changeset rajan.sahu:removing_conditional_CASE_statements_for_key_names runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-134746
--comment: removing conditional CASE statements for key names
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.save_store_transfer_configuration(text);
CREATE OR REPLACE FUNCTION inventory_smart.save_store_transfer_configuration(p_temp_table_name text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    sql_text text;
BEGIN
    sql_text := format($q$
        WITH src AS (
            SELECT DISTINCT ON (t.article)
                t.article,
                t.optimisation_level,
                t.transfer_strategy,
                t.transfer_rule_id,
                jsonb_strip_nulls(
                    jsonb_build_object(
                        'dc_inventory_threshold', t.dc_inventory_threshold,
                        'fixed_push_percent', t.fixed_push_percent,
                        'source_wos_threshold_multiplier', t.source_wos_threshold_multiplier,
                        'dest_wos_threshold_multiplier', t.dest_wos_threshold_multiplier
                    )
                ) AS config_params
            FROM public.%I t
            ORDER BY t.article 
        )
        INSERT INTO inventory_smart.store_transfer_config
            (article, optimisation_level, transfer_strategy, transfer_rule_id, config_params, is_enabled)
        SELECT
            s.article, s.optimisation_level, s.transfer_strategy, s.transfer_rule_id, s.config_params, TRUE
        FROM src s
        ON CONFLICT (article) 
        DO UPDATE SET
            optimisation_level = EXCLUDED.optimisation_level,
            transfer_strategy = EXCLUDED.transfer_strategy,
            transfer_rule_id = EXCLUDED.transfer_rule_id,
            config_params = EXCLUDED.config_params,
            is_enabled = TRUE;
    $q$, p_temp_table_name);

    RAISE NOTICE 'MAIN_QUERY : %', sql_text;
    EXECUTE sql_text;
END;
$function$
;