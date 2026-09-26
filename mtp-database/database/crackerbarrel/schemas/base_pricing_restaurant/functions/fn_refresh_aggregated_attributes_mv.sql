--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_refresh_aggregated_attributes_mv stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_refresh_aggregated_attributes_mv

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_refresh_aggregated_attributes_mv;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_refresh_aggregated_attributes_mv()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW base_pricing_restaurant.mv_aggregated_attributes_master;
END;
$function$
;