--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:master_plan_attributes_id_seq stripComments:false splitStatements:false context:Release_1_1 labels:master_plan_attributes_id_seq
--comment: master_plan_attributes_id_seq
CREATE SEQUENCE if not exists item_smart.master_plan_attributes_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

--changeset pundarikaksha.mishra@impactanalytics.co:master_plan_attributes stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for master_plan_attributes

CREATE TABLE item_smart.master_plan_attributes (
	master_plan_id int4 DEFAULT nextval('item_smart.master_plan_attributes_id_seq'::regclass) NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	channel _varchar NULL,
	sub_channel _varchar NULL,
	hierarchy_filter jsonb NULL,
	sku_list _varchar NOT NULL,
	total_item_count int4 NOT NULL,
	wp_sales_units float8 NULL,
	wp_revenue float8 NULL,
	wp_margin float8 NULL,
	start_week_id int4 NULL,
	end_week_id int4 NULL,
	hierarchy_codes _varchar NULL,
	CONSTRAINT master_plan_attributes_pkey PRIMARY KEY (master_plan_id)
);
CREATE INDEX idx_id ON item_smart.master_plan_attributes USING btree (master_plan_id);