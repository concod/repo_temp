--liquibase formatted sql
--changeset liquibase:optimization_time_estimate_tool stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for optimization_time_estimate_tool
CREATE TABLE price_markdown.optimization_time_estimate_tool (
	product_recommendation_level int4 NULL,
	store_recommendation_level int4 NULL,
	sku int4 NULL,
	store int4 NULL,
	pcd int4 NULL,
	discount int4 NULL,
	time_estimate_sec float8 NULL
);
