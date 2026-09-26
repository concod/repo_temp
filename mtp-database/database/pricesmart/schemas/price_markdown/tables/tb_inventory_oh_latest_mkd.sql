--liquibase formatted sql
--changeset liquibase:tb_inventory_oh_latest_mkd stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_inventory_oh_latest_mkd
CREATE TABLE price_markdown.tb_inventory_oh_latest_mkd (
	item_id int8 NOT NULL,
	location_id int4 NOT NULL,
	dates date NOT NULL,
	on_hand_unit_qty int8 NULL,
	in_transit_unit_qty int8 NULL,
	total_qty int8 NULL,
	store_ratio float8 NULL
);
CREATE INDEX inventory_oh_latest_mkd_item_idx ON price_markdown.tb_inventory_oh_latest_mkd USING btree (item_id);
CREATE INDEX inventory_oh_latest_mkd_store_idx ON price_markdown.tb_inventory_oh_latest_mkd USING btree (item_id, location_id);