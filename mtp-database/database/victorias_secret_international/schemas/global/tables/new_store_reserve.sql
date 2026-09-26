--liquibase formatted sql
--changeset harshitha.sv@impactanalytics.co:new_store_reserve stripComments:false splitStatements:false context:vs_intl_inventory_smart labels:MTP-73133
--comment: initial changeset for new_store_reserve

CREATE TABLE "global".new_store_reserve (
	store_code varchar NULL,
	product_code varchar NULL,
	"size" varchar NULL,
	article varchar NULL,
	opening_date date NULL,
	reservation_date date NULL,
	original_reserved int4 NULL,
	remaining_reserved int4 NULL,
	created_at timestamptz NULL DEFAULT now(),
	approved bool NULL DEFAULT false,
	created_by varchar NULL,
	sister_store_code varchar NULL,
	editable bool NULL DEFAULT true,
	sister_store_mapping_date date NULL,
	edit_details jsonb NULL,
	store_group_mapping_date date NULL,
	store_groups _varchar NULL,
	mapped bool NULL DEFAULT false,
	forecast_estimated int4 NULL,
	store_grade varchar NULL,
	wos float4 NULL,
	min_stock float4 NULL,
	max_stock float4 NULL,
	channel varchar NULL,
	mapping_code int4 NULL,
	approved_qty int4 NULL,
	released_qty int4 NULL,
	released bool NULL,
	remodel_flag bool NULL,
	downstream_flag bool NULL DEFAULT false,
	CONSTRAINT new_store_reserve_un UNIQUE (store_code, product_code)
);
CREATE INDEX idx_store_code ON global.new_store_reserve USING btree (store_code);
CREATE INDEX idx_store_groups ON global.new_store_reserve USING gin (store_groups);

--changeset harshitha.sv@impactanalytics.co:new_store_reserve_update stripComments:false splitStatements:false context:vs_intl_inventory_smart labels:liquibase_project_start
--comment: Primary Key for new_store_reserve
ALTER TABLE "global".new_store_reserve ADD CONSTRAINT new_store_reserve_pk PRIMARY KEY (store_code, product_code);

