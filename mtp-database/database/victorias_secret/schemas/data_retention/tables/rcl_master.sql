--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:rcl_master_bkp_vs stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for rcl_master backup
CREATE TABLE IF NOT EXISTS data_retention.rcl_master (
	rcl_code serial4 NOT NULL,
	module_code int4 NOT NULL,
	"level" _varchar DEFAULT ARRAY[]::character varying[] NOT NULL,
	hierarchy_selections jsonb DEFAULT '{}'::jsonb NOT NULL,
	validity datemultirange NOT NULL,
	priority int4 NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	created_by int4 NOT NULL,
	updated_by int4 NULL,
	created_at timestamp DEFAULT now() NOT NULL,
	updated_at timestamp NULL,
	rcl_lowest_level _varchar DEFAULT ARRAY[]::character varying[] NULL,
	is_default bool DEFAULT false NULL,
	snapshot_date date NOT null,
	CONSTRAINT rcl_pk PRIMARY KEY (rcl_code,snapshot_date)
) PARTITION BY LIST (snapshot_date);

