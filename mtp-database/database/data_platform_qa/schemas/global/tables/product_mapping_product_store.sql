--liquibase formatted sql
--changeset liquibase:product_mapping_product_store stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_mapping_product_store
CREATE TABLE "global".product_mapping_product_store (
	mapping_code serial4 NOT NULL,
	mapping_type varchar NOT NULL,
	l0_name varchar NOT NULL,
	product_code varchar NOT NULL,
	store_code varchar NOT NULL,
	is_active bool NOT NULL DEFAULT true,
	validity datemultirange NULL,
	CONSTRAINT product_mapping_product_store_pk PRIMARY KEY (mapping_code, l0_name),
	CONSTRAINT product_store_mapping_un UNIQUE (l0_name, product_code, store_code)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_mapping_product_store_product_code_idx ON global.product_mapping_product_store USING btree (product_code);
CREATE INDEX product_mapping_product_store_store_code_idx ON global.product_mapping_product_store USING btree (store_code);
ALTER TABLE "global".product_mapping_product_store ADD CONSTRAINT product_mapping_product_store_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
ALTER TABLE "global".product_mapping_product_store ADD CONSTRAINT product_mapping_product_store_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;


--changeset kailash.yadav@impactanalytics.co:product_mapping_product_store stripComments:false splitStatements:false context:change_log labels:updated_by_column_add
--comment: change set to add column updated_by

ALTER TABLE "global".product_mapping_product_store ADD updated_by int4 NULL;

ALTER TABLE "global".product_mapping_product_store ADD CONSTRAINT product_mapping_product_store_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;

--changeset ashish.gupta:product_mapping_product_store stripComments:false splitStatements:false context:Add_inv_source_flag labels:Requested_by_RL
--comment: inv_source_flag will help to identify it at product_store level

ALTER TABLE "global".product_mapping_product_store ADD inv_source_flag int2 NULL DEFAULT 0;

--changeset mayank.dubey:product_mapping_product_store stripComments:false splitStatements:false context:Add updated at column labels:Requested_by_RL
--comment: add updated at column
ALTER TABLE "global".product_mapping_product_store ADD updated_at timestamptz NULL;
ALTER TABLE "global".product_mapping_product_store ALTER COLUMN updated_at SET DEFAULT now();

--changeset ashish@impactanalytics.co:product_mapping_product_store_idx stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: product_mapping_product_store IDX
CREATE INDEX IF NOT EXISTS product_mapping_product_store_prod_code ON global.product_mapping_product_store USING btree (l0_name, product_code);

--changeset shreyas.sankpal@impactanalytics.co:product_mapping_product_store_MTP-52725 stripComments:false splitStatements:false context:Columns_for_is_upload labels:MTP-52725
--comment: add columns creation_source_id and current_updation_id
ALTER TABLE "global".product_mapping_product_store ADD creation_source_id int4 DEFAULT 0 NULL;
ALTER TABLE "global".product_mapping_product_store ADD current_updation_id int4 DEFAULT 0 NULL;