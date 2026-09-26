--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co:assort_smart.depth_multiplier stripComments:false splitStatements:false context:Line-Plan labels:initial_changeset
--comment: initial changeset for depth_multiplier

CREATE TABLE assort_smart.depth_multiplier (
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
	sub_channel varchar(50) NULL,
	depth_multiplier_id serial4 NOT NULL,
	l0_name varchar(100) NULL,
	range_multiplier_l0 float4 NULL
);

--changeset pulimallika.teja@impactanalytics.co:assort_smart.depth_multiplier stripComments:false splitStatements:false context:Line-Plan labels:initial_changeset
--comment: initial changeset for depth_multiplier

ALTER TABLE assort_smart.depth_multiplier
   ADD COLUMN l6_name varchar(100) NULL,
   ADD COLUMN l7_name varchar(100) NULL,
   ADD COLUMN l8_name varchar(100) NULL;