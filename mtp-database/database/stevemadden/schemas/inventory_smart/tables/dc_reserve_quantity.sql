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
	updated_by varchar NULL,
	created_at timestamptz NULL DEFAULT now(),
	"comment" varchar NULL,
	reservation_till_date date NULL,
	CONSTRAINT dc_reserve_qty_new_pk PRIMARY KEY (product_code, channel, inventory_source, dc_code, type),
	CONSTRAINT dc_reserve1_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT dc_reserve_qty_new_fk FOREIGN KEY (dc_code) REFERENCES "global".distribution_centres(dc_code)
);

--changeset bikrant.gupta@impactanalytics.co:user_reserve stripComments:false splitStatements:false context:Release_1_0 labels:mtp-51718
--comment: user reserve changes
ALTER TABLE inventory_smart.dc_reserve_quantity ADD COLUMN IF NOT EXISTS instock_inclusion bool NULL DEFAULT true;