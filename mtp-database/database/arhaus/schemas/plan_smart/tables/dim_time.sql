--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:dim_time  stripComments:false splitStatements:false context:Release_1_0 labels:mtp-50282
--comment: initial changeset for dim_time
CREATE TABLE plan_smart.dim_time (
	fiscal_year_week int4 NULL,
	fiscal_year_week_prior int4 NULL,
	fiscal_year_month int4 NULL,
	fiscal_year_month_prior int4 NULL,
	fiscal_year_month_weeks _int4 NULL,
	fiscal_year_quarter int4 NULL,
	fiscal_year_quarter_prior int4 NULL,
	fiscal_year_quarter_weeks _int4 NULL,
	fiscal_year_season int4 NULL,
	fiscal_year_season_prior int4 NULL,
	fiscal_year_season_weeks _int4 NULL,
	fiscal_year int2 NULL,
	fiscal_year_prior int2 NULL,
	fiscal_year_weeks _int4 NULL
);
