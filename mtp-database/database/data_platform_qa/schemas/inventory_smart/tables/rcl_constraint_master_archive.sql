--liquibase formatted sql
--changeset liquibase:rcl_constraint_master_archive stripComments:false splitStatements:false context:Release_1_0 labels:MTP-66909
--comment: initial changeset for rcl_constraint_master_archive
CREATE TABLE inventory_smart.rcl_constraint_master_archive (
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	rcl_dimension jsonb DEFAULT '{}'::jsonb NOT NULL,
	rule_name varchar NULL,
	psa_code varchar NOT NULL,
	psa_name varchar NULL,
	validity daterange NOT NULL,
	wos float4 NULL,
	transit_time float4 NULL,
	safety_stock float4 NULL,
	min_stock float4 DEFAULT 0 NOT NULL,
	max_stock float4 DEFAULT 0 NOT NULL,
	aps float4 NULL,
	ros float4 NULL,
	st float4 NULL,
	deleted_at timestamptz DEFAULT now() NOT NULL,
	deleted_by int4 NULL,
	store_code varchar NULL,
	is_exception bool DEFAULT false NOT NULL
);

--changeset liquibase:rcl_constraint_master_archive_v1 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-66909
--comment: initial changeset for rcl_constraint_master_archive
alter table inventory_smart.rcl_constraint_master_archive alter column psa_code drop not null;