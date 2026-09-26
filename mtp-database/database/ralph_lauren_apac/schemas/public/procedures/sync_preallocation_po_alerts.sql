--liquibase formatted sql
--changeset navya.modepalli@impactanalytics.co:sync_preallocation_po_alerts_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-116934
--comment: Changeset for sync_preallocation_po_alerts
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_preallocation_po_alerts();
CREATE OR REPLACE PROCEDURE public.sync_preallocation_po_alerts()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_preallocation_po_alerts';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
BEGIN
    CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', NULL, (clock_timestamp() - _st)::text, NULL);
    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        -------------------------------------------------------------------
        -- DELETE all existing data
        -------------------------------------------------------------------
        DELETE FROM inventory_smart.preallocation_po_alerts WHERE TRUE;

        -------------------------------------------------------------------
        -- INSERT with UPDATED NA schema (your only requested change)
        -------------------------------------------------------------------
        INSERT INTO inventory_smart.preallocation_po_alerts 
        (
            raw_po_code,
            anticipate_date,
            purchqty,
            qtyreceived,
            available_qty,
            asn_id,
            dc_number,
            dest_whouse,
            article,
            product_code,
            channel,
            style_color_id_og,
            product_description,
            l0_name,
            l1_name,
            l2_name,
            l3_name,
            l4_name,
            brand,
            rtl_coordinate_group_desc,
            store_group,
            retail_region,
            s1_id
        )
        SELECT
            a.po_number AS raw_po_code,
            NULL::date AS anticipate_date,
            a.ordered_quantity AS purchqty,
            a.received_qty AS qtyreceived,
            a.available_qty_for_allocation AS available_qty,
            a.asn_id,
            saf.dc_code::text AS dc_number,
            saf.retail_facility_code::text AS dest_whouse,
            b.article article,
            a.product_code,
            a.channel,
            a.style_color_id AS style_color_id_og,
            a.product_description,
            a.l0_name,
            a.l1_name,
            a.l2_name,
            a.l3_name,
            a.l4_name,
            a.brand,
            a.rtl_coordinate_group_desc,
            ARRAY[store_groups]::varchar[] AS store_group,
            saf.retail_region as retail_region,
            saf.s1_id
        FROM public.preallocation_po_alerts a
        join "global".product_attributes_filter b 
        using(product_code)
        join global.store_attributes_filter saf
    on cast(a."dc_number" as TEXT) = ltrim(saf.retail_facility_code, '0')
        
;

        -------------------------------------------------------------------
        -- SUCCESS LOG
        -------------------------------------------------------------------
        CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', NULL, (clock_timestamp() - _st)::text, NULL);

    EXCEPTION WHEN OTHERS THEN
        CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, NULL);
        RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;
END
$procedure$
;
