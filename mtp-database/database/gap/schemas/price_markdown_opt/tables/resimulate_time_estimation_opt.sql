--liquibase formatted sql
--changeset liquibase:resimulate_time_estimation_opt stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for resimulate_time_estimation_opt


CREATE TABLE price_markdown_opt.resimulate_time_estimation_opt (
	id serial4 NOT NULL,
	strategy_id int4 NOT NULL,
	sku_store_combo int4 NULL,
	no_of_days int4 NULL,
	time_estimate int4 NULL
);