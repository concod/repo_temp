--liquibase formatted sql
--changeset liquibase:tb_latest_inventory_channel_agg stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_latest_inventory_channel_agg

CREATE TABLE "global".tb_latest_inventory_channel_agg (
	inventory_date date NOT NULL,
	parent_id int8 NOT NULL,
	product_id int4 NOT NULL,
	s0_id int4 NOT NULL,
	s1_id int4 NOT NULL,
	channel varchar NOT NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	vendor_oo int4 NULL,
	total_inventory int4 NULL
)
;

-- changeset vamsi.balaga@impactanalytics.co:tb_latest_inventory_channel_agg_added_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added primary key to tb_latest_inventory_channel_agg
ALTER TABLE "global"."tb_latest_inventory_channel_agg"
    ADD CONSTRAINT tb_latest_inventory_channel_agg_pk PRIMARY KEY (inventory_date,parent_id,product_id,s0_id,s1_id,channel);