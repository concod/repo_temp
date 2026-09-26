--liquibase formatted sql
--changeset liquibase:all_door_choice_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for all_door_choice
CREATE TABLE if not exists assort.all_door_choice (
	core_choice_id serial4 NOT NULL,
	levels json NULL,
	"year" varchar NOT NULL,
	quarter varchar NOT NULL,
	all_door_cc int8 NOT NULL,
	season_id varchar NULL,
	CONSTRAINT core_choice_table_pk PRIMARY KEY (core_choice_id)
);

--changeset hemant.kumar@impactanalytics.co:assort_all_door_choice_V1 liquibase:assort_master_plan stripComments:false splitStatements:false context:MTP-23728 labels:liquibase_project_start
--comment: initial changeset for all_door_choice
ALTER TABLE assort.all_door_choice ALTER COLUMN quarter DROP NOT NULL;

--changeset hemant.kumar@impactanalytics.co:all_door_choice_updated_v2  stripComments:false splitStatements:false context:MTP-33618 labels:liquibase_project_start
--comment: initial changeset for added two new columns 
ALTER TABLE assort.all_door_choice ADD if not exists created_by int4 NULL;
ALTER TABLE assort.all_door_choice ADD if not exists updated_by int4 NULL;