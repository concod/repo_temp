--liquibase formatted sql
--changeset liquibase:promo_product_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_product - added partition
CREATE TABLE price_promo.promo_product (
	promo_id int4 NOT NULL,
	product_id int8 NOT NULL,
	product_name varchar NOT NULL,
	CONSTRAINT promo_product_pkey PRIMARY KEY (promo_id, product_id)
)
PARTITION BY LIST (promo_id);


--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:promo_product_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for promo_product


-- Alter the table to add the uuid column
ALTER TABLE price_promo.promo_product
    ADD COLUMN "uuid" uuid DEFAULT uuid_generate_v1() NOT NULL;

-- Create the indexes as specified in DEV ENV
CREATE INDEX idx_promo_product_promo_id
    ON price_promo.promo_product USING btree (promo_id);

CREATE INDEX idx_promo_product_combined 
    ON price_promo.promo_product USING btree (promo_id, product_id);




--changeset sidharth.harish@impactanalytics.co:promo_product_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: removed product name and uuid
DROP INDEX if exists price_promo.idx_promo_product_combined;
ALTER TABLE price_promo.promo_product DROP COLUMN product_name;
ALTER TABLE price_promo.promo_product DROP COLUMN "uuid";
