--liquibase formatted sql
--changeset adesh@impactanalytics.co:intermediate_cyclic_asn stripComments:false splitStatements:false context:MTP-91288 ignore:false labels:MTP-91288
--comment: initial changeset for intermediate_cyclic_asn

CREATE TABLE IF NOT EXISTS inventory_smart.intermediate_cyclic_asn (
    ASN_NUM VARCHAR NULL,
    LOC_ID VARCHAR NULL,
    ITM_ID VARCHAR NULL,
    PACK_ITM_ID int4 NULL,
    PACK_IND int4 NULL,
    SUP_ID int4 NULL,
    PO_NUM VARCHAR NULL,
    CASE_NUM int4 NULL,
    ASN_STTS int4 NULL,
    ASN_CREATED_DT DATE NULL,
    ASN_EXP_RCT_DT DATE NULL,
    ASN_DC_APPT_DT int4 NULL,
    F_ASN_SHIP_QTY int4 NULL,
    F_ASN_RCVD_QTY int4 NULL,
    FF_LINEID VARCHAR NULL,
    FF_CHANNELID VARCHAR NULL,
    FF_CHANNELDESC VARCHAR NULL,
    FF_RECEIVERNUMBER VARCHAR NULL,
    FF_CREATEDTIMESTAMP TIMESTAMP NULL,
    FF_UPDATEDTIMESTAMP TIMESTAMP NULL,
    FILENAME VARCHAR NULL,
    RCD_INS_TS TIMESTAMPTZ NULL,
    script_run_time VARCHAR NULL
);

--changeset liquibase:add_columns_for_intermediate_cyclic_asn stripComments:false splitStatements:false context:MTP-91288 labels:MTP-91288
--comment: add specified columns from intermediate_cyclic_asn
ALTER TABLE inventory_smart.intermediate_cyclic_dc_inventory
ADD COLUMN IF NOT EXISTS ip_po_srcnum varchar NULL,
ADD COLUMN IF NOT EXISTS ip_antcp_arrival_dt date NULL,
ADD COLUMN IF NOT EXISTS requirement_date date NULL,
ADD COLUMN IF NOT EXISTS batch_id varchar NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

--changeset liquibase:add_columns_for_intermediate_cyclic_asn_v1 stripComments:false splitStatements:false context:MTP-96133 labels:MTP-96133
--comment: MTP-96133-add columns from intermediate_cyclic_asn
ALTER TABLE inventory_smart.intermediate_cyclic_asn
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

--changeset liquibase:remove_updated_at_for_intermediate_cyclic_asn stripComments:false splitStatements:false context:MTP-91288 labels:MTP-91288
--comment: remove_updated_at_for_intermediate_cyclic_asn
ALTER TABLE inventory_smart.intermediate_cyclic_asn DROP COLUMN IF EXISTS updated_at;

--changeset liquibase:add_batch_id_for_intermediate_cyclic_asn stripComments:false splitStatements:false context:MTP-91288 labels:MTP-91288
--comment: add_batch_id_for_intermediate_cyclic_asn
ALTER TABLE inventory_smart.intermediate_cyclic_asn ADD COLUMN IF NOT EXISTS batch_id varchar NULL;

--changeset adesh@impactanalytics.co:add_po_columns stripComments:false splitStatements:false context:MTP-91286 ignore:false labels:MTP-91286
--comment: add additional columns for po
ALTER TABLE inventory_smart.intermediate_cyclic_asn
ADD COLUMN IF NOT EXISTS ip_po_srcnum varchar NULL,
ADD COLUMN IF NOT EXISTS ip_antcp_arrival_dt date NULL,
ADD COLUMN IF NOT EXISTS requirement_date date NULL;

--changeset adesh@impactanalytics.co:add_po_handling_type_col stripComments:false splitStatements:false context:MTP-91286 ignore:false labels:MTP-91286
--comment: add_po_handling_type_col
ALTER TABLE inventory_smart.intermediate_cyclic_asn
ADD COLUMN IF NOT EXISTS IP_PO_HANDLING_TYPE varchar NULL;

--changeset adesh@impactanalytics.co:drop_asn_exp_rct_dt_ip_antcp_arrival_dt_col stripComments:false splitStatements:false context:MTP-99371 ignore:false labels:MTP-99371
--comment: MTP-99371:drop_asn_exp_rct_dt_ip_antcp_arrival_dt_col
ALTER TABLE inventory_smart.intermediate_cyclic_asn
DROP COLUMN IF EXISTS ASN_EXP_RCT_DT,
DROP COLUMN IF EXISTS ip_antcp_arrival_dt;

--changeset adesh@impactanalytics.co:add_vi_date_asn_active_flag_col stripComments:false splitStatements:false context:MTP-99371 ignore:false labels:MTP-99371
--comment: MTP-99371:add_vi_date_asn_active_flag_col
ALTER TABLE inventory_smart.intermediate_cyclic_asn
ADD COLUMN IF NOT EXISTS active_asn_flag BOOLEAN,
ADD COLUMN IF NOT EXISTS vi_date date;
