--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co:assort_smart.min_depth_config stripComments:false splitStatements:false context:min_depth_config labels:MTP-96071_add_missing_cols
--comment: initial changeset for min_depth_config

CREATE TABLE IF NOT EXISTS assort_smart.min_depth_config (
	hierarchy_code varchar NOT NULL,
	channel_id int4 NULL,
	sub_channel_id int4 NULL,
	season_code varchar NULL,
	min_depth float8 NULL,
	max_depth float8 NULL,
	"increment" float8 NULL,
	moq float8 NULL,
	"type" varchar NULL
);

--changeset mayank.bhardwaj@impactanalytics.co:add_st_column stripComments:false splitStatements:false context:add_st_column labels:initial_changeset
--comment: Add st column
ALTER TABLE assort_smart.min_depth_config 
ADD COLUMN IF NOT EXISTS st float8 NULL;