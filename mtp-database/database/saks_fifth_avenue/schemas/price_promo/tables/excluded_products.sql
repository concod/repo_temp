--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:excluded_products_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for excluded_products with partition 2

CREATE TABLE price_promo.excluded_products (
	promo_id int4 NOT NULL,
	product_id int8 NOT NULL,
	product_cid int8 NOT NULL,
	product_name text NULL
)
PARTITION BY LIST (promo_id);
create table price_promo.excluded_products_default PARTITION OF price_promo.excluded_products DEFAULT ;


--changeset abhishek.singh@impactanalytics.co:excluded_products_3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for price_promo.excluded_products
ALTER TABLE price_promo.excluded_products ALTER COLUMN product_id TYPE text USING product_id::text;