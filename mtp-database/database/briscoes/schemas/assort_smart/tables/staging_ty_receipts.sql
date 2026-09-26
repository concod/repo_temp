--liquibase formatted sql
--changeset vishal.hosamani@impactanalytics.co:assort_smart.staging_ty_receipts stripComments:false splitStatements:false context:MTP-51802 labels:create_ty_receipts_table
--comment: initial changeset for staging_ty_receipts

CREATE TABLE IF NOT EXISTS assort_smart.staging_ty_receipts (
	l0_name varchar(1024) NULL,
	l1_name varchar(1024) NULL,
	l2_name varchar(1024) NULL,
	store_type varchar(1024) NULL,
	sub_channel varchar(1024) NULL,
	fiscal_year int8 NULL,
	fiscal_month int4 NULL,
	fiscal_week int4 NULL,
	season_code int4 NULL,
	ty_rcpt_units float8 NULL,
	ty_rcpt_cost float8 NULL,
	ty_rcpt_msrp float8 NULL,
	rcpt_msrp float8 NULL,
	target_revenue float8 NULL,
	target_cost float8 NULL,
	target_units float8 NULL,
	bop_units float8 DEFAULT 0.0 NULL,
	created_at TIMESTAMP,
	updated_at TIMESTAMP,
	is_updated bool NULL,
	CONSTRAINT staging_ty_rcpt_uk UNIQUE (l0_name, l1_name, l2_name, store_type, sub_channel, season_code, fiscal_year, fiscal_month, fiscal_week)
);


--changeset vishal.hosamani@impactanalytics.co:add_missing_columns stripComments:false splitStatements:false context:added_bop_units_column_ty_rcpt labels:column_addition_to_ty_rcpt
--comment: Added season_name column
ALTER TABLE assort_smart.staging_ty_receipts
    ADD COLUMN IF NOT EXISTS season_name varchar(1024) NULL;