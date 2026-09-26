--liquibase formatted sql
--changeset chandra.ghosh@imapctanalytiics.co:oms_orders_approved_update2 stripComments:false splitStatements:false context:MTP-57372 labels:created_new_table_update2
--comment: Created New Table_update2

CREATE TABLE IF NOT EXISTS inventory_smart.oms_orders_approval_hist (
	id serial4 NOT NULL,
	order_id int8 NULL,
	action_id int4 NULL,
	"comment" varchar NULL,
	actioned_by varchar NULL,
	actioned_at timestamptz NULL,
	CONSTRAINT pk_oms_orders_approval_hist PRIMARY KEY (id),
	CONSTRAINT fk_oms_orders_approval_hist1 FOREIGN KEY (action_id) REFERENCES inventory_smart.oms_order_approval_actions_master(id)
);

--changeset chaitanya@imapctanalytics.co:ooah_drop_pk stripComments:false splitStatements:false context:MTP-57372 labels:ooah_drop_pk
--comment: Dropping Primary Key constraint as this table is used only for history/log
ALTER TABLE inventory_smart.oms_orders_approval_hist 
DROP CONSTRAINT pk_oms_orders_approval_hist;