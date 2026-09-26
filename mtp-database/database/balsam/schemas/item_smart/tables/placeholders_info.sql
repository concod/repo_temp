--liquibase formatted sql
--changeset dodda.gowtham@impactanalytics.co:placeholders_info_updated stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_schema_update
--comment: updated placeholders_info table with correct logical field mappings and attribute naming

CREATE TABLE item_smart.placeholders_info (
    placeholder_id                  varchar(10) NOT NULL PRIMARY KEY,
    item                            varchar NOT NULL,
    product_description             varchar,
    
    -- Product hierarchy
    l0_name                         varchar NULL, -- Brand
    l1_name                         varchar NULL, -- Department
    l2_name                         varchar NULL, -- Sub-Department
    l3_name                         varchar NULL, -- Class
    l4_name                         varchar NULL, -- Family
    l5_name                         varchar NULL, -- Parent

    -- Attribute fields
    color                           varchar,      -- Color
    size                            varchar,      -- Size
    tree_shape                      varchar,      -- Shape
    light_type                      varchar,      -- Light Type
    size_set_pack                   varchar,      -- Set/Each
    print_catalog                   varchar,      -- Catalog
    drop_ship                       varchar,      -- Dropship
    channel_status                  varchar,      -- Status
    vendor                          varchar,      -- Vendor
    country_of_origin               varchar,      -- Country of Origin
    lifecycle                       varchar,      -- Lifecycle

    -- Price and Cost fields
    price                           decimal(10,2) DEFAULT 0.00,  -- Retail price
    cost                            decimal(10,2) DEFAULT 0.00,  -- Cost price

    -- Other fields
    entry_date                      date,
    exit_date                       date,
    mapped_sku                      varchar,
    mapped_product_description      varchar,
    product_name                    varchar DEFAULT '',
    hierarchy_code                  integer,
    product_code                    varchar DEFAULT '',
    product_type                    varchar DEFAULT 'Regular',
    is_cadence_generated            boolean DEFAULT FALSE,
    is_mapped                       boolean DEFAULT FALSE,
    mapped_product_code             varchar,
    mapped_product_code_description varchar,
    created_at                      timestamp DEFAULT now(),
    updated_at                      timestamp DEFAULT now(),
    created_by                      integer,
    updated_by                      integer
);

CREATE SEQUENCE IF NOT EXISTS item_smart.placeholder_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    START 1
    CACHE 1
    NO CYCLE;

--changeset hemant.kumar@impactanalytics.co:placeholders_info stripComments:false splitStatements:false context:MTP-105095 labels:itemsmart_initial_commit
--comment: initial changeset for placeholders_info
ALTER TABLE item_smart.placeholders_info ADD store_count int4 NULL;
ALTER TABLE item_smart.placeholders_info ADD minimum_order_quantity float8 NULL;
