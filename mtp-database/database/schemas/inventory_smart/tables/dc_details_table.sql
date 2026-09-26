--liquibase formatted sql
--changeset liquibase:dc_details_table_modified stripComments:false splitStatements:false context:Release_1_0 labels:MTP-68896
--comment: initial changeset for dc_details_table
CREATE TABLE IF NOT EXISTS inventory_smart.dc_details_table (
	article varchar NOT NULL,
	product_code varchar NOT NULL,
	dc_code int4 NOT NULL,
	next_po_upcoming_units int4 NULL,
	sales_forecast float8 NULL,
	demand_projection float8 NULL,
	excess_deficit_tag varchar NULL,
	recommendation_flag bool DEFAULT false NULL,
	next_po_upcoming_date date NULL,
	excess_deficit_units int4 NULL,
	cwos int4 NULL,
	CONSTRAINT dc_details_table_unique UNIQUE (product_code, dc_code),
	CONSTRAINT dc_details_table_dc_code FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE,
	CONSTRAINT dc_details_table_product_code FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);


--changeset shashwat.yadav@impactanalytics.co:idx_dc_details_article stripComments:false splitStatements:false context:Release_1_0 labels:MTP-68896
--comment: Add index idx_dc_details_article
CREATE INDEX IF NOT EXISTS idx_dc_details_article ON inventory_smart.dc_details_table (article);

--changeset anujkumar.singh@impactanalytics.co:dc_details_table_v3 stripComments:false splitStatements:false context:Release_1_0 labels:VS-629
--comment: Updated schema for dc_details_table
ALTER TABLE inventory_smart.dc_details_table ADD COLUMN IF NOT EXISTS safety_stock FLOAT8;

--changeset shashwat.yadav@impactanalytics.co:idx_dc_details_pc_article_dc stripComments:false splitStatements:false context:Release_1_0 labels:MTP-88512
--comment: Added new indexes for dc_details_table
CREATE INDEX IF NOT EXISTS idx_dc_details_pc_article_dc ON inventory_smart.dc_details_table USING btree (article, dc_code);
CREATE INDEX IF NOT EXISTS idx_dc_details_rc_article ON inventory_smart.dc_details_table USING btree (recommendation_flag, article);