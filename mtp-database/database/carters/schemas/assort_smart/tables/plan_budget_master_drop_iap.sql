--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co liquibase:plan_budget_master_drop_wp stripComments:false splitStatements:false context:new_table_for_drop_config labels:liquibase_project_start
--comment: Add new table drop config for IA recommend plan

CREATE TABLE assort_smart.plan_budget_master_drop_iap (
	plan_bud_mst_drp_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	hierarchy_code varchar(256) NOT NULL,
	channel int4 NOT NULL,
	sub_channel int4 NOT NULL,
	launch_id int4 NOT NULL,
	launch_budget_ly float8 NOT NULL,
	launch_budget_ty float8 NOT NULL,
	launch_penetration_ly float8 NOT NULL,
	launch_penetration_ty float8 NOT NULL,
	total_budget_ty float8 NOT NULL,
	total_budget_ly float8 NOT NULL,
	total_penetration_ly float8 NOT NULL,
	total_penetration_ty float8 NOT NULL,
	delivery_1_penetration_ly float8 NULL,
	delivery_1_penetration_ty float8 NULL,
	delivery_2_penetration_ly float8 NULL,
	delivery_2_penetration_ty float8 NULL,
	delivery_3_penetration_ly float8 NULL,
	delivery_3_penetration_ty float8 NULL,
	delivery_4_penetration_ly float8 NULL,
	delivery_4_penetration_ty float8 NULL,
	delivery_5_penetration_ly float8 NULL,
	delivery_5_penetration_ty float8 NULL,
	delivery_6_penetration_ly float8 NULL,
	delivery_6_penetration_ty float8 NULL,
	delivery_7_penetration_ly float8 NULL,
	delivery_7_penetration_ty float8 NULL,
	delivery_8_penetration_ly float8 NULL,
	delivery_8_penetration_ty float8 NULL,
	delivery_9_penetration_ly float8 NULL,
	delivery_9_penetration_ty float8 NULL,
	delivery_10_penetration_ly float8 NULL,
	delivery_10_penetration_ty float8 NULL,
	delivery_11_penetration_ly float8 NULL,
	delivery_11_penetration_ty float8 NULL,
	delivery_12_penetration_ly float8 NULL,
	delivery_12_penetration_ty float8 NULL,
	CONSTRAINT plan_budget_master_drop_iap_pkey PRIMARY KEY (plan_bud_mst_drp_id)
);

--changeset mohammed.ayaz@impactanalytics.co:plan_budget_master_drop_iap stripComments:false splitStatements:false context:MTP-47795 labels:liquibase_project_start
--comment: change dtype hy_code
ALTER TABLE assort_smart.plan_budget_master_drop_iap
ALTER COLUMN hierarchy_code SET DATA TYPE text;
