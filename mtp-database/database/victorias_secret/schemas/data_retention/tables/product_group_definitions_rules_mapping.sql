--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:product_group_definitions_rules_mapping_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for product_group_definitions_rules_mapping backup
CREATE TABLE IF NOT EXISTS  data_retention.product_group_definitions_rules_mapping (
	pg_code int4 NULL,
	pgd_code int4 NOT NULL,
	pgr_code int4 NOT NULL,
	id serial4 NOT NULL,
	snapshot_date date NOT null,
	CONSTRAINT pgdrm_pg_def_rule_un UNIQUE (pg_code, pgd_code, pgr_code, snapshot_date)
) PARTITION BY LIST (snapshot_date);

