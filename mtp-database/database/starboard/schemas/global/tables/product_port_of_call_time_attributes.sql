--liquibase formatted sql
--changeset osho.sharma:product_port_of_call_time_attributes_v2 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-126961
--comment: product to port of call eligibility — simplified single table
--rollback: DROP TABLE IF EXISTS global.product_port_of_call_time_attributes;
DROP TABLE IF EXISTS global.product_port_of_call_time_attributes;
CREATE TABLE global.product_port_of_call_time_attributes (
    product_code varchar NOT NULL,
    store_code varchar NOT NULL,
    port_code varchar NOT NULL,
    l1_name varchar NOT NULL,
    l2_name varchar NOT NULL,
    l3_name varchar NOT NULL,
    is_eligible boolean NOT NULL DEFAULT false,
    validity daterange NULL,
    updated_by int4 NULL,
    updated_at timestamptz NULL DEFAULT now(),
    CONSTRAINT product_port_of_call_time_attributes_pk PRIMARY KEY (product_code, store_code, port_code),
    CONSTRAINT product_port_of_call_time_attributes_product_fk FOREIGN KEY (product_code)
        REFERENCES global.product_master(product_code) ON DELETE CASCADE,
    CONSTRAINT product_port_of_call_time_attributes_store_fk FOREIGN KEY (store_code)
        REFERENCES global.store_master(store_code) ON DELETE CASCADE,
    CONSTRAINT product_port_of_call_time_attributes_updated_by_fk FOREIGN KEY (updated_by)
        REFERENCES global.user_master(user_code) ON DELETE SET NULL,
    CONSTRAINT product_port_of_call_time_attributes_eligibility_chk CHECK (
        (is_eligible = true AND validity IS NOT NULL AND NOT isempty(validity))
        OR (is_eligible = false AND validity IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS product_port_of_call_time_attributes_hierarchy_idx
    ON global.product_port_of_call_time_attributes USING btree (l1_name, l2_name, l3_name);

CREATE INDEX IF NOT EXISTS product_port_of_call_time_attributes_eligible_idx
    ON global.product_port_of_call_time_attributes USING btree (product_code, store_code, port_code)
    WHERE is_eligible = true;

CREATE INDEX IF NOT EXISTS product_port_of_call_time_attributes_validity_idx
    ON global.product_port_of_call_time_attributes USING gist (validity);

CREATE INDEX IF NOT EXISTS product_port_of_call_time_attributes_updated_by_idx
    ON global.product_port_of_call_time_attributes USING btree (updated_by);
