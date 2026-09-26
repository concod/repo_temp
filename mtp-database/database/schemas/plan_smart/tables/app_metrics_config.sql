--liquibase formatted sql
--changeset liquibase:app_metrics_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for app_metrics_config
CREATE TABLE plan_smart.app_metrics_config (
	"label" varchar NOT NULL,
	kpi varchar NOT NULL,
	category_name varchar NOT NULL,
	default_visibility bool NOT NULL,
	"order" int2 NOT NULL,
	category_order int2 NOT NULL,
	prd_hrchy_agg_formula text NULL,
	total_formula varchar NULL,
	update_formula varchar NULL,
	ranking int2 NULL,
	editable_metrics jsonb NULL,
	plan_tbl_col_name varchar NULL,
	ty bool NULL DEFAULT true,
	ly bool NULL DEFAULT true,
	iaf bool NULL DEFAULT true
);


--changeset vyshakh.m@impactanalytics.co:app_metrics_config_alter_1 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-16716
--comment: added a new column kpi_type to separate RCPT from Sales 
--Rollback: alter table  plan_smart.app_metrics_config drop column kpi_type;
alter table  plan_smart.app_metrics_config add column kpi_type varchar;

--changeset devaraj.jagannath@impactanalytics.co:app_metrics_config_alter_2 stripComments:false splitStatements:false context:Release_1_2 labels:MTP-18457
--comment: Added a new column for KPI value 0 updates
--Rollback: alter table  plan_smart.app_metrics_config drop column update_spread_logic;
alter table  plan_smart.app_metrics_config add column update_spread_logic varchar;

--changeset saran.srirama@impactanalytics.co:app_metrics_config_alter_3 stripComments:false splitStatements:false context:Release_1_2 labels:MTP-18955
--comment: Added a new column to identify if a column is percentage
--Rollback: alter table  plan_smart.app_metrics_config drop column is_perc;
alter table  plan_smart.app_metrics_config add column is_perc bool;

--changeset subhash.pophale@impactanalytics.co:app_metrics_config_alter_4 stripComments:false splitStatements:false context:Release_1_2 labels:MTP-19948
--comment: Added missing primary key on the table
--Rollback: alter table plan_smart.app_metrics_config drop constraint pk_app_metrics_config;
ALTER TABLE plan_smart.app_metrics_config ADD CONSTRAINT pk_app_metrics_config PRIMARY KEY (kpi, category_name);


--changeset saran.srirama@impactanalytics.co:app_metrics_config_alter_5 stripComments:false splitStatements:false context:Release_1_2 labels:MTP-22120
--comment: Added 4 new columns to identify if a kpi is eligible for match-with
--Rollback: alter table  plan_smart.app_metrics_config drop column pre_match_with;
ALTER TABLE plan_smart.app_metrics_config ADD pre_match_with bool NULL;
--Rollback: alter table  plan_smart.app_metrics_config drop column pre_cal;
ALTER TABLE plan_smart.app_metrics_config ADD pre_cal bool NULL;
--Rollback: alter table  plan_smart.app_metrics_config drop column in_match_with;
ALTER TABLE plan_smart.app_metrics_config ADD in_match_with bool NULL;
--Rollback: alter table  plan_smart.app_metrics_config drop column in_cal;
ALTER TABLE plan_smart.app_metrics_config ADD in_cal bool NULL;



--changeset saran.srirama@impactanalytics.co:app_metrics_config_alter_6 stripComments:false splitStatements:false context:Release_1_2 labels:MTP-22120
--comment: Added 2 new columns to for exception-list match with calculation
--Rollback: alter table  plan_smart.app_metrics_config drop column pre_cal_fml;
ALTER TABLE plan_smart.app_metrics_config ADD pre_cal_fml  varchar;
--Rollback: alter table  plan_smart.app_metrics_config drop column in_cal_fml;
ALTER TABLE plan_smart.app_metrics_config ADD in_cal_fml  varchar;


--changeset devaraj.jagannat@impactanalytics.co:app_metrics_config_alter_7 stripComments:false splitStatements:false context:Release_1_2 labels:MTP-23109
--comment: Added match-will all config columns for wholesale plans
--Rollback: alter table  plan_smart.app_metrics_config drop column wholesale_pre_match_with;
ALTER TABLE plan_smart.app_metrics_config ADD wholesale_pre_match_with bool default false;
--Rollback: alter table  plan_smart.app_metrics_config drop column wholesale_pre_cal;
ALTER TABLE plan_smart.app_metrics_config ADD wholesale_pre_cal bool default false;
--Rollback: alter table  plan_smart.app_metrics_config drop column wholesale_in_match_with;
ALTER TABLE plan_smart.app_metrics_config ADD wholesale_in_match_with bool default false;
--Rollback: alter table  plan_smart.app_metrics_config drop column wholesale_in_cal;
ALTER TABLE plan_smart.app_metrics_config ADD wholesale_in_cal bool default false;   
--Rollback: alter table  plan_smart.app_metrics_config drop column wholesale_pre_cal_fml;
ALTER TABLE plan_smart.app_metrics_config ADD wholesale_pre_cal_fml  varchar;
--Rollback: alter table  plan_smart.app_metrics_config drop column wholesale_in_cal_fml;
ALTER TABLE plan_smart.app_metrics_config ADD wholesale_in_cal_fml  varchar;


--changeset saran.srirama@impactanalytics.co:app_metrics_config_alter_8 stripComments:false splitStatements:false context:Release_1_2 labels:MTP-24321
--comment: Added 1 new columns for wholesale match-with
--Rollback: alter table  plan_smart.app_metrics_config drop column wholesale_prd_hrchy_agg_formula;
ALTER TABLE plan_smart.app_metrics_config ADD wholesale_prd_hrchy_agg_formula text NULL;

--changeset devaraj.jagannat@impactanalytics.co:app_metrics_config_alter_9 stripComments:false splitStatements:false context:Release_1_3 labels:MTP-24347
--comment: Added match-will all config columns for Chester plans
--Rollback: alter table  plan_smart.app_metrics_config drop column chester_pre_match_with;
ALTER TABLE plan_smart.app_metrics_config ADD chester_pre_match_with bool default false;
--Rollback: alter table  plan_smart.app_metrics_config drop column chester_pre_cal;
ALTER TABLE plan_smart.app_metrics_config ADD chester_pre_cal bool default false;
--Rollback: alter table  plan_smart.app_metrics_config drop column chester_in_match_with;
ALTER TABLE plan_smart.app_metrics_config ADD chester_in_match_with bool default false;
--Rollback: alter table  plan_smart.app_metrics_config drop column chester_in_cal;
ALTER TABLE plan_smart.app_metrics_config ADD chester_in_cal bool default false;   
--Rollback: alter table  plan_smart.app_metrics_config drop column chester_pre_cal_fml;
ALTER TABLE plan_smart.app_metrics_config ADD chester_pre_cal_fml  varchar;
--Rollback: alter table  plan_smart.app_metrics_config drop column chester_in_cal_fml;
ALTER TABLE plan_smart.app_metrics_config ADD chester_in_cal_fml  varchar;

--changeset archa.prakash@impactanalytics.co:app_metrics_config_alter_10 stripComments:false splitStatements:false context:Release_1_4 labels:MTP-37727
--comment: Added week_formula for reports download
--Rollback: alter table  plan_smart.app_metrics_config drop column week_formula;
ALTER TABLE plan_smart.app_metrics_config ADD week_formula  varchar;
