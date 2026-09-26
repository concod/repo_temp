--liquibase formatted sql
--changeset kumar.shubham@impactanalytics.co:plan_depth_multiplier_1 stripComments:false splitStatements:false context:MTP39576 labels:plan_depth_multiplier
--comment: Add new table to store depth multiplier at plan level
CREATE TABLE if not exists assort_smart.plan_depth_multiplier (
	plan_code int4 NOT NULL,
	l0_name varchar NULL,
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
	sub_channel varchar null,
	plan_depth_multiplier_id serial4 NOT NULL,
	range_multiplier float4 NULL,
	CONSTRAINT plan_depth_multiplier_pkey PRIMARY KEY (plan_depth_multiplier_id)
);