--liquibase formatted sql
--changeset shashwat.yadav:supply_network stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: Supply Network Table

CREATE TABLE IF NOT EXISTS inventory_smart.supply_network (
    network_id SERIAL4 PRIMARY KEY,
    network_name citext NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by INT4 NULL,
    updated_at TIMESTAMPTZ NULL,
    updated_by INT4 NULL,
    CONSTRAINT supply_network_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
    CONSTRAINT supply_network_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
    CONSTRAINT unique_network_name UNIQUE (network_name)
);
