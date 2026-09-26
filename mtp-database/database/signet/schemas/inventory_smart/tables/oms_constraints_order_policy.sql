--liquibase formatted sql
--changeset vishal.kumar:oms_constraints_order_policy stripComments:false splitStatements:false context:Release_1_9 labels:liquibase_project_start
--comment: initial changeset for oms_constraints_order_policy
CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_order_policy (
	product_code varchar NOT NULL,
	replenishment_strategy varchar NOT NULL,
	order_cycle jsonb NOT NULL,
	lot_sizing_strategy text NOT NULL,
	created_by varchar NOT NULL,
	created_at timestamptz NOT NULL,
	updated_by varchar NULL,
	updated_at timestamptz NULL,
	wos int4 NOT NULL DEFAULT 4,
	frequency varchar NULL,
	CONSTRAINT pk_oms_constraints_order_policy PRIMARY KEY (product_code)
);

--liquibase formatted sql
--changeset kishan.patel:id column add stripComments:false splitStatements:false context:Release_1_9 labels:liquibase_project_start
--comment: initial changeset for oms_constraints_order_policy

ALTER TABLE inventory_smart.oms_constraints_order_policy ADD COLUMN IF NOT EXISTS id serial4 NOT NULL;