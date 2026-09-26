--liquibase formatted sql
--changeset liquibase:dc_pack_reserve_quantity stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_pack_reserve_quantity

CREATE TABLE inventory_smart.dc_pack_reserve_quantity (
	pack_type_id varchar NULL,
	quantity int4 NULL,
	is_reserved bool DEFAULT false NULL,
	percentage float4 NULL,
	channel varchar NULL,
	updated_at timestamptz NULL,
	reservation_till_date date NULL,
	created_at timestamptz DEFAULT now() NULL,
	instock_inclusion bool DEFAULT true NULL,
	updated_by varchar NULL,
	"comment" varchar NULL,
	article varchar NULL,
	dc_code int4 NULL,
	"type" varchar NULL,
	incoming_po_30 int4 NULL,
	incoming_po_31_60 int4 NULL,
	incoming_po_61_90 int4 NULL,
	dc_name varchar NULL,
	CONSTRAINT article_pack_un UNIQUE (article, pack_type_id, dc_code),
	CONSTRAINT dc_pack_reserve_quantity_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE
);