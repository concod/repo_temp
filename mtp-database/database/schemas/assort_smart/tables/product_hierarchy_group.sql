--liquibase formatted sql
--changeset liquibase:product_hierarchy_group stripComments:false splitStatements:false context:Create_table labels:liquibase_project_start
--comment: initial changeset for product_hierarchy_group

CREATE TABLE assort_smart.product_hierarchy_group (
	hierarchy_code varchar NOT NULL,
	"path" jsonb NOT NULL,
	"level" int2 NOT NULL,
	active bool NOT NULL DEFAULT true,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NULL,
	CONSTRAINT product_hierarchy_group_pk PRIMARY KEY (hierarchy_code),
	CONSTRAINT product_hierarchy_group_un UNIQUE (path, level)
);
CREATE INDEX product_hierarchy_group_level_idx ON assort_smart.product_hierarchy_group USING btree (level);

--changeset kailash.yadav@impactanalytics.co:product_hierarchy_group stripComments:false splitStatements:false context:Create_table labels:liquibase_project_start
--comment: initial changeset for product_hierarchy_group
ALTER TABLE assort_smart.product_hierarchy_group ADD is_custom_hierarchy bool NULL DEFAULT false;