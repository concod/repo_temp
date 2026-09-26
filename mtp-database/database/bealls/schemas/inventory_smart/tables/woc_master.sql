--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:woc_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: woc_master for weeks of cover

CREATE TABLE IF NOT EXISTS inventory_smart.woc_master (
	l4_name varchar NULL,
	store_code varchar NOT NULL,
	woc float4 NULL,
	max_mod float4 DEFAULT 1 NOT NULL,
	status bool NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	upload_flag varchar DEFAULT false NULL
);
CREATE INDEX IF NOT EXISTS wm_l4_name ON inventory_smart.woc_master USING btree (l4_name);

--changeset gokulakrishnan.nagarajan@impactanalytics.co:add_unique_constraint_l4_name_store_code stripComments:false splitStatements:false context:Release_1_0 labels:MTP-82663
--comment: add_unique_constraint_l4_name_store_code

ALTER TABLE inventory_smart.woc_master
DROP CONSTRAINT IF EXISTS unique_l4_name_store_code;

ALTER TABLE inventory_smart.woc_master
ADD CONSTRAINT unique_l4_name_store_code UNIQUE (l4_name, store_code);