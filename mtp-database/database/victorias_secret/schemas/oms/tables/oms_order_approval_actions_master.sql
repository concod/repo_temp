--liquibase formatted sql
--changeset chandra.ghosh@imapctanalytiics.co:oms_orders_approved_spanx_update1 stripComments:false splitStatements:false context:MTP-57372 labels:created_new_table_update1
--comment: Created New Table

CREATE TABLE IF NOT EXISTS inventory_smart.oms_order_approval_actions_master (
	id serial4 NOT NULL,
	action_code varchar NOT NULL,
	action_desc text NULL,
	roles_allowed _varchar NULL,
	CONSTRAINT pk_oms_order_approval_actions_master PRIMARY KEY (id),
	CONSTRAINT uk_oms_order_approval_actions_master UNIQUE (action_code)
);
