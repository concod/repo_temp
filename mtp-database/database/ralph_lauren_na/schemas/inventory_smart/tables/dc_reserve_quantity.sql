--liquibase formatted sql
--changeset liquibase:dc_reserve_quantity stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_reserve_quantity
CREATE TABLE inventory_smart.dc_reserve_quantity (
	product_code varchar NOT NULL,
	quantity int4 NULL,
	channel varchar NOT NULL,
	updated_at timestamptz NULL,
	"type" varchar NOT NULL,
	inventory_source varchar NOT NULL,
	dc_code int4 NOT NULL,
	reservation_till_date date NULL,
	created_at timestamptz NULL DEFAULT now(),
	instock_inclusion bool NULL DEFAULT true,
	updated_by varchar NULL,
	"comment" varchar NULL,
	CONSTRAINT dc_reserve_qty_new_pk PRIMARY KEY (product_code, channel, inventory_source, dc_code, type),
	CONSTRAINT dc_reserve1_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT dc_reserve_qty_new_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code)
);

--changeset mayank.dubey@impactanalytics.co:dc_reserve_quantity stripComments:false splitStatements:false context:MTP-27062 labels:liquibase_project_start
--comment: add plan_code and org_plan_code column and unique constraint
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN plan_code VARCHAR NULL;
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN org_plan_code VARCHAR NULL;

--changeset mayank.dubey@impactanalytics.co:dc_reserve_quantity_v2 stripComments:false splitStatements:false context:MTP-27504 labels:liquibase_project_start
--comment: add id column and drop null contraint from type
ALTER TABLE inventory_smart.dc_reserve_quantity DROP CONSTRAINT dc_reserve_qty_new_pk;
ALTER TABLE inventory_smart.dc_reserve_quantity ADD CONSTRAINT dc_code_channel_product_type_unique UNIQUE (product_code, channel, dc_code, inventory_source, plan_code);
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN _id BIGSERIAL PRIMARY KEY;
ALTER TABLE inventory_smart.dc_reserve_quantity ALTER COLUMN "type" DROP NOT NULL;

--changeset mayank.dubey@impactanalytics.co:dc_reserve_quantity_v3 stripComments:false splitStatements:false context:MTP-29953 labels:liquibase_project_start
--comment: add pack type id
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN pack_type_id VARCHAR NULL;
ALTER TABLE inventory_smart.dc_reserve_quantity DROP CONSTRAINT dc_code_channel_product_type_unique;
ALTER TABLE inventory_smart.dc_reserve_quantity ADD CONSTRAINT dc_code_channel_product_type_unique UNIQUE (product_code, channel, dc_code, inventory_source, plan_code, pack_type_id);

--changeset nibeel.yunus@impactanalytics.co:dc_reserve_quantity_v5 stripComments:false splitStatements:false context:MTP-47735 update constiraint before removing column labels:liquibase_project_start
--comment: update constiraint before removing column
ALTER TABLE inventory_smart.dc_reserve_quantity DROP CONSTRAINT dc_code_channel_product_type_unique;
ALTER TABLE inventory_smart.dc_reserve_quantity ADD CONSTRAINT dc_code_channel_product_type_unique UNIQUE (product_code, channel, dc_code, inventory_source, plan_code);
ALTER TABLE inventory_smart.dc_reserve_quantity DROP COLUMN pack_type_id;

--changeset mayank.dubey@impactanalytics.co:dc_reserve_quantity_v6 stripComments:false splitStatements:false context:MTP-49765 update constiraint before removing column labels:liquibase_project_start
--comment: add is uploaded column
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN is_uploaded BOOLEAN NULL DEFAULT false;