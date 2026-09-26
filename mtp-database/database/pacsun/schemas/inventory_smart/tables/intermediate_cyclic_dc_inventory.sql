--liquibase formatted sql
--changeset adesh@impactanalytics.co:alerts_product_level stripComments:false splitStatements:false context:MTP-91286 ignore:false labels:MTP-91286
--comment: initial changeset for intermediate_cyclic_dc_inventory

CREATE TABLE IF NOT EXISTS inventory_smart.intermediate_cyclic_dc_inventory (
    DAY_ID VARCHAR NULL,
    LOC_ID VARCHAR NULL,
    ITM_ID VARCHAR NULL,
    END_DAY_KEY VARCHAR NULL,
    ITMLOC_STTS_CDE VARCHAR NULL,
    LOC_TYP_CDE VARCHAR NULL,
    F_OH_QTY int4 NULL,
    F_OH_CST_LCL int4 NULL,
    F_OH_CST int4 NULL,
    F_OH_RTL_LCL int4 NULL,
    F_OH_RTL int4 NULL,
    F_IT_QTY int4 NULL,
    F_IT_CST_LCL int4 NULL,
    F_IT_CST int4 NULL,
    F_IT_RTL_LCL int4 NULL,
    F_IT_RTL int4 NULL,
    F_CUS_RESV_QTY int4 NULL,
    F_NON_SELLABLE_QTY int4 NULL,
    F_UNIT_WAC_CST_LCL int4 NULL,
    F_UNIT_WAC_CST int4 NULL,
    F_UNIT_RTL_LCL int4 NULL,
    F_UNIT_RTL int4 NULL,
    LCL_CNCY_CDE VARCHAR NULL,
    F_REG_UNIT_RTL_LCL int4 NULL,
    F_REG_UNIT_RTL int4 NULL,
    F_PROMO_RTL_LCL int4 NULL,
    F_PROMO_RTL int4 NULL,
    IP_DC_FLG VARCHAR NULL,
    IP_MD_TYPE int4 NULL,
    IP_SKU_ACTUAL_COST int4 NULL,
    IP_SKU_RETAIL_PRICE int4 NULL,
    IP_SKU_VALUED_COST int4 NULL,
    IP_AVAIL_UNTS int4 NULL,
    IP_DC_INV_AVAIL_UNTS int4 NULL,
    IP_INV_UNTS int4 NULL,
    IP_STR_TRF_UNTS int4 NULL,
    IP_DC_TRF_UNTS int4 NULL,
    IP_ALLOCATED_UNTS int4 NULL,
    IP_SKU_DISPLAYNUM VARCHAR NULL,
    IP_INV_AVAIL_UNTS int4 NULL,
    FILENAME VARCHAR NULL,
    RCD_INS_TS TIMESTAMPTZ NULL,
    script_run_time VARCHAR NULL
);

--changeset liquibase:add_columns_for_intermediate_cyclic_dc_inventory stripComments:false splitStatements:false context:MTP-91286 labels:MTP-91286
--comment: add specified columns from intermediate_cyclic_dc_inventory
ALTER TABLE inventory_smart.intermediate_cyclic_dc_inventory
ADD COLUMN IF NOT EXISTS f_tsf_resv_qty int4 NOT NULL,
ADD COLUMN IF NOT EXISTS BATCH_ID varchar(50) NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

--changeset liquibase:remove_extra_columns_for_intermediate_cyclic_dc_inventory stripComments:false splitStatements:false context:MTP-91288 labels:MTP-91288
--comment: remove_extra_columns_for_intermediate_cyclic_dc_inventory
ALTER TABLE inventory_smart.intermediate_cyclic_dc_inventory DROP COLUMN IF EXISTS ip_po_srcnum;
ALTER TABLE inventory_smart.intermediate_cyclic_dc_inventory DROP COLUMN IF EXISTS ip_antcp_arrival_dt;
ALTER TABLE inventory_smart.intermediate_cyclic_dc_inventory DROP COLUMN IF EXISTS requirement_date;

--changeset liquibase:remove_updated_at_for_intermediate_cyclic_dc_inventory stripComments:false splitStatements:false context:MTP-91288 labels:MTP-91288
--comment: remove_updated_at_for_intermediate_cyclic_dc_inventory
ALTER TABLE inventory_smart.intermediate_cyclic_dc_inventory DROP COLUMN IF EXISTS updated_at;

--changeset liquibase:remove_not_null_constraint_for_f_tsf_resv_qty stripComments:false splitStatements:false context:MTP-91288 labels:MTP-91288
--comment: remove_not_null_constraint_for_f_tsf_resv_qty
ALTER TABLE inventory_smart.intermediate_cyclic_dc_inventory ALTER COLUMN f_tsf_resv_qty DROP NOT NULL;