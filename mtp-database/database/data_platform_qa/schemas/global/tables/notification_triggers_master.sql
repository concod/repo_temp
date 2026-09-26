--liquibase formatted sql
--changeset liquibase:notification_triggers_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notification_triggers_master
CREATE TABLE global.notification_triggers_master (
    not_code serial4 NOT NULL,
    product varchar NOT NULL,
    action varchar NOT NULL,
    url text,
    screen_code integer
);
ALTER TABLE global.notification_triggers_master
    ADD CONSTRAINT notification_triggers_master_pk PRIMARY KEY (not_code);
ALTER TABLE global.notification_triggers_master
    ADD CONSTRAINT notification_triggers_master_fk FOREIGN KEY (screen_code) REFERENCES global.screen_master(screen_code);
