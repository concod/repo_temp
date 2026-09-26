--liquibase formatted sql
--changeset swapnil.bhange:rcl_versions_constraint stripComments:false splitStatements:false context:Release_2 labels:rcl_versions_constraint
--comment: initial changeset for rcl_versions_constraint in Lovisa
-- DROP TABLE "global".rcl_versions_constraint;

CREATE TABLE IF NOT EXISTS "global".rcl_versions_constraint (
	version_code int4 NOT NULL,
	l0_name varchar NOT NULL,
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	psa_code varchar NULL,
	product_codes _varchar NULL,
	wos float4 NULL,
	transit_time float4 NULL,
	safety_stock float4 NULL,
	min_stock float4 NULL,
	max_stock float4 NULL,
	aps float4 NULL,
	ros float4 NULL,
	st float4 NULL,
	store_codes _varchar NULL,
	id bigserial NOT NULL,
	dos float4 NULL,
	min_distribution varchar NULL,
    CONSTRAINT rcl_versions_constraint_pkey PRIMARY KEY (id, version_code)
)
PARTITION BY LIST (version_code);

--changeset swapnil.bhange:rcl_versions_constraint_v2 stripComments:false splitStatements:false context:Release_2 labels:rcl_versions_constraint
--comment: initial changeset for rcl_versions_constraint in Lovisa droping constraints
ALTER TABLE global.rcl_versions_constraint DROP CONSTRAINT IF EXISTS rcl_versions_constraint_pkey;

--changeset swapnil.bhange:rcl_versions_constraint_v3 stripComments:false splitStatements:false context:Release_2 labels:rcl_versions_constraint
--comment: initial changeset for rcl_versions_constraint in Lovisa adding constraints
ALTER TABLE global.rcl_versions_constraint ADD CONSTRAINT rcl_versions_constraint_pkey PRIMARY KEY (id, version_code, l0_name);
