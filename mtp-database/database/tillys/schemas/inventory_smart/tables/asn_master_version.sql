--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:asn_master_version stripComments:false splitStatements:false context:Release_1_0 labels:asn_master_version
--comment: initial changeset for asn_master_version

CREATE TABLE inventory_smart.asn_master_version (
	version_code int4 NOT NULL,
	asn_code varchar NOT NULL,
	asn_id varchar NOT NULL,
	asn_item varchar NULL,
	po_code varchar NOT NULL,
	po_id varchar NOT NULL,
	po_item varchar NULL,
	requirement_date date NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	channel varchar NOT NULL,
	allocated_qty int4 NULL,
	available_qty int4 NULL,
	number_of_allocations int4 NULL,
	article varchar NULL,
	dc_code int4 NOT NULL,
	pack_type_id varchar NULL,
	not_before_date date NULL,
	active_asn_flag bool NOT NULL,
	rtv_flag bool NOT NULL,
	reorder_flag bool NULL,
	po_comment_1 varchar NULL,
	po_comment_2 varchar NULL,
	po_comment_3 varchar NULL,
	ecom_po_qty int4 NULL,
	ecom_po_flag bool NOT NULL,
	CONSTRAINT asn_master_version_un UNIQUE (version_code, asn_code, product_code, dc_code, channel, requirement_date, not_before_date),
	CONSTRAINT asn_master_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE,
	CONSTRAINT asn_master_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT asn_master_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);