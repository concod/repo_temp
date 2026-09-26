--liquibase formatted sql
--changeset vikash.kumar@impactanalytics.co:po_error_list stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: po_error_list for po_error_list

CREATE TABLE IF NOT EXISTS inventory_smart.po_error_list (
	error_message varchar NULL,
	error_condition varchar NULL,
	error_code int4 NULL
);