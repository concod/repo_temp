--liquibase formatted sql
--changeset liquibase:reports_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for reports_master
CREATE TABLE monday_smart.reports_master (
	rep_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	is_deleted bool NOT NULL DEFAULT false,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NOT NULL DEFAULT now(),
	created_by int4 NULL,
	updated_by int4 NULL,
	filters jsonb NULL,
	CONSTRAINT reports_master_pk PRIMARY KEY (rep_code),
	CONSTRAINT reports_master_un UNIQUE (name, is_deleted, created_by),
	CONSTRAINT user_name_check CHECK ((length((name)::text) > 0))
);
--changeset bhargav.polavarapu@impactanalytics.co:reports_master_remove_constraint stripComments:false splitStatements:false context:Release_2 labels:reports_master_remove_constraint
--comment: removing the unique user_name_check constraint
ALTER TABLE monday_smart.reports_master
DROP CONSTRAINT user_name_check;

