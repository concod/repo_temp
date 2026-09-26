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

--changeset utkarsh.tiwari@impactanalytics.co:step4_fetch_time_estimate_collection_reco_level_to_array stripComments:false splitStatements:false context:Release_1_0 labels:discount_level_migration
--comment: migrate product_recommendation_level and store_recommendation_level from int4 to integer[] to match tb_strategy_master
ALTER TABLE price_markdown.step4_fetch_time_estimate_collection ALTER COLUMN product_recommendation_level DROP DEFAULT;
ALTER TABLE price_markdown.step4_fetch_time_estimate_collection ALTER COLUMN store_recommendation_level DROP DEFAULT;
ALTER TABLE price_markdown.step4_fetch_time_estimate_collection
    ALTER COLUMN product_recommendation_level TYPE integer[]
    USING CASE WHEN product_recommendation_level IS NOT NULL THEN ARRAY[product_recommendation_level] ELSE NULL END;
ALTER TABLE price_markdown.step4_fetch_time_estimate_collection
    ALTER COLUMN store_recommendation_level TYPE integer[]
    USING CASE WHEN store_recommendation_level IS NOT NULL THEN ARRAY[store_recommendation_level] ELSE NULL END;