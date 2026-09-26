--liquibase formatted sql
--changeset liquibase:notification_event_trigger_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notification_event_trigger_mapping
CREATE TABLE global.notification_event_trigger_mapping (
    noe_code integer NOT NULL,
    not_code integer NOT NULL
);
ALTER TABLE global.notification_event_trigger_mapping
    ADD CONSTRAINT noetm_event_fk FOREIGN KEY (noe_code) REFERENCES global.notification_event_master(noe_code) ON DELETE CASCADE;
ALTER TABLE global.notification_event_trigger_mapping
    ADD CONSTRAINT noetm_trigger_fk FOREIGN KEY (not_code) REFERENCES global.notification_triggers_master(not_code) ON DELETE CASCADE;

--changeset kamaleshwaran.k@impactanalytics.co:notification_event_trigger_mapping_1 stripComments:false splitStatements:false context:Release_2 labels:initial changeset for updating the primary key 
--comment: initial changeset for updating the primary key 

ALTER TABLE global.notification_event_trigger_mapping ADD COLUMN id SERIAL;

ALTER TABLE global.notification_event_trigger_mapping 
ADD CONSTRAINT notification_event_trigger_mapping_pk PRIMARY KEY (id);