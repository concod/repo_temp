--liquibase formatted sql
--changeset liquibase:oms_order_approval_actions_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_order_approval_actions_master
CREATE TABLE inventory_smart.oms_order_approval_actions_master (
	id serial4 NOT NULL,
	action_code varchar NOT NULL,
	action_desc text NULL,
	roles_allowed _varchar NULL,
	CONSTRAINT pk_oms_order_approval_actions_master PRIMARY KEY (id),
	CONSTRAINT uk_oms_order_approval_actions_master UNIQUE (action_code)
);
