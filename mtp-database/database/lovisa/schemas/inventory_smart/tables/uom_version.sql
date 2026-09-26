--liquibase formatted sql
--changeset sreenivas.s:uom_version stripComments:false splitStatements:false context:Release_1_0 labels:uom_version
--comment: initial changeset for uom_version

CREATE TABLE inventory_smart.uom_version (
    version_code int NOT NULL,
    from_unit_description varchar NULL,
    factor float4 NULL,
    to_unit_description varchar NULL,
    item_id varchar NOT NULL,
    from_unit varchar NULL,
    to_unit varchar NULL,
    "date" date NULL,
    article varchar NULL,
    CONSTRAINT uom_pk PRIMARY KEY (article,version_code),
    CONSTRAINT uom_version_u_key UNIQUE (version_code, article),
    CONSTRAINT uom_version_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
) PARTITION BY LIST (version_code);