--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_price_bucket_details_8 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_price_bucket_details_8

CREATE TABLE IF NOT EXISTS base_pricing_restaurant.bp_price_bucket_details (
	id int4 NULL,
	direction varchar(20) NULL,
	min_range float8 NULL,
	max_range float8 NULL,
	category varchar NULL
);
CREATE INDEX IF NOT EXISTS idx_pbd_direction ON base_pricing_restaurant.bp_price_bucket_details USING btree (direction);

--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_price_bucket_details_7 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_price_bucket_details_7
ALTER TABLE base_pricing_restaurant.bp_price_bucket_details
ADD CONSTRAINT bp_price_bucket_details_pkey PRIMARY KEY (id);
