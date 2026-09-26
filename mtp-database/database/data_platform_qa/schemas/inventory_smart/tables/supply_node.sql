--liquibase formatted sql
--changeset shashwat.yadav:supply_node stripComments:false splitStatements:false context:command-fix labels:command-fix
--comment: Supply Ndde Table (Stores Vendor , DC and Store data)

CREATE TABLE IF NOT EXISTS inventory_smart.supply_node (
    supply_node_id SERIAL4 PRIMARY KEY,
    name VARCHAR NOT NULL,
    code VARCHAR NOT NULL,
    type VARCHAR NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NULL
);
