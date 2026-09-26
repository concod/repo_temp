--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_delete_promo_metrics_and_update_status_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: fn_delete_promo_metrics_and_update_status_3


DROP FUNCTION IF EXISTS price_promo.fn_delete_promo_metrics_and_update_status;

CREATE OR REPLACE FUNCTION price_promo.fn_delete_promo_metrics_and_update_status(p_promo_ids integer[])
RETURNS void
LANGUAGE plpgsql
SECURITY definer
AS $function$
DECLARE
    scenario_ids integer[];  
    sql_query text;
   	scenario_based_delete_query text := '';
BEGIN
    BEGIN
        SELECT array_agg(sm.scenario_id) 
        INTO scenario_ids
        FROM price_promo.scenario_master sm
        WHERE sm.promo_id = ANY(p_promo_ids);
       	
       if array_length(scenario_ids, 1) > 0 then
       		scenario_based_delete_query = format('DELETE FROM price_promo.ps_recommended_scenarios WHERE scenario_id IN (%1$s);', array_to_string(scenario_ids, ','));
       end if;

        sql_query := format('
            %1$s

            DELETE FROM price_promo.ps_recommended_scenarios_agg
            WHERE promo_id IN (%2$s);

            DELETE FROM price_promo.ia_scenario_master
            WHERE promo_id IN (%2$s);

            DELETE FROM price_promo.ia_ps_scenario_discounts
            WHERE promo_id IN (%2$s);

            DELETE FROM price_promo.ps_recommended_ia_projected
            WHERE promo_id IN (%2$s);

            DELETE FROM price_promo.ps_recommended_ia_projected_agg
            WHERE promo_id IN (%2$s);

            DELETE FROM price_promo.ps_recommended_finalized
            WHERE promo_id IN (%2$s);

            DELETE FROM price_promo.ps_recommended_finalized_agg
            WHERE promo_id IN (%2$s);

            -- Update the promo_master table
            UPDATE price_promo.promo_master
            SET status = 0,
                last_approved_scenario_id = NULL,
                recommendation_type_id = NULL
            WHERE promo_id IN (%2$s);
        ', scenario_based_delete_query, array_to_string(p_promo_ids, ','));
		RAISE NOTICE ' metrics delete query : %', sql_query;
        EXECUTE sql_query;

    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Error in fn_delete_promo_metrics_and_update_status_temp: %', SQLERRM;
            RAISE;
    END;
END;
$function$
;