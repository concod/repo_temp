--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:sample_table_forecast_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for sample_table_forecast_version

create table if not exists inventory_smart.sample_table_forecast_version (
 version_code int4 not null,
 product_code varchar not null,
 article varchar not null,
 store_code varchar null,
 fiscal_year_week int4 null,
 adjusted_forecast_qty int4 null,
 CONSTRAINT sample_table_forecast_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
) 
partition by list (version_code);