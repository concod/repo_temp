
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_finalize_size_master_1 stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_finalize_size_master 

CREATE TABLE IF not exists assort_smart.plan_finalize_size_master (
	plan_finalize_size_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	"attributes" jsonb NULL,
	CONSTRAINT plan_finalize_size_master_pkey PRIMARY KEY (plan_finalize_size_id)
);
CREATE INDEX If Not Exists plan_finalize_size_master_idx ON assort_smart.plan_finalize_size_master USING btree (plan_code) WITH (fillfactor='90');