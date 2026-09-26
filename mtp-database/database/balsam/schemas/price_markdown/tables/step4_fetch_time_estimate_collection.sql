--liquibase formatted sql
--changeset liquibase:step4_fetch_time_estimate_collection stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for step4_fetch_time_estimate_collection
CREATE TABLE price_markdown.step4_fetch_time_estimate_collection (
	product_recommendation_level int4 NULL,
	store_recommendation_level int4 NULL,
	sku int4 NULL,
	store int4 NULL,
	pcd int4 NULL,
	time_estimate_sec float8 NULL
);