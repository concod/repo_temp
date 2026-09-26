--liquibase formatted sql
--changeset chandra.ghosh@imapctanalytiics.co:oms_orders_approved_hist_briscoes_2 stripComments:false splitStatements:false context:MTP-57372 labels:created_new_table_update2
--comment: Created New Table_update2

CREATE TABLE IF NOT EXISTS oms.oms_orders_approval_hist (
	id serial4 NOT NULL,
	order_id int8 NULL,
	action_id int4 NULL,
	"comment" varchar NULL,
	actioned_by varchar NULL,
	actioned_at timestamptz NULL,
	CONSTRAINT fk_oms_orders_approval_hist1 FOREIGN KEY (action_id) REFERENCES oms.oms_order_approval_actions_master(id)
);

--changeset raja.duraisamy@impactanalytics.co:oms_orders_approval_hist_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for oms_orders_approval_hist based on query analysis
CREATE INDEX IF NOT EXISTS idx_oms_orders_approval_hist_order_id ON oms.oms_orders_approval_hist(order_id);
CREATE INDEX IF NOT EXISTS idx_oms_orders_approval_hist_action_id ON oms.oms_orders_approval_hist(action_id);
