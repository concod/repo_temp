--liquibase formatted sql
--changeset liquibase:configurator_mandatory_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for configurator_mandatory_attributes
CREATE TABLE IF NOT EXISTS "global".configurator_mandatory_attributes (
	screen_code int4 NOT NULL,
	mandatory_attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT configurator_mandatory_attributes_unique UNIQUE (screen_code),
	CONSTRAINT configurator_mandatory_attributes_screen_master_fk FOREIGN KEY (screen_code) REFERENCES "global".screen_master(screen_code) ON DELETE CASCADE
);

--changeset kamalesh.k@impactanalytics.co:configurator_mandatory_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: primary key for configurator_mandatory_attributes

ALTER TABLE "global".configurator_mandatory_attributes
DROP CONSTRAINT IF EXISTS configurator_mandatory_attributes_unique;

ALTER TABLE "global".configurator_mandatory_attributes
ADD CONSTRAINT configurator_mandatory_attributes_pkey PRIMARY KEY (screen_code);