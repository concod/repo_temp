--liquibase formatted sql
--changeset liquibase:temp_nle stripComments:false splitStatements:false context:MTP-35088 labels:liquibase_project_start
--comment: initial changeset for temp_nle
CREATE TABLE assort.temp_nle (
	nle_id serial4 NOT NULL,
	plan_code int4 NOT NULL,
	levels jsonb NOT NULL,
	attribute_value jsonb NOT NULL,
	CONSTRAINT temp_nle_pk PRIMARY KEY (nle_id),
	CONSTRAINT temp_nle_un UNIQUE (plan_code)
);

--changeset sadhanaj:remove_un_plan stripComments:false splitStatements:false context:MTP-39679 labels:liquibase_project_start
--comment: remove_un_plan
ALTER TABLE assort.temp_nle
DROP CONSTRAINT temp_nle_un;