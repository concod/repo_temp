--liquibase formatted sql
--changeset aman.pareek@imapctanalytiics.co:oms_orders_approved_hist_briscoes_2 stripComments:false splitStatements:false context:MTP-57372 labels:MTP-97176
--comment: Created New Table_update2

CREATE TABLE inventory_smart.oms_orders_approval_hist_store (
	id serial4 NOT NULL,
	order_id int8 NULL,
	action_id int4 NULL,
	"comment" varchar NULL,
	actioned_by varchar NULL,
	actioned_at timestamptz NULL,
	CONSTRAINT pk_oms_orders_approval_hist_store PRIMARY KEY (id)
);


-- inventory_smart.oms_orders_approval_hist foreign keys

ALTER TABLE inventory_smart.oms_orders_approval_hist_store ADD CONSTRAINT fk_oms_orders_approval_hist_store FOREIGN KEY (action_id) REFERENCES inventory_smart.oms_order_approval_actions_master(id);