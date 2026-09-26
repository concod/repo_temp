--changeset pundarikaksha.mishra@impactanalytics.co:master_plan_ledger_id_seq stripComments:false splitStatements:false context:Release_1_1 labels:master_plan_ledger_id_seq
--comment: master_plan_ledger_id_seq
CREATE SEQUENCE if not exists item_smart.master_plan_ledger_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:master_plan_ledger_xxx stripComments:false splitStatements:false context:Release_1_7 labels:itemsmart_initial_commit_7
--comment: delete and constraint update

CREATE TABLE item_smart.master_plan_ledger (
	id serial4 NOT NULL,
	master_plan_filters_id int4 NOT NULL,
	status varchar(255) NOT NULL,
	"comment" varchar(255) NULL,
	edited_by int4 NULL,
	edited_on timestamp NULL,
	approved_by int4 NULL,
	approved_on timestamp NULL,
	CONSTRAINT master_plan_ledger_pkey PRIMARY KEY (id),
	CONSTRAINT master_plan_ledger_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT master_plan_ledger_edited_by_fkey FOREIGN KEY (edited_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT master_plan_ledger_master_plan_filters_id_fkey FOREIGN KEY (master_plan_filters_id) REFERENCES item_smart.master_plan_attributes(master_plan_id)
);