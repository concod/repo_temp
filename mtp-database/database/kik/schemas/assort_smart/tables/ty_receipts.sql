--liquibase formatted sql
--changeset jayabhararth.reddy@impactanalytics.co:assort_smart.ty_receipts stripComments:false splitStatements:false context:MTP-51802 labels:create_ty_receipts_table
--comment: initial changeset for status_details

CREATE TABLE IF NOT EXISTS assort_smart.ty_receipts (
	l0_name varchar(1024) NULL,
	sub_channel varchar(1024) NULL,
	fiscal_year int8 NULL,
	fiscal_month int4 NULL,
	fiscal_week int4 NULL,
	store_type varchar(1024) NULL,
	ty_rcpt_units float8 NULL,
	ty_rcpt_cost float8 NULL,
	ty_rcpt_msrp float8 NULL,
	target_revenue float8 NULL,
	target_cost float8 NULL,
	target_units float8 NULL,
	channel varchar(1024) NULL,
	l3_name varchar(100) NULL,
	age varchar(20) NULL,
	ty_receipts_id serial4 NOT NULL,
	is_updated bool NULL,
	season_code int4 NULL
);

--changeset jayabhararth.reddy@impactanalytics.co :assort_smart.ty_receipts_fix stripComments:false splitStatements:false context:MTP-72450 labels:add_l1_l2_name_cols
--comment: adding l1_name and l2_name columns
ALTER TABLE IF EXISTS assort_smart.ty_receipts 
ADD COLUMN IF NOT EXISTS l1_name varchar(1024) NULL,
ADD COLUMN IF NOT EXISTS l2_name varchar(1024) NULL;

--changeset abhilash.kirtikumar@impactanalytics.co:add_bop_units_ty_rcpt stripComments:false splitStatements:false context:added_bop_units_column_ty_rcpt labels:column_addition_to_ty_rcpt
--comment: Added bop_units_to_ty_rcpt.
ALTER TABLE assort_smart.ty_receipts
    ADD COLUMN IF NOT EXISTS bop_units float8 DEFAULT 0.0 NULL;
	

--changeset vishal.hosamani@impactanalytics.co:add_missing_columns stripComments:false splitStatements:false context:added_bop_units_column_ty_rcpt labels:column_addition_to_ty_rcpt
--comment: Added created_at, updated_at
ALTER TABLE assort_smart.ty_receipts
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NULL,
	ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL;
	

--changeset vishal.hosamani@impactanalytics.co:add_constraint stripComments:false splitStatements:false context:added_bop_units_column_ty_rcpt labels:column_addition_to_ty_rcpt
--comment: Added unique constraint
ALTER TABLE assort_smart.ty_receipts
	ADD CONSTRAINT ty_receipts_uk UNIQUE (l0_name, l1_name, l2_name, store_type, sub_channel, season_code, fiscal_year, fiscal_month, fiscal_week);