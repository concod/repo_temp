--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_refresh_aggregated_attributes_mv_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_refresh_aggregated_attributes_mv_10

DROP FUNCTION IF EXISTS base_pricing.fn_refresh_aggregated_attributes_mv;

CREATE OR REPLACE FUNCTION base_pricing.fn_refresh_aggregated_attributes_mv()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW base_pricing.mv_aggregated_attributes_master;
END;
$function$
;