--liquibase formatted sql
--changeset liquibase:notification_event_role_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notification_event_role_mapping
CREATE TABLE global.notification_event_role_mapping (
    noe_code integer NOT NULL,
    role_code integer NOT NULL
);
ALTER TABLE global.notification_event_role_mapping
    ADD CONSTRAINT noerm_event_fk FOREIGN KEY (noe_code) REFERENCES global.notification_event_master(noe_code) ON DELETE CASCADE;
ALTER TABLE global.notification_event_role_mapping
    ADD CONSTRAINT noerm_role_fk FOREIGN KEY (role_code) REFERENCES global.roles_master(role_code) ON DELETE CASCADE;

--changeset kamaleshwaran.k@impactanalytics.co:notification_event_role_mapping_1 stripComments:false splitStatements:false context:Release_2 labels:initial changeset for updating the primary key 
--comment: initial changeset for updating the primary key 

ALTER TABLE global.notification_event_role_mapping ADD COLUMN id SERIAL;

ALTER TABLE global.notification_event_role_mapping 
ADD CONSTRAINT notification_event_role_mapping_pk PRIMARY KEY (id);