--liquibase formatted sql
--changeset liquibase:tb_stg_config_clr_rules_department stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_stg_config_clr_rules_department

CREATE TABLE price_markdown_opt.tb_stg_config_clr_rules_department (
	l0_id int4 NULL,
	l0_name varchar NULL,
	l1_id int4 NULL,
	l1_name varchar NULL,
	l2_id int4 NULL,
	l2_name varchar NULL,
	age_eligible int4 NULL,
	age_force int4 NULL
);


--changeset surya.avinash@impactanalytics.co:tb_stg_config_clr_rules_department_add_monthly_st_eligible_column stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added monthly_st_eligible, l0_cid, l1_cid, l2_cid columns to tb_stg_config_clr_rules_department
ALTER TABLE price_markdown_opt.tb_stg_config_clr_rules_department
	ADD COLUMN monthly_st_eligible float4,
	ADD COLUMN l0_cid int4,
	ADD COLUMN l1_cid int4,
	ADD COLUMN l2_cid int4;