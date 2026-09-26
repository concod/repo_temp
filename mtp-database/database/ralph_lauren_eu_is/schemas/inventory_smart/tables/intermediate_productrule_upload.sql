--liquibase formatted sql
--changeset liquibase:intermediate_productrule_upload stripComments:false splitStatements:false context:MTP-38411 labels:MTP-38411
--comment: intermediate_productrule_upload MTP-38411
CREATE TABLE inventory_smart.intermediate_productrule_upload (
	channel varchar NULL,
	article varchar NULL,
	sg_name varchar NULL,
	"default" float4 NULL,
	updated_at timestamptz NULL,
	created_by text NULL,
	child_id text NULL,
	file_id text NULL
);

--changeset kailash:intermediate_productrule_upload stripComments:false splitStatements:false context:MTP-41568 labels:MTP-41568
--comment: mass delete MTP-41568
ALTER TABLE inventory_smart.intermediate_productrule_upload ADD "delete" float4 NULL;

--changeset add upload type stripComments:false splitStatements:false context:MTP-80380 labels:MTP-80380
--comment: add upload type MTP-80380
ALTER TABLE inventory_smart.intermediate_productrule_upload ADD upload_type varchar NULL;