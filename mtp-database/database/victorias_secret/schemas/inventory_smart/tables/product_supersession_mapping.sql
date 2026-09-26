--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:product_supersession_mapping stripComments:false splitStatements:false context:VS_inv_smart labels:VPP-310
--comment: initial changeset for product_supersession_mapping

CREATE TABLE inventory_smart.product_supersession_mapping (
	ps_code bigserial NOT NULL,
	old_article varchar NULL,
	old_product_code varchar NULL,
	article varchar NULL,
	product_code varchar NULL,
	priority int4 NULL,
	start_date date NULL,
	end_date date NULL,
	has_store_exception bool NULL,
	updated_by varchar(50) NULL,
	updated_at timestamp NULL,
	created_by varchar(50) NULL,
	created_at timestamp NULL,
	CONSTRAINT product_supersession_mapping_pkey PRIMARY KEY (ps_code)
);


--changeset kamuju.mahaveer@impactanalytics.co:product_supersession_mapping_updated stripComments:false splitStatements:false context:Victorias_Secret_InventorySmart labels:VPP-321
--comment: Adding new column supersession_id as per requirement
ALTER TABLE inventory_smart.product_supersession_mapping  ADD supersession_id varchar NULL;

