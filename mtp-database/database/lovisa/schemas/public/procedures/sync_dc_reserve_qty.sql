--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:sync_dc_reserve_qty_v3 runOnChange:true stripComments:false splitStatements:false context:lovisa_inv_smart labels:dc_reserve_v3
--comment: Changeset for sync_dc_reserve_qty_v3
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dc_reserve_qty();

CREATE OR REPLACE PROCEDURE public.sync_dc_reserve_qty()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    _log_code varchar := gen_random_uuid();
    _sp_name  varchar := 'public.sync_dc_reserve_qty';
    _log_step varchar;
    _st       TIMESTAMP := clock_timestamp();
BEGIN
    -- start log
    CALL global.data_ingestion_logs(
        _log_code,
        _sp_name,
        'start',
        NULL,
        (clock_timestamp() - _st)::text,
        NULL
    );

    PERFORM set_config('local.log_code', _log_code, true);
    PERFORM set_config('local.sp_name', _sp_name, true);

    BEGIN
        --------------------------------------------------------------------
        -- 1. ARCHIVE EXPIRED RESERVATIONS
        --------------------------------------------------------------------
        INSERT INTO inventory_smart.dc_reserve_quantity_archive (
            product_code,
            quantity,
            created_at,
            "type",
            dc_code,
            l0_name,
            l1_name,
            l2_name,
            l3_name,
            l4_name,
            range_name,
            article,
            size,
            channel,
            reservation_till_date,
            instock_inclusion,
            updated_by,
            updated_at,
            inventory_source,
            "comment",
            incoming_po_30,
            incoming_po_31_60,
            incoming_po_61_90,
            deleted_date
        )
        SELECT
            product_code,
            quantity,
            created_at,
            "type",
            dc_code,
            l0_name,
            l1_name,
            l2_name,
            l3_name,
            l4_name,
            range_name,
            article,
            size,
            channel,
            reservation_till_date,
            instock_inclusion,
            updated_by,
            updated_at,
            inventory_source,
            "comment",
            incoming_po_30,
            incoming_po_31_60,
            incoming_po_61_90,
            CURRENT_DATE
        FROM inventory_smart.dc_reserve_quantity
        WHERE "type" = 'U'
          AND reservation_till_date < CURRENT_DATE;

        --------------------------------------------------------------------
        -- 2. CLEAN OLD ARCHIVE RECORDS
        --------------------------------------------------------------------
        DELETE
        FROM inventory_smart.dc_reserve_quantity_archive
        WHERE deleted_date < CURRENT_DATE - 15;

        --------------------------------------------------------------------
        -- 3. RESET EXPIRED RESERVATIONS
        --------------------------------------------------------------------
        UPDATE inventory_smart.dc_reserve_quantity
        SET
            quantity = 0,
            reservation_till_date = NULL,
            "comment" = 'Reservation till date is passed'
        WHERE "type" = 'U'
          AND reservation_till_date < CURRENT_DATE;

        --------------------------------------------------------------------
        -- 4. UPSERT LATEST (DEDUPED) DC RESERVE QUANTITY
        --------------------------------------------------------------------
        INSERT INTO inventory_smart.dc_reserve_quantity (
            product_code,
            quantity,
            "type",
            inventory_source,
            dc_code,
            l0_name,
            l1_name,
            l2_name,
            l3_name,
            l4_name,
            range_name,
            article,
            size,
            channel,
            incoming_po_30,
            incoming_po_31_60,
            incoming_po_61_90
        )
        SELECT
            a.product_code,
            0 AS quantity,
            a."type",
            a.inventory_source,
            dc.dc_code,
            pd.l0_name,
            pd.l1_name,
            pd.l2_name,
            pd.l3_name,
            pd.l4_name,
            pd.range_name,
            pd.article,
            pd.size,
            a.channel,
            a.incoming_po_30,
            a.incoming_po_31_60,
            a.incoming_po_61_90
        FROM (
            -- DEDUPLICATION LOGIC
            SELECT *
            FROM (
                SELECT
                    drq.*,
                    ROW_NUMBER() OVER (
                        PARTITION BY drq.product_code, drq.dc_code
                        ORDER BY drq.created_at DESC
                    ) AS rn
                FROM public.dc_reserve_quantity drq
            ) x
            WHERE rn = 1
        ) a
        JOIN global.distribution_centres dc
          ON a.dc_code::text = dc.linked_store_code
        JOIN "global".product_attributes_filter pd
          ON a.product_code = pd.product_code
        ON CONFLICT (product_code, dc_code, "type", inventory_source, channel)
        DO UPDATE
        SET
            incoming_po_30    = EXCLUDED.incoming_po_30,
            incoming_po_31_60 = EXCLUDED.incoming_po_31_60,
            incoming_po_61_90 = EXCLUDED.incoming_po_61_90,
            l0_name           = EXCLUDED.l0_name,
            l1_name           = EXCLUDED.l1_name,
            l2_name           = EXCLUDED.l2_name,
            l3_name           = EXCLUDED.l3_name,
            l4_name           = EXCLUDED.l4_name,
            range_name        = EXCLUDED.range_name,
            article           = EXCLUDED.article,
            size              = EXCLUDED.size;

        --------------------------------------------------------------------
        -- SUCCESS LOG
        --------------------------------------------------------------------
        CALL global.data_ingestion_logs(
            _log_code,
            _sp_name,
            'end',
            NULL,
            (clock_timestamp() - _st)::text,
            NULL
        );

    EXCEPTION
        WHEN OTHERS THEN
            CALL global.data_ingestion_logs(
                _log_code,
                _sp_name,
                _log_step,
                SQLERRM,
                (clock_timestamp() - _st)::text,
                NULL
            );
            RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
    END;
END
$procedure$;
