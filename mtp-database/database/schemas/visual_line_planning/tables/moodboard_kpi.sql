--liquibase formatted sql
--changeset liquibase:moodboard_kpi stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for moodboard_kpi
CREATE TABLE visual_line_planning.moodboard_kpi (
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	sales_unit int4 NULL,
	sales_dollar numeric NULL,
	st_percent numeric NULL,
	buy_unit int4 NULL,
	buy_dollar numeric NULL,
	receipt_dollar int4 NULL,
	bop int4 NULL,
	gm_percent numeric NULL,
	gm_dollars numeric NULL
);