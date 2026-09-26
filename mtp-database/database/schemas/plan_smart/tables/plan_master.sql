--liquibase formatted sql
--changeset liquibase:plan_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_master
CREATE TABLE plan_smart.plan_master (
	plan_code serial4 NOT NULL,
	"name" varchar NULL,
	plan_period_sdate timestamp NOT NULL,
	plan_period_edate timestamp NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	is_deleted bool NOT NULL DEFAULT false,
	channel varchar NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	compare_year varchar NULL,
	plan_type varchar NULL,
	special_classification varchar NULL,
	planning_level_hierarchy varchar NULL,
	description text NULL,
	parent_plan_code int4 NOT NULL DEFAULT 0,
	scenario_name varchar NULL,
	is_editable bool NOT NULL DEFAULT true,
	CONSTRAINT plan_master_pk PRIMARY KEY (plan_code),
	CONSTRAINT plan_smart_plan_egs CHECK ((plan_period_edate > plan_period_sdate))
);


-- plan_smart.plan_master foreign keys

ALTER TABLE plan_smart.plan_master ADD CONSTRAINT ps_plan_master_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
ALTER TABLE plan_smart.plan_master ADD CONSTRAINT ps_plan_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;

--changeset partha.samanta@impactanalytics.co:plan_master_alter_1 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-24071
--comment: added a new column plan_display_name to display the unique plan names
--Rollback: alter table  plan_smart.plan_master drop column plan_display_name;
ALTER TABLE IF EXISTS plan_smart.plan_master ADD COLUMN plan_display_name character varying;

--changeset partha.samanta@impactanalytics.co:plan_master_alter_2 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-26891
--comment: added a new column eoh_boh_sync to  store the connect or disconnect property of EOH and BOH flow
--Rollback: alter table  plan_smart.plan_master drop column eoh_boh_sync;
ALTER TABLE plan_smart.plan_master ADD eoh_boh_sync bool NOT NULL DEFAULT true;
