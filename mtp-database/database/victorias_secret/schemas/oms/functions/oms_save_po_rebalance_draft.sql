-- liquibase formatted sql
--changeset piyush.raj@impactanalytics.co:oms_save_po_rebalance_draft_1 runOnChange:true stripComments:false splitStatements:false context:MTP-133828 labels:MTP-133828
--comment: Initial commit for oms_save_po_rebalance_draft

DROP FUNCTION IF EXISTS inventory_smart.oms_save_po_rebalance_draft(jsonb, text, text, text);

CREATE OR REPLACE FUNCTION inventory_smart.oms_save_po_rebalance_draft(records_data jsonb, p_user_id text, p_savetype text, p_article text)
 RETURNS TABLE(transfer_id integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    INSERT INTO inventory_smart.oms_po_rebalance_drafts (
        l6_id, l6_name, size, fiscal_year_week, po_source, po_destination, transfer,
        savetype, total_trans_recom, rem_tranfer,
        source_po_unit_bef_rebal, source_po_unit_aft_rebal,
        source_dc_inv_bop_aft_allo, dest_po_unit_bef_rebal, dest_po_unit_aft_rebal,
        dest_dc_inv_bop_aft_allo, source_dc_inv_bop_bef_allo, dest_dc_inv_bop_bef_allo,
        approved_by, po_item_source, po_item_destination
    )
    SELECT
        (r->>'l6_id'),
        (r->>'l6_name'),
        (r->>'size')::TEXT,
        (r->>'fiscal_year_week')::TEXT,
        (r->>'po_source')::TEXT,
        (r->>'po_destination')::TEXT,
        (r->>'transfer')::NUMERIC,
        (r->>'savetype')::TEXT,
        (r->>'total_transfer_recomm')::NUMERIC,
        (r->>'rem_transfer')::NUMERIC,
        (r->>'po_units_before_rebalance')::NUMERIC,
        (r->>'po_units_after_rebalance')::NUMERIC,
        (r->>'dc_inv_bop_post_allocation_after')::NUMERIC,
        (r->>'po_units_before_rebalance_des')::NUMERIC,
        (r->>'po_units_after_rebalance_des')::NUMERIC,
        (r->>'dc_inv_bop_post_allocation_des_after')::NUMERIC,
        (r->>'dc_inv_bop_post_allocation')::NUMERIC,
        (r->>'dc_inv_bop_post_allocation_des')::NUMERIC,
        p_user_id,
        split_part(r->>'po_source', '-', 2),
        split_part(r->>'po_destination', '-', 2)
    FROM jsonb_array_elements(records_data) AS r
    WHERE NOT EXISTS (
        SELECT 1 FROM inventory_smart.oms_po_rebalance_drafts d
        WHERE d.l6_id = (r->>'l6_id')
        AND d.size = (r->>'size')::TEXT
        AND d.fiscal_year_week = (r->>'fiscal_year_week')::TEXT
    )
    ON CONFLICT DO NOTHING
    RETURNING inventory_smart.oms_po_rebalance_drafts.transfer_id;

    -- If savetype is 'approve', update all matching records
    IF p_savetype = 'approve' THEN
        UPDATE inventory_smart.oms_po_rebalance_drafts
        SET savetype = p_savetype
        WHERE l6_id = p_article;
    END IF;
END;
$function$
;

