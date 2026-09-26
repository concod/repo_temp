--liquibase formatted sql
--changeset jayabhararth.reddy@impactanalytics.co:assort_smart.ty_receipts stripComments:false splitStatements:false context:MTP-51802 labels:create_ty_receipts_table
--comment: initial changeset for status_details

CREATE TABLE assort_smart.ty_receipts (
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
	season_code int4 NULL,
	l1_name varchar(1024) NULL,
	l2_name varchar(1024) NULL,
	season_name varchar(50) NULL,
	ty_rcpts_units int4 NULL,
	bop_units float8 DEFAULT 0.0 NULL
);