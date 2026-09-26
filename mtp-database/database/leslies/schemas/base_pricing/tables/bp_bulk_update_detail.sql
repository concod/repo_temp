--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_bulk_update_detail_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_bulk_update_detail_10


CREATE TABLE base_pricing.bp_bulk_update_detail (
	id serial4 NOT NULL,
	req_id int4 NOT NULL,
	product_id int4 NULL,
	store_id int4 NULL,
	status int2 DEFAULT 0 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 DEFAULT 0 NULL,
	updated_by int4 DEFAULT 0 NULL,
	CONSTRAINT bp_bulk_update_detail_pkey PRIMARY KEY (id),
	CONSTRAINT bp_bulk_update_detail_master_id_fkey FOREIGN KEY (req_id) REFERENCES base_pricing.bp_bulk_update_master(id) ON DELETE CASCADE
);
CREATE INDEX idx_reqid_id ON base_pricing.bp_bulk_update_detail USING btree (req_id, id);