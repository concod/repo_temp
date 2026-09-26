--liquibase formatted sql
--changeset dodda.gowtham@impactanalytics.co:placeholder_attributes stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_schema_update
--comment: Create placeholder_attributes table to store attribute definitions

CREATE TABLE item_smart.placeholder_attributes (
    attribute_id                    SERIAL PRIMARY KEY,
    attribute_name                  varchar NOT NULL,
    attribute_display_name          varchar NOT NULL,
    attribute_description           varchar,
    is_active                      boolean DEFAULT TRUE,
    created_at                     timestamp DEFAULT now(),
    updated_at                     timestamp DEFAULT now(),
    created_by                     integer,
    updated_by                     integer
);

-- Insert the attribute definitions based on placeholders_info table
INSERT INTO item_smart.placeholder_attributes 
    (attribute_name, attribute_display_name, attribute_description)
VALUES
    ('color', 'Color', 'Product color attribute'),
    ('size', 'Size', 'Product size attribute'),
    ('tree_shape', 'Shape', 'Tree shape attribute'),
    ('light_type', 'Light Type', 'Type of lighting'),
    ('size_set_pack', 'Set/Each', 'Whether item is sold as set or individual'),
    ('print_catalog', 'Catalog', 'Print catalog information'),
    ('drop_ship', 'Dropship', 'Dropship status'),
    ('channel_status', 'Status', 'Channel status information'),
    ('vendor', 'Vendor', 'Vendor information'),
    ('country_of_origin', 'Country of Origin', 'Product origin country'); 