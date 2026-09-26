--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:assort_smart.depth_multiplier stripComments:false splitStatements:false context:Line-Plan labels:initial_changeset
--comment: initial changeset for depth_multiplier

DROP TABLE IF EXISTS assort_smart.depth_multiplier;

CREATE TABLE IF NOT EXISTS assort_smart.depth_multiplier (
	l1_name varchar(100) NULL,
	l2_name varchar(100) NULL,
	l3_name varchar(100) NULL,
	"range" int4 NULL,
	range_multiplier_l1 float4 NULL,
	range_multiplier_l2 float4 NULL,
	range_multiplier float4 NULL,
	"year" int4 NULL,
	yearly_flag varchar(50) NULL,
	special_classification varchar(50) NULL,
	sub_channel varchar(50) NULL
);

--changeset hemanth.cs@impactanalytics.co:assort_smart.depth_multiplier_id stripComments:false splitStatements:false context:Line-Plan labels:initial_changeset
--comment: new changeset for adding depth_multiplier_id to depth_multiplier
ALTER TABLE assort_smart.depth_multiplier
add column if not exists depth_multiplier_id serial4 not null;

--changeset ezhil.kannan@impactanalytics.co:assort_smart.depth_multiplier_add_plan_code stripComments:false splitStatements:false context:Line-Plan labels:initial_changeset
--comment: Adding plan_code column to assort_smart.depth_multiplier table
ALTER TABLE assort_smart.depth_multiplier
ADD COLUMN plan_code VARCHAR;

--changeset mayank.bhardwaj@impactanalytics.co:assort_smart.depth_multiplier_add_range_multiplier_l3 stripComments:false splitStatements:false context:Line-Plan labels:initial_changeset_range_multiplier_l3
--comment: Adding range_multiplier_l3 column to assort_smart.depth_multiplier table
ALTER TABLE assort_smart.depth_multiplier
ADD COLUMN IF NOT EXISTS range_multiplier_l3 FLOAT4 NULL;