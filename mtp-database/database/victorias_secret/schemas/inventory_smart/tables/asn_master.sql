--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:asn_master stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-310
--comment: initial changeset for asn_master

CREATE TABLE inventory_smart.asn_master (
	asn_code varchar NOT NULL,
	asn_id varchar NOT NULL,
	asn_item varchar NOT NULL,
	po_code varchar NOT NULL,
	po_id varchar NOT NULL,
	po_item varchar NOT NULL,
	requirement_date date NOT NULL,
	channel varchar NOT NULL,
	available_qty int4 NULL,
	dc_code int4 NOT NULL,
	pack_type_id varchar NULL,
	article varchar NULL,
	number_of_allocations int4 NULL,
	CONSTRAINT asn_master_un UNIQUE (asn_code),
	CONSTRAINT asn_master_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE
);

