--liquibase formatted sql
--changeset liquibase:dc_mrpc_kpi_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_mrpc_kpi_table
CREATE TABLE inventory_smart.dc_mrpc_kpi_table (
	product_code varchar NOT NULL,
	dc_oh int4 NULL,
	dc_oh_cost float4 NULL,
	mrpc int4 NULL,
	mrpc_cost float4 NULL,
	product_channel_name varchar NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	merchandise_category varchar NULL,
	planning_ownership varchar NULL,
	CONSTRAINT dc_mrpc_kpi_table_un UNIQUE (product_code)
);
ALTER TABLE inventory_smart.dc_mrpc_kpi_table ADD CONSTRAINT dc_mrpc_kpi_table_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;
