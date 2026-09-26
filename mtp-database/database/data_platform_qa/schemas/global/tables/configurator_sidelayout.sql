--liquibase formatted sql
--changeset liquibase:configurator_sidelayout stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for configurator_sidelayout
CREATE TABLE IF NOT EXISTS "global".configurator_sidelayout (
application_code int4 NOT NULL,
screen_code int4 NOT NULL,
"template" jsonb NULL,
CONSTRAINT configurator_sidelayout_un UNIQUE (application_code, screen_code),
CONSTRAINT configurator_sidelayout_application_fk FOREIGN KEY (application_code) REFERENCES "global".application_master(application_code),
CONSTRAINT configurator_sidelayout_screen_fk FOREIGN KEY (screen_code) REFERENCES "global".screen_master(screen_code)
);