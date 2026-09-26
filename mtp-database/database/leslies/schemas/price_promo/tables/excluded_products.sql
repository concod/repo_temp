--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:excluded_products_2  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for excluded_products with partition 2

CREATE TABLE price_promo.excluded_products (
	promo_id int4 NOT NULL,
	product_id text NOT NULL,
	product_cid int8 NOT NULL,
	product_name text NULL
)
PARTITION BY LIST (promo_id);