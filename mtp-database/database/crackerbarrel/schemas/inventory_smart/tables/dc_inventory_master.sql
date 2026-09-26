--liquibase formatted sql
--changeset liquibase:dc_inventory_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_inventory_master
CREATE TABLE "inventory_smart".dc_inventory_master (
	channel_code varchar  NULL,
channel varchar  NULL,
product_code varchar NOT NULL,
store_code varchar  NOT NULL,
"date" date  NOT NULL,
oh float8  NULL,
it float8  NULL,
oh_cost float8  NULL,
oh_retail float8  NULL,
it_retail float8  NULL,
it_cost float8  NULL,
expected_qty float8  NULL,
expected_retail float8  NULL,
expected_cost float8  NULL,
reserved_qty float8  NULL,
reserved_retail float8  NULL,
reserved_cost float8  NULL,
is_pack varchar  NULL,
fiscal_year_num int8  NULL,
fiscal_quarter_num int8  NULL,
fiscal_year_qtr int8  NULL,
fiscal_year_month int8  NULL,
fiscal_week_num int8  NULL,
fiscal_year_week int8  null,
CONSTRAINT dc_inventory_master_pk PRIMARY key (product_code,store_code,date)
);