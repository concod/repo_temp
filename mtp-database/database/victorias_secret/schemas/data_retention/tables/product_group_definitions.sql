--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:product_group_definitions_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for product_group_definitions backup
CREATE TABLE IF NOT EXISTS data_retention.product_group_definitions (
	pgd_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	pseudo_code text NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	snapshot_date date NOT null,
	CONSTRAINT upgd_pk UNIQUE (pgd_code,snapshot_date)
) PARTITION BY LIST (snapshot_date);

