--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.ty_receipts stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for ty_receipts

CREATE TABLE IF NOT EXISTS assort_smart.ty_receipts (
	ty_rept_id serial4 NOT NULL,
	l0_name varchar(1024) NULL,
	l1_name varchar(1024) NULL,
	l2_name varchar(1024) NULL,
	sub_channel varchar(1024) NULL,
	fy int8 NULL,
	fm int4 NULL,
	fw int4 NULL,
	store_type varchar(1024) NULL,
	ty_rcpt_units float8 NULL,
	ty_rcpt_cost float8 NULL,
	ty_rcpt_rtl float8 NULL,
	target_rev float8 NULL,
	target_cost float8 NULL,
	target_unit float8 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	channel varchar(1024) NULL,
	fq int4 NULL,
	season_code int4 NULL,
	CONSTRAINT ty_receipts_un UNIQUE (l0_name, l1_name, l2_name, sub_channel, fy, fm, fw, store_type, fq)
);

--changeset abhilash.kirtikumar@impactanalytics.co:add_bop_units_ty_rcpt_carters stripComments:false splitStatements:false context:added_bop_units_column_ty_rcpt_carters labels:column_addition_to_ty_rcpt_carters
--comment: Added bop_units_to_ty_rcpt_carters.
ALTER TABLE assort_smart.ty_receipts
    ADD COLUMN IF NOT EXISTS bop_units float8 DEFAULT 0.0 NULL;