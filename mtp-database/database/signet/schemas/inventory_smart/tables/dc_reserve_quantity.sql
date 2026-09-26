--liquibase formatted sql
--changeset liquibase:dc_reserve_quantity_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_reserve_quantity
CREATE TABLE IF NOT EXISTS inventory_smart.dc_reserve_quantity (
	product_code varchar NOT NULL,
	quantity int4 NULL,
	channel varchar NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	"type" varchar NOT NULL,
	inventory_source varchar NOT NULL,
	dc_code int4 NOT NULL,
	CONSTRAINT dc_reserve_quantity_pk PRIMARY KEY (product_code, dc_code, type)
);
ALTER TABLE inventory_smart.dc_reserve_quantity DROP CONSTRAINT IF EXISTS dc_reserve_quantity_fk;
ALTER TABLE inventory_smart.dc_reserve_quantity DROP CONSTRAINT IF EXISTS dc_reserve_quantity_product_fk;
ALTER TABLE inventory_smart.dc_reserve_quantity ADD CONSTRAINT dc_reserve_quantity_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.dc_reserve_quantity ADD CONSTRAINT dc_reserve_quantity_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

--changeset anshuman.ghosh@impactanalytics.co:dc_reserve_quantity_4 stripComments:false splitStatements:false context:Release_1_0_1 labels:JIRA_NO 
--comment Add comment describing your change 

ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN IF NOT EXISTS reservation_till_date date NULL;
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN IF NOT EXISTS instock_inclusion bool NULL DEFAULT true;
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN IF NOT EXISTS updated_by varchar NULL;
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN IF NOT EXISTS "comment" varchar NULL;


--rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1 ;

--changeset anshuman.ghosh@impactanalytics.co:dc_reserve_quantity_5 stripComments:false splitStatements:false context:Release_1_0_2 labels:JIRA_NO 
--comment Add comment describing your change 

ALTER TABLE inventory_smart.dc_reserve_quantity ALTER COLUMN instock_inclusion SET DEFAULT true;
UPDATE inventory_smart.dc_reserve_quantity SET instock_inclusion = true;

--rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1 ;
--changeset mayank.dubey@impactanalytics.co:dc_reserve_quantity_6 stripComments:false splitStatements:false context:MTP-36329 labels:MTP-36329 
--comment Change instock default value
ALTER TABLE inventory_smart.dc_reserve_quantity ALTER COLUMN instock_inclusion SET DEFAULT false;
