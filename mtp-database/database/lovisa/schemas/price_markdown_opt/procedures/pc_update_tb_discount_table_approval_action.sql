--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_update_tb_discount_table_approval_action_10122025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_update_tb_discount_table_approval_action

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_update_tb_discount_table_approval_action;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_update_tb_discount_table_approval_action(
    IN _strategy_id INTEGER,
    IN _currency_type TEXT,
    IN _approval_action TEXT,
    IN _update_pcd_id INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    _update_query TEXT;
    _discount_table TEXT;
    _ia_discount_table TEXT;
BEGIN
    -- Build table names
    _discount_table := FORMAT('price_markdown.tb_strategy_discount_%s_%s', _currency_type, _strategy_id);
    _ia_discount_table := FORMAT('price_markdown.tb_strategy_discount_ia_%s_%s', _currency_type, _strategy_id);
    
    RAISE NOTICE 'Processing approval action: % for PCD ID: % in table: %', _approval_action, _update_pcd_id, _discount_table;
    
    IF _approval_action = 'decline' THEN
        -- First update: Update current PCD with previous PCD values
        _update_query := FORMAT('
            WITH current_rows AS (
                SELECT DISTINCT
                    product_level_id,
                    store_level_id,
                    previous_pcd_id
                FROM %1$s
                WHERE pcd_id = %2$s
            ),
            prev_discount_values AS (
                SELECT 
                    d.product_level_id,
                    d.store_level_id,
                    d.markdown_percentage,
                    d.effective_price_point
                FROM %1$s d
                INNER JOIN current_rows cr
                    ON d.product_level_id = cr.product_level_id
                    AND d.store_level_id = cr.store_level_id
                    AND d.pcd_id = cr.previous_pcd_id
            )
            UPDATE %1$s d
            SET 
                markdown_percentage = pdv.markdown_percentage,
                effective_price_point = pdv.effective_price_point,
                previous_markdown_percentage = pdv.markdown_percentage,
                incremental_discount = 0,
                approval_status = ''Finally Approved'',
                action_status = ''Declined''
            FROM prev_discount_values pdv
            WHERE 
                d.product_level_id = pdv.product_level_id
                AND d.store_level_id = pdv.store_level_id
                AND d.pcd_id = %2$s;',
            _discount_table, _update_pcd_id);
        
        RAISE NOTICE 'Executing decline query - updating current PCD';
        EXECUTE _update_query;
        
        -- Second update: Update subsequent PCDs (where previous_pcd_id = update_pcd_id)
        _update_query := FORMAT('
            WITH updated_current_pcd AS (
                SELECT 
                    product_level_id,
                    store_level_id,
                    markdown_percentage
                FROM %1$s
                WHERE pcd_id = %2$s
            )
            UPDATE %1$s d
            SET 
                previous_markdown_percentage = ucp.markdown_percentage,
                incremental_discount = d.markdown_percentage - ucp.markdown_percentage
            FROM updated_current_pcd ucp
            WHERE 
                d.product_level_id = ucp.product_level_id
                AND d.store_level_id = ucp.store_level_id
                AND d.previous_pcd_id = %2$s;',
            _discount_table, _update_pcd_id);
        
        RAISE NOTICE 'Executing decline query - updating subsequent PCDs';
        EXECUTE _update_query;
        
    ELSIF _approval_action = 'ia_approve' THEN
        -- First update: Get values from IA table and update the main table
        _update_query := FORMAT('
            WITH ia_values AS (
                SELECT 
                    product_level_id,
                    store_level_id,
                    markdown_percentage,
                    effective_price_point,
                    previous_markdown_percentage,
                    incremental_discount
                FROM %3$s
                WHERE pcd_id = %2$s
            )
            UPDATE %1$s d
            SET 
                markdown_percentage = ia.markdown_percentage,
                effective_price_point = ia.effective_price_point,
                previous_markdown_percentage = ia.previous_markdown_percentage,
                incremental_discount = ia.incremental_discount,
                approval_status = ''Finally Approved'',
                action_status = ''Accepted IA reco''
            FROM ia_values ia
            WHERE d.product_level_id = ia.product_level_id
                AND d.store_level_id = ia.store_level_id
                AND d.pcd_id = %2$s;',
            _discount_table, _update_pcd_id, _ia_discount_table);
        
        RAISE NOTICE 'Executing ia_approve query - updating current PCD';
        EXECUTE _update_query;
        
        -- Second update: Update subsequent PCDs (where previous_pcd_id = update_pcd_id)
        _update_query := FORMAT('
            WITH updated_current_pcd AS (
                SELECT 
                    product_level_id,
                    store_level_id,
                    markdown_percentage
                FROM %1$s
                WHERE pcd_id = %2$s
            )
            UPDATE %1$s d
            SET 
                previous_markdown_percentage = ucp.markdown_percentage,
                incremental_discount = d.markdown_percentage - ucp.markdown_percentage
            FROM updated_current_pcd ucp
            WHERE 
                d.product_level_id = ucp.product_level_id
                AND d.store_level_id = ucp.store_level_id
                AND d.previous_pcd_id = %2$s;',
            _discount_table, _update_pcd_id);
        
        RAISE NOTICE 'Executing ia_approve query - updating subsequent PCDs';
        EXECUTE _update_query;
        
    ELSE
        RAISE EXCEPTION 'Invalid approval_action: %. Must be ''decline'' or ''ia_approve''', _approval_action;
    END IF;
    
    RAISE NOTICE 'Successfully updated table % for PCD ID: %', _discount_table, _update_pcd_id;
    
END;
$procedure$;
