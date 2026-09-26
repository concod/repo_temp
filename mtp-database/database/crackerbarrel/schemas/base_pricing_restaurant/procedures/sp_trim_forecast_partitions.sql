--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_trim_forecast_partitions stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_trim_forecast_partitions

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_trim_forecast_partitions;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_trim_forecast_partitions(IN dry_run boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    CALL base_pricing_restaurant.sp_remove_empty_partitions('bp_simulation_week', dry_run);
    CALL base_pricing_restaurant.sp_remove_empty_partitions('bp_simulation_promo_week', dry_run);
    CALL base_pricing_restaurant.sp_remove_empty_partitions('bp_simulation_day_split_ratio', dry_run);
    CALL base_pricing_restaurant.sp_remove_empty_partitions('bp_simulation_day_split_ratio_kvi', dry_run);
    CALL base_pricing_restaurant.sp_remove_empty_partitions('bp_simulation_store_split_ratio', dry_run);
    CALL base_pricing_restaurant.sp_remove_empty_partitions('bp_simulation_store_split_ratio_kvi', dry_run);
END;
$procedure$
;