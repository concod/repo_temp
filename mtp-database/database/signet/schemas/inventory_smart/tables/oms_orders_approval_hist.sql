--liquibase formatted sql
--changeset liquibase:oms_orders_approval_hist stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_orders_approval_hist
CREATE TABLE inventory_smart.oms_orders_approval_hist (
	id serial4 NOT NULL,
	order_id int8 NULL,
	action_id int4 NULL,
	"comment" varchar NULL,
	actioned_by varchar NULL,
	actioned_at timestamptz NULL,
	CONSTRAINT pk_oms_orders_approval_hist PRIMARY KEY (id),
	CONSTRAINT fk_oms_orders_approval_hist1 FOREIGN KEY (action_id) REFERENCES inventory_smart.oms_order_approval_actions_master(id)
);