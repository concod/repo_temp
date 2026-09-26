--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:assort_smart.depth_multiplier stripComments:false splitStatements:false context:Line-Plan labels:initial_changeset
--comment: initial changeset for depth_multiplier

DROP TABLE IF EXISTS assort_smart.depth_multiplier;

CREATE TABLE IF NOT EXISTS assort_smart.depth_multiplier (
	l0_name varchar(50) NULL,
	l3_name varchar(50) NULL,
	age varchar(50) NULL,
	gender varchar(50) NULL,
	l5_name varchar(50) NULL,
	"range" int4 NULL,
	range_multiplier_l0 float8 NULL,
	range_multiplier_l3 float8 NULL,
	range_multiplier_age float4 NULL,
	range_multiplier_gender float4 NULL,
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
