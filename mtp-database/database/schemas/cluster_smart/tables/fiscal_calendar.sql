--liquibase formatted sql
--changeset ashish@impactanalytics.co:cluster_smart_fiscal_calendar stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for cluster_smart_fiscal_calendar
CREATE TABLE cluster_smart.fiscal_calendar (
	calendar_date date NULL,
	fy int4 NULL,
	fm int4 NULL,
	fw int4 NULL,
	fd int4 NULL,
	fw_start_date date NULL,
	fy_fw int4 NULL,
	calendar_date_prev_year varchar(16) NULL
);
CREATE INDEX fiscal_calendar_calendar_date_idx ON cluster_smart.fiscal_calendar USING btree (calendar_date);
