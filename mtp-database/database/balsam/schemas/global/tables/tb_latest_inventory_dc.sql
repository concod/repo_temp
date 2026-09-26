--liquibase formatted sql
--changeset liquibase:tb_latest_inventory_dc stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_latest_inventory_dc
CREATE TABLE "global".tb_latest_inventory_dc (
	s0_id int4 NULL,
	s0_name varchar(50) NULL,
	s1_id int4 NULL,
	s1_name varchar(50) NULL,
	style_cuq text NULL,
	product_id int4 NULL,
	clearance_indicator int4 NULL,
	"date" date NULL,
	oh int4 NULL,
	it int4 NULL,
	oo int4 NULL,
	vendor_oo int4 NULL,
	total_inventory int4 NULL,
	CONSTRAINT tb_latest_inventory_dc_unique UNIQUE (s0_id, s1_id, product_id, date)
);

--changeset harsh.singh@impactanalytics.co:tb_latest_inventory_dc_added_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added primary key to tb_latest_inventory_dc
ALTER TABLE "global".tb_latest_inventory_dc
    ADD CONSTRAINT tb_latest_inventory_dc_pk PRIMARY KEY (s0_id, s1_id, product_id, date);
ALTER TABLE "global".tb_latest_inventory_dc
    DROP CONSTRAINT IF EXISTS tb_latest_inventory_dc_unique;
