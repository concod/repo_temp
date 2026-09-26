--liquibase formatted sql
--changeset saad.adeeb@impactanalytics.co:priority_code_configuration stripComments:false splitStatements:false context:_MTP-34244 labels:RalphLauren
--comment : initial changeset for priority_code_config

CREATE TABLE inventory_smart.priority_code_configuration (
	article varchar NOT NULL,
	store_code varchar NOT NULL,
	channel varchar NOT NULL,
	priority_code varchar NULL,
	l0_name varchar NULL,
	CONSTRAINT article_store_un UNIQUE (article, store_code, l0_name)
)
PARTITION BY LIST (l0_name);

ALTER TABLE inventory_smart.priority_code_configuration ADD CONSTRAINT priority_code_configuration_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code);

--changeset saad.adeeb@impactanalytics.co:priority_code_configuration_2cols_add stripComments:false splitStatements:false context:_MTP-34244 labels:RalphLauren
--comment : priority_code_config addition of update_at and updated_by
alter table inventory_smart.priority_code_configuration  add column updated_at timestamptz NOT NULL DEFAULT now();
alter table inventory_smart.priority_code_configuration  add column	updated_by int4 null;

--changeset saad.adeeb@impactanalytics.co:priority_code_configuration_instore_date_add stripComments:false splitStatements:false context:_MTP-34244 labels:MTP-36140
--comment : priority_code_config addition of instore_date

ALTER TABLE inventory_smart.priority_code_configuration ADD instore_date date NULL DEFAULT current_date;