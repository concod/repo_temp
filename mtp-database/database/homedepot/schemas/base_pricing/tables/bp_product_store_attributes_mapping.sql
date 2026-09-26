--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_store_attributes_mapping_v1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_store_attributes_mapping_v1

CREATE TABLE base_pricing.bp_product_store_attributes_mapping (
	product_id int8 NOT NULL,
	store_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	zone_structure varchar(50) NULL,
	channel_id int2 NULL,
	price_zone varchar(50) NULL,
	effective_price_zone varchar(50) NULL,
	"attributes" jsonb NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT bp_product_store_attributes_mapping_pkey PRIMARY KEY (product_id, store_id, segment_id)
);
CREATE INDEX idx_bp_product_store_attributes_mapping ON base_pricing.bp_product_store_attributes_mapping USING gin (attributes);
CREATE INDEX product_id ON base_pricing.bp_product_store_attributes_mapping USING btree (product_id);


	
	
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_store_attributes_mapping_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_store_attributes_mapping_v2

ALTER TABLE base_pricing.bp_product_store_attributes_mapping 
ADD COLUMN primary_bucket _varchar DEFAULT '{}'::character varying[] NULL,
ADD COLUMN primary_mode varchar NULL,
ADD COLUMN secondary_bucket _varchar DEFAULT '{}'::character varying[] NULL,
ADD COLUMN secondary_mode varchar NULL,
ADD COLUMN tertiary_bucket _varchar DEFAULT '{}'::character varying[] NULL,
ADD COLUMN tertiary_mode varchar NULL,
ADD COLUMN quaternary_bucket _varchar DEFAULT '{}'::character varying[] NULL,
ADD COLUMN quaternary_mode varchar NULL,
ADD COLUMN competitor_attributes jsonb DEFAULT '{}'::jsonb NULL;