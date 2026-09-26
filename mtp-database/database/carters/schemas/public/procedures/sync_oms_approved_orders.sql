--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:updated_sync_sp_version_5 runOnChange:true stripComments:false splitStatements:false context:MTP-135352 labels:MTP-135352
--comment: implementing soft delete for oms_orders_approved table

DROP PROCEDURE IF EXISTS public.sync_oms_approved_orders(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_approved_orders(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql 
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_approved_orders';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        WITH base AS
        (
            WITH actual_po AS
            (
                SELECT 
                    CONCAT(style,'_',size,'_',po_id) AS po_detail_id,
                    sum(oo+it) AS po_quantity
                FROM inventory_smart.oms_po_master opm 
                JOIN global.product_attributes_filter paf 
                    USING(product_code)
                WHERE po_id <> '-'
                GROUP BY 1
            )
            SELECT coalesce((order_quantity-po_quantity),order_quantity) AS calc_approved_pending_recon,*
            FROM inventory_smart.oms_orders_approved ooa 
            LEFT JOIN actual_po ap
            ON ooa.reconciliation_id = ap.po_detail_id
            WHERE ooa.is_deleted IS NOT TRUE
        )
        UPDATE inventory_smart.oms_orders_approved ooa
        SET approved_orders_pending_reconciliation = GREATEST(cte.calc_approved_pending_recon,0)
        FROM base cte
        WHERE cte.product_code = ooa.product_code
            AND cte.order_placement_date = ooa.order_placement_date
            AND cte.order_placement_recom_date = ooa.order_placement_recom_date
            AND cte.expected_receipt_date = ooa.expected_receipt_date
            AND cte.reconciliation_id = ooa.reconciliation_id
        ;

        UPDATE inventory_smart.oms_orders_approved
        SET is_deleted = TRUE, updated_at = NOW()
        WHERE CONCAT(product_code,order_placement_date,order_placement_recom_date,order_type,order_gen_type) IN
        (
            WITH actual_po AS
            (
                SELECT 
                    CONCAT(style,'_',size,'_',po_id) AS po_detail_id,
                    *
                FROM inventory_smart.oms_po_master opm 
                JOIN global.product_attributes_filter paf 
                    USING(product_code)
                WHERE po_id <> '-'
            )
            ,pseudo_po AS
            (
                WITH po_attribute_value AS 
                (
                    SELECT
                        product_code,
                        CONCAT(UPPER(LEFT(l2_name,1)), 
                        CASE 
                            WHEN UPPER(l3_name) = 'ACCESSORIES' THEN '6'
                            WHEN UPPER(l3_name) = 'BABY' THEN '1'
                            WHEN UPPER(l3_name) = 'BOYS PLAYWEAR' THEN '5'
                            WHEN UPPER(l3_name) = 'GIRLS PLAYWEAR' THEN '4'
                            WHEN UPPER(l3_name) = 'OUTERWEAR' THEN '7'
                            WHEN UPPER(l3_name) = 'SHOES' THEN '9'
                            WHEN UPPER(l3_name) = 'SKIP HOP' THEN '10'
                            WHEN UPPER(l3_name) = 'SLEEPWEAR' THEN '3'
                            WHEN UPPER(l3_name) = 'SWIMWEAR' THEN '8'
                            WHEN UPPER(l3_name) = 'LITTLE PLANET' THEN '11'
                        END,
                        CASE
                            WHEN UPPER(l3_name)='OUTERWEAR' THEN 'O'
                            WHEN UPPER(l3_name)='SHOES' THEN 'S'
                            WHEN UPPER(l3_name)='ACCESSORIES' THEN 'A'
                            WHEN l4_name='4-14' THEN 'B'
                            WHEN l4_name='0-24M' THEN 'I'
                            WHEN l4_name='2T-5T' THEN 'T'
                            ELSE 'X'
                        END
                        ,
                        CASE
                            WHEN l1_name='Brick __ia_char_13 Mortar' THEN 'S'
                            WHEN l1_name='E-Commerce' THEN 'E'
                        END
                        , LEFT(collection_id,8)) AS po_attribute
                    FROM
                        inventory_smart.oms_orders_approved ooa 
                    JOIN
                        global.product_attributes_filter paf 
                    USING
                        (product_code) 
                    WHERE
                        ooa.is_deleted IS NOT TRUE
                )
                SELECT
                    DISTINCT a.*,
                    CONCAT(
                        b.style, '_',
                        b.size, '_',
                        UPPER(LEFT(SPLIT_PART(name, ' ', 2), 3)),
                        RIGHT(SPLIT_PART(name, ' ', 1),2),
                        UPPER(LEFT(l2_name, 1)),
                        UPPER(LEFT(l1_name, 1)),
                        TO_CHAR(editable_expected_receipt_date, 'MMDDYYYY'),
                        'B',
                        po_attribute
                    ) AS po_detail_id
                FROM
                    inventory_smart.oms_orders_approved a
                JOIN
                    global.product_attributes_filter b
                USING
                    (product_code)
                JOIN
                    po_attribute_value
                USING
                    (product_code)
                JOIN
                    global.season_master sm 
                ON
                    a.editable_expected_receipt_date BETWEEN sm.season_start_date
                    AND sm.season_end_date
                WHERE
                    a.is_deleted IS NOT TRUE
            )
            SELECT 
                DISTINCT CONCAT(product_code,order_placement_date,order_placement_recom_date,order_type,order_gen_type)
            FROM 
            (
                select 
                    pp.*,
                    CASE WHEN pp.po_detail_id IN (SELECT DISTINCT po_detail_id FROM actual_po) THEN 1 ELSE 0 END AS po_flag,
                    oclt.po_to_order_processing, 
                    (current_date::DATE - pp.order_placement_date::DATE) AS days_since_approved
                FROM 
                    pseudo_po pp
                JOIN 
                    inventory_smart.oms_constraints_lead_time oclt 
                USING(article)
            ) AS base
            WHERE days_since_approved>po_to_order_processing
                OR (po_flag = 1 AND approved_orders_pending_reconciliation = 0)
        )
        AND is_deleted IS NOT TRUE;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end
$procedure$
;
