--liquibase formatted sql
--changeset shashwat.yadav:supply_route_definition stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: Supply Route Definition Table (Stores Route Type Definitions)

CREATE TABLE IF NOT EXISTS inventory_smart.supply_route_definition (
    supply_route_id SERIAL4 PRIMARY KEY,
    supply_route_name citext NOT NULL,
    source_type VARCHAR NOT NULL,
    destination_type VARCHAR NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by INT4 NULL,
    updated_at TIMESTAMPTZ NULL,
    updated_by INT4 NULL,
    CONSTRAINT supply_route_definition_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
    CONSTRAINT supply_route_definition_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
    CONSTRAINT unique_supply_route_name UNIQUE (supply_route_name)
);
