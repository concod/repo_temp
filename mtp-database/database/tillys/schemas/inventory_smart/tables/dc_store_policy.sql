--liquibase formatted sql
--changeset nischay.p@impactanalytics.co:dc_store_policy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_dc_store_policy
--comment: initial changeset for dc_store_policy



CREATE  TABLE inventory_smart.dc_store_policy (
	rcl_code int4 NULL,
	rcl_dimension text NULL,
	rule_name text NULL,
	default_store_groups int4 NULL,
	start_date date NULL,
	end_date date NULL
)
WITH (
	autovacuum_enabled=false
);