--liquibase formatted sql
--changeset liquibase:alert_refresh_configuration stripComments:false splitStatements:false context:MTP-111933 labels:MTP-111933
--comment: initial changeset for alert_refresh_configuration

CREATE TABLE inventory_smart.alert_refresh_configuration (
    alert_key VARCHAR(100) PRIMARY KEY,
    refresh_frequency_hours INTEGER NOT NULL,
    description VARCHAR(50),
    last_refresh_time TIMESTAMP DEFAULT NULL,
    CONSTRAINT valid_frequency CHECK (refresh_frequency_hours > 0)
);


--changeset liquibase:alert_refresh_configuration_v1 stripComments:false splitStatements:false context:MTP-111933 labels:MTP-111933
--comment: MTP-111933: alert_refresh_configuration_v1
ALTER TABLE inventory_smart.alert_refresh_configuration 
ALTER COLUMN last_refresh_time TYPE timestamptz;


