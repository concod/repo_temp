--liquibase formatted sql
--changeset rahul.chodvadiya@impactanalytics.co:master_plan_attributes stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_master_plan_updates
--comment: master plan attributes table 
--rollback: SELECT 1
CREATE SEQUENCE IF NOT EXISTS item_smart.master_plan_attributes_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

CREATE TABLE IF NOT EXISTS item_smart.master_plan_attributes (
	master_plan_id int4 DEFAULT nextval('item_smart.master_plan_attributes_id_seq'::regclass) NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL,
	channel _varchar NOT NULL,
	sub_channel _varchar NOT NULL,
	hierarchy_filter jsonb NULL,
	CONSTRAINT master_plan_attributes_pkey PRIMARY KEY (master_plan_id)
);

CREATE INDEX IF NOT EXISTS idx_id ON item_smart.master_plan_attributes USING btree (master_plan_id);

--changeset pundarikaksha.mishra@impactanalytics.co:seasons_column stripComments:false splitStatements:false context:Release_1_0 labels:mtp-95894
--comment: Adding seasons column

alter table item_smart.master_plan_attributes add column "seasons" varchar[];