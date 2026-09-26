--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:po_master_01 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for po_master_01

CREATE TABLE if not EXISTS inventory_smart.po_master (
    po_id varchar NOT NULL,
    receipt_id varchar NOT NULL,
    ref_id varchar NOT NULL,
    po_type varchar NOT NULL,
    order_date timestamptz NOT NULL,
    in_dc_date timestamptz NOT NULL,
    product_code varchar NOT NULL,
    product_description varchar NOT NULL,
    ordered_quantity int4 NOT NULL,
    allocation_multiple int4 NOT NULL,
    hold_or_reserve_quantity int4 NOT NULL,
    cancellation_flag bool NOT NULL,
    product_group varchar NOT NULL,
    product_group_ratio_flag bool NULL,
    pack_id varchar NOT NULL,
    pack_size int4 NOT NULL,
    destination_dc varchar NOT NULL,
    store_groups varchar NULL,
    header_min int4 NOT NULL,
    header_max int4 NOT NULL,
    line_item_level_min int4 NOT NULL,
    line_item_level_max int4 NOT NULL,
    method_of_allocation varchar NOT NULL,
    line_item_mandatory_flag bool NOT NULL,
    auto_allocation_flag bool NOT NULL,
    merch_base_level varchar NULL,
    "attribute" varchar NULL,
    time_period_history_calculation varchar NULL,
    eligibility_override_indicator bool NOT NULL,
    indicator_of_pack_type varchar NULL,
    master_pack_size int4 NOT NULL,
    ats_date timestamptz NULL,
    ly_ats_date timestamptz NULL,
    direction varchar NULL,
    num_weeks int4 NULL,
    start_date timestamptz NULL,
    end_date timestamptz NULL,
    created_at timestamptz NULL DEFAULT now(),
    updated_at timestamptz NULL DEFAULT now(),
    created_by int4 NULL,
    updated_by int4 NULL,
    is_deleted bool NULL DEFAULT false,

    processed_status int4 NOT NULL DEFAULT '-100'::integer,
    processed_at timestamptz NULL,
    batch_id int8 NOT NULL DEFAULT '-1'::integer,
    error_code int4 NULL,

    CONSTRAINT po_master_pk PRIMARY KEY (po_id, receipt_id, ref_id, product_code, pack_id)
);

CREATE INDEX if not EXISTS idx_po_master_is_deleted
    ON inventory_smart.po_master USING btree (is_deleted);

CREATE INDEX if not EXISTS idx_po_master_order_date
    ON inventory_smart.po_master USING btree (order_date);

CREATE INDEX if not EXISTS idx_po_master_po_id
    ON inventory_smart.po_master USING btree (po_id);

CREATE INDEX if not EXISTS idx_po_master_po_receipt
    ON inventory_smart.po_master USING btree (po_id, receipt_id);

CREATE INDEX if not EXISTS idx_po_master_po_type_processed_status_created_at
    ON inventory_smart.po_master USING btree (po_type, processed_status, created_at);

CREATE INDEX if not EXISTS idx_po_master_product_code
    ON inventory_smart.po_master USING btree (product_code);


