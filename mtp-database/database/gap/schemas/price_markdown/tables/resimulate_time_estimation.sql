--liquibase formatted sql
--changeset liquibase:resimulate_time_estimation stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for resimulate_time_estimation
CREATE TABLE price_markdown.resimulate_time_estimation (
	sku_store_combo int4 NULL,
	no_of_days int4 NULL,
	time_estimate float8 NULL
);