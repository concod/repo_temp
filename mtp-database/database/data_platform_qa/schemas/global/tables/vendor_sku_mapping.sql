--liquibase formatted sql
--changeset liquibase:vendor_sku_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vendor_sku_mapping
CREATE TABLE "global".vendor_sku_mapping (
	vendor_code varchar NOT NULL,
	product_code varchar NULL,
	product_unit_cost float8 NULL,
	supplier_pack_size int8 NULL,
	created_by int4 NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	status varchar NULL,
	preferred_status varchar(50) NULL,
	price float8 NULL,
	min_order_quantity int4 NULL,
	max_order_quantity int4 NULL,
	multiple_quantity int4 NULL,
	cycle_time int4 NULL,
	mfg_lead_time int4 NULL,
	landed_cost float8 NULL
);
ALTER TABLE "global".vendor_sku_mapping ADD CONSTRAINT vendor_sku_mapping_fk FOREIGN KEY (vendor_code) REFERENCES "global".vendor_master(vendor_code) ON DELETE CASCADE;
alter table "global".vendor_sku_mapping 
    add constraint fk_prodcuct_code
    foreign key (product_code) 
    REFERENCES "global".product_master (product_code) ON DELETE CASCADE;
