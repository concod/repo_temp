--liquibase formatted sql
--changeset vishnuvardhan@impactanalytics.co:bp_forecast_cal_config_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_forecast_cal_config_10

CREATE TABLE base_pricing.bp_forecast_cal_config (
    forecast_type varchar(50) NOT NULL,
    label varchar(50) NULL,
    projection_mode varchar(20) NULL,
    start_reference varchar(100) NULL,
    end_reference varchar(50) NULL,
    cumulative_quarters int4[] NULL,
    is_active bool DEFAULT true NOT NULL,
    CONSTRAINT bp_forecast_cal_config_pkey PRIMARY KEY (forecast_type)
);

--changeset vishnu.vardhan@impactanalytics.co:bp_forecast_cal_config_2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: Add default_selected, display_order, and disable_selection columns to bp_forecast_cal_config
ALTER TABLE base_pricing.bp_forecast_cal_config 
ADD COLUMN default_selected BOOL DEFAULT false NOT NULL;

ALTER TABLE base_pricing.bp_forecast_cal_config 
ADD COLUMN display_order INT4 NULL;

ALTER TABLE base_pricing.bp_forecast_cal_config 
ADD COLUMN disable_selection BOOL DEFAULT false NOT NULL;
