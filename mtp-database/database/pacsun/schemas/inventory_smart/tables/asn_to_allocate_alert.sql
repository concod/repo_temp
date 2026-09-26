--liquibase formatted sql
--changeset sreevathsa.sp:asn_to_allocate_alert stripComments:false splitStatements:false context:pacsun_inv_smart labels:asn_to_allocate_alert
--comment: initial changeset for asn_to_allocate_alert
CREATE TABLE IF NOT EXISTS inventory_smart.asn_to_allocate_alert (
    asn_id varchar NOT NULL,
    article varchar NOT NULL,
    l0_name varchar NULL,
    l1_name varchar NULL,
    l2_name varchar NULL,
    l3_id_name varchar NULL,
    brand varchar NULL,
    l3_name varchar NULL,
    l4_name varchar NULL,
    style_color_description varchar NULL,
    handling_type varchar NULL,
    fit varchar NULL,
    ladder varchar NULL,
    sizes_mat varchar NULL,
    form varchar NULL,
    user_defined_1 varchar NULL,
    user_defined_2 varchar NULL,
    user_defined_3 varchar NULL,
    user_defined_4 varchar NULL,
    user_defined_5 varchar NULL,
    user_defined_6 varchar NULL,
    oh int4 NULL,
    oo int4 NULL,
    it int4 NULL,
    receiver_number varchar NULL,
    pack_id varchar NULL,
    asn_qty float NULL,
    sizes_count int4 NULL,
    oh_dc int4 NULL,
    forecast_over_target_wos float NULL,
    floorset varchar NULL,
    floorset_start_date date NULL,
    floorset_end_date date NULL,
    instore_date date NULL,
    delivery_date date NULL,
    store_count_asn int4 NULL,
    store_count_choice int4 NULL,
    choice_type varchar NULL,
    wip int4 NULL,
    collection varchar NULL,
    masterstyle_descr varchar NULL,
    subbrand_code_desc varchar NULL,
    product_lifecycle varchar NULL,
    ata_is_resolved int4 NULL DEFAULT 0,
    at_is_resolved int4 NULL,
    product_group varchar[] NULL,
    current_assortment_group varchar NULL,
    current_floorset varchar NULL,
    CONSTRAINT asn_to_allocate_alert_un PRIMARY KEY (article, asn_id)
);
--changeset sreevathsa.sp:asn_to_allocate_alert_columns_change stripComments:false splitStatements:false context:pacsun_inv_smart labels:pacsun_asn_to_allocate_alert_columns_change
--comment: asn_to_allocate_alert_columns_change
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS form;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS user_defined_1;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS user_defined_2;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS user_defined_3;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS user_defined_4;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS user_defined_5;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS user_defined_6;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS floorset;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS floorset_start_date;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS floorset_end_date;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS instore_date;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS choice_type;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS wip;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS collection;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS masterstyle_descr;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS subbrand_code_desc;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS product_lifecycle;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS product_group;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS current_assortment_group;
ALTER TABLE inventory_smart.asn_to_allocate_alert DROP COLUMN IF EXISTS current_floorset;

--changeset sreevathsa.sp:asn_to_allocate_alert_vi_date_addition stripComments:false splitStatements:false context:pacsun_inv_smart labels:pacsun_asn_to_allocate_alert_vi_date_addition
--comment: asn_to_allocate_alert_vi_date_addition
ALTER TABLE inventory_smart.asn_to_allocate_alert ADD COLUMN IF NOT EXISTS vi_date DATE NULL;

--changeset sreevathsa.sp:asn_to_allocate_alert_add_asn_flag stripComments:false splitStatements:false context:pacsun_inv_smart labels:pacsun_asn_to_allocate_alert_add_asn_flag
--comment: adding asn_to to asn_to_allocate_alert
ALTER TABLE inventory_smart.asn_to_allocate_alert ADD COLUMN if not exists active_asn_flag bool null;