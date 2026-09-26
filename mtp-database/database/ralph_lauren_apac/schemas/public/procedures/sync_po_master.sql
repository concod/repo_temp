--liquibase formatted sql
--changeset abhi.bhardwaj@impactanalytics.co:sync_po_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-116934
--comment: Changeset for sync_po_master
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_po_master();
CREATE OR REPLACE PROCEDURE public.sync_po_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    _log_code varchar := gen_random_uuid();
_sp_name varchar := 'public.sync_po_master';
_log_step varchar;
_st TIMESTAMP := clock_timestamp();
begin
    call global.data_ingestion_logs(_log_code,
_sp_name,
'start',
null,
(clock_timestamp() - _st)::text,
null);
perform set_config('local.log_code', _log_code, true);
perform set_config('local.sp_name', _sp_name, true);
begin
    delete
from
    inventory_smart.po_master
where
    true;
insert
    into
    inventory_smart.po_master 
(
    po_code,
    AX_Class_ID,
    AX_Subclass_ID,
    style_nbr,
    color_nbr,
    size_nbr,
    AX_Label_ID,
    vendor_nbr,
    simple_vendor_cost,
    po_vendor_code,
    requirement_date,
    cancel_date,
    anticipate_date,
    article,
    dc_code,
    available_qty,
    product_code,
    allocated_qty,
    not_before_date,
    pack_type_id,
    channel,
    po_type,
    dest_whouse,
    s1_id,
    raw_po_code,
    retail_region
    )

select
    po_number                                                 as po_code,
    cast(l2_id as int4)                                       as AX_Class_ID,
    cast(l4_id as int4)                                       as AX_Subclass_ID,
    style_og                                                  as style_nbr,
    cast(color_id_og as text)                                 as color_nbr,
    cast(size_id_og as text)                                  as size_nbr,
    cast(l1_id as int4)                                       as AX_Label_ID,
    cast(vendor as int4)                                      as vendor_nbr,
    cast(null as float4)                                      as simple_vendor_cost,
    cast(null as int4)                                        as po_vendor_code,
    cast(po_delivery_date as date)                            as requirement_date,
    cast(null as date)                                        as cancel_date,
    cast(null as date)                                        as anticipate_date,
    cast(article as text)                                     as article,
    saf.dc_code                                               as dc_code,
    ppm."Available_Qty_for_Allocation"                        as available_qty,
    ppm.product_code                                          as product_code,
    ppm."Ordered_Quantity"                                    as allocated_qty,
    cast(null as date)                                        as not_before_date,
    cast(ppm.product_code as varchar)                         as pack_type_id,
    cast(channel as varchar)                                  as channel,
    cast('Pre Allocation PO' as varchar)                      as po_type,
    saf.retail_facility_code                                  as dest_whouse,
    cast(s1_id as varchar)                                    as s1_id,
    cast(po_number as varchar)                                as raw_po_code,
    saf.retail_region                                         as retail_region
from
    public.preallocation_po_master ppm
join global.product_attributes_filter paf
    using (product_code)
join global.store_attributes_filter saf
    on cast(ppm."DC_Number" as TEXT) = ltrim(saf.retail_facility_code, '0');
        call global.data_ingestion_logs(_log_code,
    _sp_name,
    'end',
    null,
    (clock_timestamp() - _st)::text,
    null);
exception
when others then
-- Log the error if an exception occurs during any part of the procedure
            call global.data_ingestion_logs(_log_code,
_sp_name,
_log_step,
sqlerrm,
(clock_timestamp() - _st)::text,
null);
raise exception 'Error occurred in the procedure: %',
sqlerrm;
end;
end
$procedure$
;