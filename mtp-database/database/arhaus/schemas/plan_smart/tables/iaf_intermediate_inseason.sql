--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:iaf_intermediate_inseason stripComments:false splitStatements:false context:Release_1_0
--comment: initial changeset for iaf_intermediate_inseason

CREATE TABLE plan_smart.iaf_intermediate_inseason (
	"module" text NULL,
	channel text NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	hierarchy_code int8 NULL,
	fiscal_year_week int8 NULL,
	percent_off float8 NULL,
	scenario int8 NULL,
	w_sls_u float8 NULL,
	w_sls_dollars float8 NULL,
	w_gm_dollars float8 NULL,
	w_cogs float8 NULL,
	w_aur float8 NULL,
	w_auc float8 NULL,
	w_gm_percent float8 NULL,
	w_air float8 NULL,
	actualised bool NULL,
	revenue float8 NULL,
	discount float8 NULL
);