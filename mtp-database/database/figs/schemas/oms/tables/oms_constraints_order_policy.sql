--liquibase formatted sql
--changeset liquibase:oms_constraints_lead_time_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for oms_constraints_order_policys
CREATE TABLE IF NOT EXISTS inventory_smart.oms_constraints_order_policy (
	id integer  NULL,
	article varchar NOT NULL,
	loc_code varchar NOT NULL,
	vendor_code varchar NULL,
	vendor_name varchar NULL,
	replenishment_strategy varchar NULL,
	scheduler varchar NULL,
	order_strategy varchar NULL,
	shipment_frequency varchar NULL,
	created_by int4 NULL,
	created_at timestamptz NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	channel varchar NULL,
	CONSTRAINT pk_oms_constraints_order_policy PRIMARY KEY (article, loc_code)
);

CREATE SEQUENCE IF NOT EXISTS inventory_smart.oms_constraints_order_policy_new_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
    
ALTER TABLE inventory_smart.oms_constraints_order_policy
ALTER COLUMN id SET DEFAULT nextval('inventory_smart.oms_constraints_order_policy_new_id_seq'::regclass);