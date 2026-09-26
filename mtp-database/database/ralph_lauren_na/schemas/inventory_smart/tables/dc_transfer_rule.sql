--liquibase formatted sql
--changeset liquibase:dc_transfer_rule_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dc_transfer_rule

CREATE TABLE inventory_smart.dc_transfer_rule (
	rule_id serial4 NOT NULL,
	rule_name varchar(200) NOT NULL,
	channel varchar(50) NOT NULL,
	dc_grp varchar(100) NULL,
	is_default bool DEFAULT false NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	updated_by int4 NULL,
	updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT dc_transfer_rule_pkey PRIMARY KEY (rule_id),
	CONSTRAINT dc_transfer_rule_rule_name_key UNIQUE (rule_name)
);

--changeset surya.kuruvadi:dc_transfer_rule stripComments:false splitStatements:false context:Release_1_1 labels:MTP-126522
--comment: created by column added and removed default for updated at column

ALTER TABLE inventory_smart.dc_transfer_rule ADD COLUMN created_by int4 NULL;
ALTER TABLE inventory_smart.dc_transfer_rule ALTER COLUMN updated_at DROP DEFAULT;
