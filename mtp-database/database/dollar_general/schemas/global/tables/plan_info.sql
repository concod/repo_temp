--liquibase formatted sql
--changeset ashish@impactanalytics.co:plan_info stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_info
CREATE TABLE IF NOT EXISTS global.plan_info (
	l0_code varchar NOT NULL,
	l0_name varchar NOT NULL,
	plan_start_date date NULL,
	plan_end_date date NULL,
	ly_plan_mapping varchar NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	CONSTRAINT plan_info_un UNIQUE (l0_code),
	CONSTRAINT plan_info_updated_at_fk FOREIGN KEY (updated_by)
        REFERENCES global.user_master (user_code) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
);

--changeset rishitha.gangadhara:plan_info_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_info_2
ALTER TABLE "global".plan_info ADD CONSTRAINT plan_info_pk PRIMARY KEY (l0_code);