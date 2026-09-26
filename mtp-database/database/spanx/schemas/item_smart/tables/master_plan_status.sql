--changeset pundarikaksha.mishra@impactanalytics.co:master_plan_status_id_seq stripComments:false splitStatements:false context:Release_1_1 labels:master_plan_status_id_seq
--comment: master_plan_status_id_seq
CREATE SEQUENCE if not exists item_smart.master_plan_status_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:master_plan_status_xxx stripComments:false splitStatements:false context:Release_1_7 labels:itemsmart_initial_commit_7
--comment: delete and constraint update

CREATE TABLE item_smart.master_plan_status (
	id serial4 NOT NULL,
	master_plan_attribute_id int4 NOT NULL,
	status varchar(255) NOT NULL,
	created_on timestamp NOT NULL,
	created_by int4 NOT NULL,
	CONSTRAINT master_plan_status_pkey PRIMARY KEY (id),
	CONSTRAINT master_plan_ledger_created_by_fkey FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT master_plan_status_master_plan_attribute_id_fkey FOREIGN KEY (master_plan_attribute_id) REFERENCES item_smart.master_plan_attributes(master_plan_id)
);
CREATE INDEX idx_master_plan_attribute_id ON item_smart.master_plan_status USING btree (master_plan_attribute_id);