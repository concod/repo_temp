--liquibase formatted sql
--changeset tarun.reddy:product_life_cycle stripComments:false splitStatements:false context:Release_1 labels:DAT-1274
--comment: initial changeset for product_life_cycle
CREATE TABLE inventory_smart.product_life_cycle (
	article varchar NULL,
	store_code varchar NULL,
	markdown_date _text NULL,
	clearance_date _text NULL,
	launch_date date NULL,
	current_status varchar NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	next_markdown_start_date date NULL,
	next_clearance_start_date date NULL,
	next_markdown_end_date date NULL,
	next_clearance_end_date date NULL,
	l0_name varchar NULL
);
CREATE UNIQUE INDEX product_life_cycle_article_idx ON inventory_smart.product_life_cycle USING btree (article, l0_name, store_code);

--changeset kailash:product_life_cycle stripComments:false splitStatements:false context:Release_1_2 labels:MTP-59520
--comment: upload_flag
ALTER TABLE inventory_smart.product_life_cycle ADD upload_flag varchar DEFAULT 'false'::character varying NOT NULL;

