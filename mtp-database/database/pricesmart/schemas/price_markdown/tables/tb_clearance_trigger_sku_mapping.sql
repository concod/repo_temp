--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:tb_clearance_trigger_sku_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_clearance_trigger_sku_mapping

CREATE TABLE price_markdown.tb_clearance_trigger_sku_mapping (
	trigger_id int4 NOT NULL,
	product_id int8 NULL,
	store_id int8 NULL,
	created_by int4 DEFAULT 0 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	is_deleted bool DEFAULT false NOT NULL,
	CONSTRAINT tb_clearance_trigger_sku_mapping_trigger_id_fkey FOREIGN KEY (trigger_id) REFERENCES price_markdown.tb_clearance_trigger_info_master(trigger_id)
);