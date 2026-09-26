--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:included_products  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for included_products


CREATE TABLE price_promo.included_products (
	promo_id int4 NOT NULL,
	product_id int8 NOT NULL,
	product_name varchar NULL
)
PARTITION BY LIST (promo_id);