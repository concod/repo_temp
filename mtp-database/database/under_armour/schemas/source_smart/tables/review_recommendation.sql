--liquibase formatted sql
--changeset mayank.mukundam:review_recommendation stripComments:false splitStatements:false context:Release_1_1 labels:adding_review_recommendation_table
--comment: adding review recommendation table

CREATE TABLE source_smart.review_recommendation (
	product_code varchar(255) NULL,
	allocation_id uuid NULL,
	operation_id uuid NULL,
	forecast_version varchar(255) NULL,
	subregion varchar(255) NULL,
	allocated_units int4 NULL,
	user_edited_units int4 NULL,
	vendor_id int4 NULL,
	allocated_factory int4 NULL,
	user_edited_factory int4 NULL,
	allocated_smv int4 NULL,
	season_id varchar(255) NULL,
	plan_name varchar(255) NULL,
	l0 varchar(255) NULL
);

--changeset mayank.mukundam@impactanalytics.co:review_recommendation_index stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: adding index for review_recommendation
CREATE INDEX idx_review_recommendation_product_l0_forecast ON source_smart.review_recommendation(product_code, l0, forecast_version);

--changeset mayank.mukundam@impactanalytics.co:review_recommendation_index2 stripComments:false splitStatements:false context:Release_1_3 labels:liquibase_project_start
--comment: adding index for review_recommendation
DROP INDEX IF EXISTS source_smart.review_recommendation_product_code_idx;

CREATE INDEX review_recommendation_product_code_idx 
ON source_smart.review_recommendation 
USING btree (product_code, l0, season_id, forecast_version);

--changeset genuine.basil@impactanalytics.co:review_recommendation_idx_alloc_op stripComments:false splitStatements:false context:Release_1_4 labels:liquibase_project_start
--comment: indexes on allocation_id and operation_id for Table B lookups 
CREATE INDEX IF NOT EXISTS review_recommendation_alloc_op_product_idx ON source_smart.review_recommendation (allocation_id, operation_id, product_code);