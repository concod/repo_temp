--liquibase formatted sql
--changeset liquibase:product_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_mapping
CREATE TABLE "global".product_mapping (
	mapping_code serial4 NOT NULL,
	mapping_type varchar NOT NULL,
	product_code varchar NULL,
	store_code varchar NULL,
	dc_code int4 NULL,
	fc_code int4 NULL,
	is_active bool NOT NULL DEFAULT true,
	validity datemultirange NULL
)
PARTITION BY LIST (mapping_type);
ALTER TABLE global.product_mapping ADD CONSTRAINT product_mapping_dc_fk FOREIGN KEY (dc_code) REFERENCES global.distribution_centres(dc_code) ON DELETE CASCADE;
ALTER TABLE global.product_mapping ADD CONSTRAINT product_mapping_fc_fk FOREIGN KEY (fc_code) REFERENCES global.fulfilment_centres(fc_code) ON DELETE CASCADE;
ALTER TABLE global.product_mapping ADD CONSTRAINT product_mapping_product_fk FOREIGN KEY (product_code) REFERENCES global.product_master(product_code) ON DELETE CASCADE;
ALTER TABLE global.product_mapping ADD CONSTRAINT product_mapping_store_fk FOREIGN KEY (store_code) REFERENCES global.store_master(store_code) ON DELETE CASCADE;

--changeset arnab.nandy@impactanalytics.co:product_mapping_MTP-52379 stripComments:false splitStatements:false context:MTP-52379 labels:MTP-52379
--comment: adding created_at, updated_at, created_by, updated_by columns
alter table global.product_mapping 
add column created_at timestamptz null;

alter table global.product_mapping
add column updated_at timestamptz DEFAULT now() NOT null;

alter table  global.product_mapping
add column created_by int4 null;

alter table global.product_mapping 
add column updated_by int4 null;

--changeset arnab.nandy@impactanalytics.co:product_mapping_MTP-52379_add_constraint stripComments:false splitStatements:false context:MTP-52379 labels:MTP-52379
--comment: adding created_by, updated_by fk
alter table  global.product_mapping
add CONSTRAINT product_mapping_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;

alter table  global.product_mapping
add CONSTRAINT product_mapping_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;


--changeset swapnil.bhange@impactanalytics.co:product_mapping_add_vendor_column stripComments:false splitStatements:false context:002 labels:002
--comment: adding vendor column
alter table global.product_mapping 
add column vendor varchar null;

--changeset arnab.nandy@impactanalytics.co:product_mapping_MTP-57272 stripComments:false splitStatements:false context:MTP-57272 labels:MTP-57272
--comment: making updated_at column nullable
ALTER TABLE global.product_mapping
ALTER COLUMN updated_at DROP DEFAULT;

ALTER TABLE global.product_mapping
ALTER COLUMN updated_at DROP NOT NULL;

--changeset arnab.nandy@impactanalytics.co:product_mapping_MTP-57272_unique-key stripComments:false splitStatements:false context:MTP-57272 labels:MTP-57272
--comment: adding unique key
ALTER TABLE global.product_mapping
ADD constraint product_mapping_uk unique (product_code,dc_code,mapping_type);

--changeset srishti.kumari@impactanalytics.co:adding_index stripComments:false splitStatements:false context:MTP-80747 labels:MTP-80747
--comment: adding index
CREATE INDEX idx_product_mapping_dc_code ON global.product_mapping(dc_code) WHERE mapping_type = 'product_dc' AND is_active;