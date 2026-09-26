--liquibase formatted sql
--changeset ashish@impactanalystics.co:product_attributes_filter_initial_setup stripComments:false splitStatements:false context:Release_2 labels:product_attributes_filter_initial_setup
--comment: initial changeset for product_attributes_filter
CREATE TABLE global."product_attributes_filter" (
	LIKE global.product_master 
		INCLUDING DEFAULTS 
		INCLUDING CONSTRAINTS 
     	INCLUDING STORAGE 
        INCLUDING COMMENTS,
	l0_name varchar NOT NULL
) PARTITION BY LIST (l0_name);

ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

--changeset ashish@impactanalystics.co:product_attributes_filter_rcl_setup stripComments:false splitStatements:false context:Release_2 labels:product_attributes_filter_rcl_setup
--comment: rcl changeset for product_attributes_filter
ALTER TABLE "global".product_attributes_filter ADD COLUMN psa_codes _varchar DEFAULT '{}'::character varying[] NOT NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN rcl_hash jsonb DEFAULT '{}'::jsonb NOT NULL;

