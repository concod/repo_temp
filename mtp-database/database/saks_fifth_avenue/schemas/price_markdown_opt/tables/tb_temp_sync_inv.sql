--liquibase formatted sql
--changeset liquibase:tb_temp_sync_inv stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_temp_sync_inv

CREATE TABLE price_markdown_opt.tb_temp_sync_inv (
	dates date NOT NULL,
	product_id int8 NOT NULL,
	store_id int4 NOT NULL,
	total_inventory int8 NULL
);
CREATE INDEX item_loc_id_idx ON price_markdown_opt.tb_temp_sync_inv USING btree (product_id, store_id);