--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_create_forecast_partitions stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_create_forecast_partitions

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_create_forecast_partitions;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_create_forecast_partitions(IN start_date date, IN end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    CALL base_pricing_restaurant.sp_create_weekly_partitions('bp_simulation_week', start_date, end_date);
    CALL base_pricing_restaurant.sp_create_weekly_partitions('bp_simulation_promo_week', start_date, end_date);
    CALL base_pricing_restaurant.sp_create_weekly_partitions('bp_simulation_day_split_ratio', start_date, end_date);
    CALL base_pricing_restaurant.sp_create_weekly_partitions('bp_simulation_day_split_ratio_kvi', start_date, end_date);
    CALL base_pricing_restaurant.sp_create_weekly_partitions('bp_simulation_store_split_ratio', start_date, end_date);
    CALL base_pricing_restaurant.sp_create_weekly_partitions('bp_simulation_store_split_ratio_kvi', start_date, end_date);
END;
$procedure$
;