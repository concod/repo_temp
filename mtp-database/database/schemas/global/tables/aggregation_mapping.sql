--liquibase formatted sql
--changeset liquibase:aggregation_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for aggregation_mapping
CREATE TABLE "global".aggregation_mapping (
	mapping_code serial4 NOT NULL,
	mapping_type varchar NOT NULL,
	aggregation_code varchar NULL,
	store_code varchar NULL,
	dc_code int4 NULL,
	fc_code int4 NULL,
	is_active bool NOT NULL DEFAULT true,
	validity datemultirange NULL,
	CONSTRAINT aggregation_mapping_dc_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE,
	CONSTRAINT aggregation_mapping_fc_fk FOREIGN KEY (fc_code) REFERENCES "global".fulfilment_centres(fc_code) ON DELETE CASCADE,
	CONSTRAINT aggregation_mapping_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);

--changeset arnab.nandy@impactanalytics.co:aggregation_mapping_MTP-52379 stripComments:false splitStatements:false context:MTP-52379 labels:MTP-52379
--comment: adding created_at, updated_at, created_by, updated_by columns
alter table global.aggregation_mapping 
add column created_at timestamptz null;

alter table global.aggregation_mapping
add column updated_at timestamptz DEFAULT now() NOT null;

alter table  global.aggregation_mapping
add column created_by int4 null;

alter table global.aggregation_mapping 
add column updated_by int4 null;

alter table  global.aggregation_mapping
add CONSTRAINT aggregation_mapping_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;

alter table  global.aggregation_mapping
add CONSTRAINT aggregation_mapping_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;

--changeset arnab.nandy@impactanalytics.co:aggregation_mapping_MTP-57272 stripComments:false splitStatements:false context:MTP-57272 labels:MTP-57272
--comment: Making updated_at column nullable
ALTER TABLE global.aggregation_mapping
ALTER COLUMN updated_at DROP DEFAULT;

ALTER TABLE global.aggregation_mapping
ALTER COLUMN updated_at DROP NOT NULL;

--changeset kamalesh.k@impactanalytics.co:aggregation_mapping stripComments:false splitStatements:false context:MTP-57272 labels:MTP-57272
--comment: adding primary key for aggregation_mapping
Alter table global.aggregation_mapping
add CONSTRAINT aggrecation_mapping_pkey PRIMARY KEY (mapping_code);
