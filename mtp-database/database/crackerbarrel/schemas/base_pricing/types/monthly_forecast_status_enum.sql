--liquibase formatted sql
--changeset vishnuvardhan@impactanalytics.co:monthly_forecast_status_enum_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.monthly_forecast_status_enum_1

CREATE TYPE base_pricing.monthly_forecast_status_enum AS ENUM (
    'NOT_READY',
    'READY_TO_FORECAST',
    'IN_PROGRESS',
    'COMPLETED',
    'READY_TO_REFRESH',
    'REFRESHING',
    'FAILED'
);
