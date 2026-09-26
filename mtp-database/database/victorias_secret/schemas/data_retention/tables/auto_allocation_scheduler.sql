--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:auto_allocation_scheduler_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for auto_allocation_scheduler backup
CREATE TABLE IF NOT EXISTS data_retention.auto_allocation_scheduler (
	sh_code serial4 NOT NULL,
	sh_name varchar NOT NULL,
	sh_structure jsonb NOT NULL,
	sh_frequency varchar NULL,
	is_deleted bool DEFAULT false NOT NULL,
	created_by int4 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	is_deletable bool DEFAULT true NOT NULL,
	snapshot_date date NOT null,
	CONSTRAINT auto_allocation_scheduler_sh_name_unique_bkp UNIQUE (sh_name,snapshot_date)
)PARTITION BY LIST (snapshot_date);

