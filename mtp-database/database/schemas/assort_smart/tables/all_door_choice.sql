--liquibase formatted sql
--changeset liquibase:all_door_choice stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for all_door_choice
CREATE TABLE assort_smart.all_door_choice (
	core_choice_id serial4 NOT NULL,
	levels json NULL,
	"year" varchar NOT NULL,
	quarter varchar NULL,
	all_door_cc int8 NOT NULL,
	season_id varchar NULL,
	CONSTRAINT core_choice_table_pk PRIMARY KEY (core_choice_id)
);
--changeset hemant.kumar@impactanalytics.co:assort.all_door_choice liquibase:all_door_choice stripComments:false splitStatements:false context:MTP-33618 labels:liquibase_project_start
--comment: initial changeset for all_door_choice
ALTER TABLE assort_smart.all_door_choice ADD created_by int4 NULL;
ALTER TABLE assort_smart.all_door_choice ADD updated_by int4 NULL;