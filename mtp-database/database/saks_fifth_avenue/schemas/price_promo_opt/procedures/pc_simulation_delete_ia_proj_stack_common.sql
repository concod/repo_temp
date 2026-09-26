--liquibase formatted sql
--changeset vaibhav@:pc_simulation_delete_ia_proj_stack_common_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_simulation_delete_ia_proj_stack_common

DROP PROCEDURE IF EXISTS price_promo_opt.pc_simulation_delete_ia_proj_stack_common;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_simulation_delete_ia_proj_stack_common(IN var_promo_id integer, IN var_disocunt_filter text, IN edit_mode integer DEFAULT 0)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query_1 text;
BEGIN

    -- Construct the DELETE query dynamically
    IF edit_mode = 1 THEN
        -- Include recommendation_date > CURRENT_DATE in the query if in edit_mode
        query_1 := format('DELETE FROM price_promo.ps_recommended_stack_ia_%s
            WHERE (product_id, s0_id, s1_id, recommendation_date) IN
            (
                SELECT product_id, s0_id, s1_id, date
                FROM %s
                WHERE recommendation_date > CURRENT_DATE
            );', var_promo_id, var_disocunt_filter);
    ELSE
        -- Regular delete query without recommendation_date condition
        query_1 := format('DELETE FROM price_promo.ps_recommended_stack_ia_%s
            WHERE (product_id, s0_id, s1_id, recommendation_date) IN
            (
                SELECT product_id, s0_id, s1_id, date
                FROM %s
            );', var_promo_id, var_disocunt_filter);
    END IF;

    -- Execute the dynamic query
    EXECUTE query_1;

END;
$procedure$
;
