--liquibase formatted sql
--changeset chandra.ghosh@imapctanalytiics.co:oms_orders_approved_briscoes_update2 stripComments:false splitStatements:false context:MTP-57372 labels:created_new_table_update1
--comment: Created New Table

CREATE TABLE IF NOT EXISTS oms.oms_order_approval_actions_master (
	id serial4 NOT NULL,
	action_code varchar NOT NULL,
	action_desc text NULL,
	roles_allowed _varchar NULL,
	CONSTRAINT pk_oms_order_approval_actions_master PRIMARY KEY (id),
	CONSTRAINT uk_oms_order_approval_actions_master UNIQUE (action_code)
);


--changeset raja.duraisamy@impactanalytics.co:oms_order_approval_actions_master_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_order_approval_actions_master based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_order_approval_actions_master_action_code ON oms.oms_order_approval_actions_master(action_code);