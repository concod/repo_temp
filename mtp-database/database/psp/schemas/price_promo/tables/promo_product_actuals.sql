--liquibase formatted sql
--changeset liquibase:promo_product_actuals stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_product_actuals

CREATE TABLE price_promo.promo_product_actuals (
	promo_id int4 NOT NULL,
	product_id int8 NOT NULL,
	CONSTRAINT promo_product_actuals_pkey PRIMARY KEY (promo_id, product_id)
)
PARTITION BY LIST (promo_id);