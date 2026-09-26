--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:master_plan_status_id_seq stripComments:false splitStatements:false context:Release_1_1 labels:master_plan_status_id_seq
--comment: master_plan_status_id_seq
CREATE SEQUENCE if not exists item_smart.master_plan_status_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

--changeset pundarikaksha.mishra@impactanalytics.co:master_plan_status stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for master_plan_status
CREATE TABLE item_smart.master_plan_status (
	id int4 DEFAULT nextval('item_smart.master_plan_status_id_seq'::regclass) NOT NULL,
	master_plan_attribute_id int4 NOT NULL,
	status varchar(255) NOT NULL,
	created_on timestamp NOT NULL,
	created_by int4 NOT NULL,
	approved_by int4 NULL,
	approved_on timestamp NULL,
	"comment" varchar(255) NULL,
	edited_by int4 NULL,
	edited_on timestamp NULL,
	CONSTRAINT master_plan_status_pkey PRIMARY KEY (id),
	CONSTRAINT master_plan_status_created_by_fkey FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code),
	CONSTRAINT master_plan_status_master_plan_attribute_id_fkey FOREIGN KEY (master_plan_attribute_id) REFERENCES item_smart.master_plan_attributes(master_plan_id)
);
CREATE INDEX idx_master_plan_attribute_id ON item_smart.master_plan_status USING btree (master_plan_attribute_id);