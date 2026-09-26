--liquibase formatted sql
--changeset liquibase:optimization_time_estimate stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for optimization_time_estimate


CREATE TABLE price_markdown_opt.optimization_time_estimate (
	id serial4 NOT NULL,
	stg_id int4 NULL,
	product_recommendation_level int4 NULL,
	store_recommendation_level int4 NULL,
	sku int4 NULL,
	store int4 NULL,
	pcd int4 NULL,
	discount int4 NULL,
	actual_total_combination int4 NULL,
	total_record_sent int4 NULL,
	time_estimate_sec int4 NULL
);
