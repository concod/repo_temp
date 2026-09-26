--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co:plan_depth_multiplier_1 stripComments:false splitStatements:false context:MTP39576 labels:plan_depth_multiplier
--comment: Add new table to store depth multiplier at plan level
CREATE TABLE if not exists assort_smart.plan_depth_multiplier (
	plan_code int4 NOT NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	"range" int4 NULL,
	range_multiplier_l0 float4 NULL,
	range_multiplier_l1 float4 NULL,
	range_multiplier_l2 float4 NULL,
	range_multiplier_l3 float4 NULL,
	"year" int4 NULL,
	yearly_flag varchar NULL,
	special_classification varchar NULL,
	sub_channel varchar null
);

--changeset rishabh.kumar@impactanalytics.co:plan_depth_multiplier_UPDATE stripComments:false splitStatements:false context:MTP39576 labels:plan_depth_multiplier
--comment: Add new table to store depth multiplier at plan level
ALTER TABLE assort_smart.plan_depth_multiplier ADD COLUMN IF NOT EXISTS plan_depth_multiplier_id serial4 NOT NULL;
ALTER TABLE assort_smart.plan_depth_multiplier DROP CONSTRAINT IF EXISTS plan_depth_multiplier_pkey;
ALTER TABLE assort_smart.plan_depth_multiplier ADD CONSTRAINT plan_depth_multiplier_pkey PRIMARY KEY (plan_depth_multiplier_id);

--changeset ezhil.kannan@impactanalytics.co:plan_depth_multiplier_2 stripComments:false splitStatements:false context:MTP39576 labels:plan_depth_multiplier
--comment: Add range_multiplier column and drop l0_name column from plan_depth_multiplier
ALTER TABLE assort_smart.plan_depth_multiplier
ADD COLUMN IF NOT EXISTS range_multiplier float4;

ALTER TABLE assort_smart.plan_depth_multiplier
DROP COLUMN IF EXISTS l0_name;
