--liquibase formatted sql
--changeset liquibase:tb_stg_config_clr_rules_overall stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_stg_config_clr_rules_overall

CREATE TABLE price_markdown_opt.tb_stg_config_clr_rules_overall (
	age_eligible int4 NULL,
	age_force int4 NULL
);


--changeset surya.avinash@impactanalytics.co:tb_stg_config_clr_rules_overall_add_monthly_st_eligible_column stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added monthly_st_eligible column to tb_stg_config_clr_rules_overall
ALTER TABLE price_markdown_opt.tb_stg_config_clr_rules_overall
	ADD COLUMN monthly_st_eligible float4;