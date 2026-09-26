--liquibase formatted sql
--changeset liquibase:oms_alerts_sku_loc_vendor_1 stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: initial changeset for oms_alerts_sku_loc_vendor
CREATE TABLE IF NOT EXISTS inventory_smart.oms_alerts_sku_loc_vendor (
    id bigserial NOT NULL,
    product_code varchar NOT NULL,
    loc_code varchar NOT NULL,
    vendor_code varchar NULL,
    recom_receipt_date date NULL,
    recom_order bool NULL DEFAULT false,
    pending_order bool NULL DEFAULT false,
    is_recom_order_resolved bool NULL DEFAULT false,
    is_pending_order_resolved bool NULL DEFAULT false,
    next_order_cycle_date date NULL,
    CONSTRAINT pk_oms_alerts_sku_loc_vendor PRIMARY KEY (id),
    CONSTRAINT uk_oms_alerts_sku_loc_vendor UNIQUE (product_code, loc_code, vendor_code)
);

--changeset vishal.kumar:column column column ia_order_id added and included in unique key stripComments:false splitStatements:false context:Release_1_3 labels:MTP-20298
--comment: column column ia_order_id added and included in unique key for oms alerts sku loc vendor recommended
ALTER TABLE inventory_smart.oms_alerts_sku_loc_vendor ADD COLUMN IF NOT EXISTS ia_order_id int8 NULL;
ALTER TABLE inventory_smart.oms_alerts_sku_loc_vendor DROP CONSTRAINT IF EXISTS uk_oms_alerts_sku_loc_vendor;
ALTER TABLE inventory_smart.oms_alerts_sku_loc_vendor ADD CONSTRAINT uk_oms_alerts_sku_loc_vendor 
UNIQUE (product_code, loc_code, vendor_code,ia_order_id);