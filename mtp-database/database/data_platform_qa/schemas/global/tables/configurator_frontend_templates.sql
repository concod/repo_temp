--liquibase formatted sql
--changeset liquibase:configurator_frontend_templates stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for configurator_frontend_templates
CREATE TABLE IF NOT EXISTS "global".configurator_frontend_templates (
module_code int4 NOT NULL,
application_code int4 NOT NULL,
screen_code int4 NOT NULL,
"template" jsonb NULL,
configuration_name text NULL,
CONSTRAINT screen_configuration_un UNIQUE (module_code, application_code, screen_code, configuration_name),
CONSTRAINT screen_configuration_application_fk FOREIGN KEY (application_code) REFERENCES "global".application_master(application_code),
CONSTRAINT screen_configuration_screen_fk FOREIGN KEY (screen_code) REFERENCES "global".screen_master(screen_code)
);