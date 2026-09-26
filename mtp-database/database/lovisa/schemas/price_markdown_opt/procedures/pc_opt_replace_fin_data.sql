--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_opt_replace_fin_data_23022026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_replace_fin_data

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_opt_replace_fin_data;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_opt_replace_fin_data(
    IN _strategy_id INTEGER,
    IN _ls_stgs TEXT,
    IN _temp_table TEXT,
    IN _currency_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    _replace_fin_data_query TEXT;
    _delete_query TEXT;
BEGIN
    -- Step 1: Delete existing records first
    _delete_query := format(
        'DELETE FROM price_markdown.tb_strategy_discount_%1$s_%2$s WHERE pcd_id IN (%3$s);',
        _currency_type,
        _strategy_id,
        _ls_stgs
    );

    RAISE NOTICE 'Executing delete query: %', _delete_query;
    EXECUTE _delete_query;

    -- Step 2: Build and execute the rest of the logic
    _replace_fin_data_query := format('
        WITH fin_disc_updated AS (
            SELECT 
                product_level_id, 
                store_level_id, 
                pcd_id, 
                CASE 
                    WHEN approval_status IN (''Finally Approved'', ''Initially Approved'') 
                    THEN fin.markdown_percentage 
                    ELSE ia.markdown_percentage 
                END AS markdown_percentage
            FROM %4$s fin
            JOIN (
                SELECT 
                    product_level_id, 
                    store_level_id, 
                    pcd_id, 
                    markdown_percentage 
                FROM price_markdown.tb_strategy_discount_ia_%1$s_%2$s
                WHERE pcd_id IN (%3$s)
            ) ia USING(product_level_id, store_level_id, pcd_id)
        ),
        fin_base AS (
            SELECT 
                product_level_id, 
                store_level_id, 
                pcd_id, 
                markdown_percentage, 
                COALESCE(
                    LAG(markdown_percentage) OVER (
                        PARTITION BY product_level_id, store_level_id 
                        ORDER BY pcd_start_date
                    ), 
                    0
                ) AS previous_markdown_percentage,
                DENSE_RANK() OVER (
                    PARTITION BY product_level_id, store_level_id 
                    ORDER BY markdown_percentage
                ) AS markdown_num
            FROM (
                SELECT * FROM fin_disc_updated
                UNION 
                SELECT 
                    product_level_id, 
                    store_level_id, 
                    pcd_id, 
                    markdown_percentage 
                FROM price_markdown.tb_strategy_discount_%1$s_%2$s
            ) d
            JOIN (
                SELECT pcd_id, pcd_start_date 
                FROM price_markdown.tb_strategy_pcd 
                WHERE strategy_id = %2$s
            ) p USING(pcd_id)
        )
        INSERT INTO price_markdown.tb_strategy_discount_%1$s_%2$s (
            strategy_id,
            product_level_value,
            store_level_value,
            pcd_id,
            markdown_percentage,
            is_locked,
            created_at,
            updated_at,
            created_by,
            updated_by,
            product_level_id,
            store_level_id,
            previous_markdown_percentage,
            incremental_discount,
            approval_status,
            previous_pcd_id,
            channel_info,
            average_retail_price,
            action_status,
            markdown_type,
            currency_id,
            average_retail_price_with_vat,
            effective_price_point
        )
        SELECT 
            a.strategy_id,
            a.product_level_value,
            a.store_level_value,
            a.pcd_id,
            b.markdown_percentage,
            a.is_locked,
            a.created_at,
            a.updated_at,
            a.created_by,
            a.updated_by,
            a.product_level_id,
            a.store_level_id,
            b.previous_markdown_percentage,
            COALESCE(
                ROUND(
                    ((b.markdown_percentage - b.previous_markdown_percentage) / 
                    (100 - b.previous_markdown_percentage))::NUMERIC, 2
                ) * 100, 
                b.markdown_percentage
            ) AS incremental_discount,
            a.approval_status,
            a.previous_pcd_id,
            a.channel_info,
            a.average_retail_price,
            a.action_status,
            CASE 
                WHEN b.markdown_num = 1 THEN ''First Markdown'' 
                ELSE ''Final Sale Price'' 
            END AS markdown_type,
            a.currency_id,
            a.average_retail_price_with_vat,
            a.effective_price_point
        FROM %4$s a
        JOIN fin_base b USING(product_level_id, store_level_id, pcd_id);
    ', _currency_type, _strategy_id, _ls_stgs, _temp_table);

    RAISE NOTICE 'Executing replace-fin query: %', _replace_fin_data_query;
    EXECUTE _replace_fin_data_query;

END;
$procedure$;
