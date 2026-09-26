--liquibase formatted sql
--changeset liquibase:dc_review_recommendation_updated_modified stripComments:false splitStatements:false context:Release_1_0 labels:MTP-68896
--comment: initial changeset for dc_review_recommendation_updated
CREATE TABLE IF NOT EXISTS inventory_smart.dc_review_recommendation_updated (
	article varchar NOT NULL,
	product_code varchar NOT NULL,
	source_dc int4 NOT NULL,
	destination_dc int4 NOT NULL,
	transfer_units int4 NULL,
	created_by int4 NOT NULL,
	created_at timestamptz DEFAULT now(),
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	status_code int4 DEFAULT 1,
	dc_transfer_code uuid NOT NULL,
	CONSTRAINT dc_review_recommendation_updated_unique UNIQUE (product_code, destination_dc, source_dc, dc_transfer_code)
);

--changeset shashwat.yadav@impactanalytics.co:idx_dc_review_recommendation_updated_article_transfer stripComments:false splitStatements:false context:Release_1_0 labels:MTP-68896
--comment: Add index idx_dc_review_recommendation_updated_article_transfer
CREATE INDEX IF NOT EXISTS idx_dc_review_recommendation_updated_article_transfer ON inventory_smart.dc_review_recommendation_updated (article, dc_transfer_code);


--changeset shashwat.yadav@impactanalytics.co:idx_dc_review_recommendation_status_date stripComments:false splitStatements:false context:Release_1_0 labels:MTP-88512
--comment: Add index idx_dc_review_recommendation_status_date
CREATE INDEX IF NOT EXISTS idx_dc_review_recommendation_status_date ON inventory_smart.dc_review_recommendation_updated USING btree (status_code, updated_at, article);

--changeset shashwat.yadav@impactanalytics.co:add_new_columns_dc_review stripComments:false splitStatements:false context:Release_1_0 labels:MTP-88512
--comment: Add new columns for WOS and transfer tracking
ALTER TABLE inventory_smart.dc_review_recommendation_updated 
ADD COLUMN IF NOT EXISTS downstream_flag bool DEFAULT false NULL,
ADD COLUMN IF NOT EXISTS source_adj_wos int4 NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS destination_adj_wos int4 NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS transfer_number varchar NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS source_cata_before_transfer int4 NULL DEFAULT NULL;

--changeset akash.bhandari@impactanalytics.co:add_new_columns_attributes stripComments:false splitStatements:false context:Release_1_0 labels:MTP-95543
--comment: Add attributes column
ALTER TABLE inventory_smart.dc_review_recommendation_updated ADD COLUMN IF NOT EXISTS attributes jsonb default '{}'::jsonb;
