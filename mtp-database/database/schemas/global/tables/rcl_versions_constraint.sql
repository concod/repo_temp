--liquibase formatted sql
--changeset ashish:rcl_versions_constraint stripComments:false splitStatements:false context:Release_2 labels:CI-137
--comment: initial changeset for rcl_versions_constraint
CREATE TABLE "global".rcl_versions_constraint (
	version_code int4 NOT NULL,
	l0_name varchar NOT NULL,
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	psa_code varchar NOT NULL,
	product_codes _varchar NULL,
	wos float4 NULL,
	transit_time float4 NULL,
	safety_stock float4 NULL,
	min_stock float4 NULL,
	max_stock float4 NULL,
	aps float4 NULL,
	ros float4 NULL,
	st float4 NULL,
	store_codes _varchar NULL
)
PARTITION BY LIST (version_code);

--changeset ashish:rcl_versions_constraint_id stripComments:false splitStatements:false context:Release_2 labels:CI-137
--comment: added id to rcl_versions_constraint
ALTER TABLE "global".rcl_versions_constraint ADD id bigserial NOT NULL;

--changeset ashish:rcl_versions_constraint_psa_null stripComments:false splitStatements:false context:Release_2 labels:CI-137
--comment: psa null allowed to rcl_versions_constraint
ALTER TABLE "global".rcl_versions_constraint ALTER COLUMN psa_code DROP NOT NULL;

--changeset ashish:rcl_versions_constraint_dos stripComments:false splitStatements:false context:Release_2 labels:CI-137
--comment: added dos to rcl_versions_constraint
ALTER TABLE "global".rcl_versions_constraint ADD dos float4 NULL;

--changeset linu:rcl_versions_constraint_min_distribution stripComments:false splitStatements:false context:Release_2 labels:CI-137
--comment: added min_distribution to rcl_versions_constraint
ALTER TABLE "global".rcl_versions_constraint ADD COLUMN IF NOT EXISTS min_distribution varchar NULL;
