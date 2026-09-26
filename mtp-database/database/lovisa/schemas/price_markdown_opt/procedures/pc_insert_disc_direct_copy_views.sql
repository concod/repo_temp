--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_insert_disc_direct_copy_views_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_insert_disc_direct_copy_views

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_insert_disc_direct_copy_views;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_insert_disc_direct_copy_views
(
    IN _possible_currency_type TEXT,
    IN _input_currency_type    TEXT,
    IN _strategy_id            INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN

    EXECUTE FORMAT(
    '
    DELETE
    FROM price_markdown.tb_strategy_discount_%2$I_%3$s d
    USING price_markdown.tb_strategy_pcd p
    WHERE d.pcd_id = p.pcd_id
    AND d.strategy_id = %3$s
    AND p.pcd_start_date > CURRENT_DATE;

    INSERT INTO price_markdown.tb_strategy_discount_%2$I_%3$s
    (
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
        markdown_type,
        action_status,
        currency_id,
        average_retail_price_with_vat,
        effective_price_point
    )
    SELECT
        d1.strategy_id,
        d1.product_level_value,
        d1.store_level_value,
        d1.pcd_id,
        d1.markdown_percentage,
        d1.is_locked,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        d1.created_by,
        d1.updated_by,
        d1.product_level_id,
        d1.store_level_id,
        d1.previous_markdown_percentage,
        d1.incremental_discount,
        d1.approval_status,
        d1.previous_pcd_id,
        d1.channel_info,

        /* --- average retail price --- */
        AVG(
            CASE
                WHEN %1$L = ''local''      THEN psp.msrp
                WHEN %1$L = ''dominating'' THEN psp.msrp_territory
                WHEN %1$L = ''global''     THEN psp.msrp_default
            END
        ),

        d1.markdown_type,
        d1.action_status,

        /* --- currency id --- */
        CASE
            WHEN %1$L = ''local''      THEN psp.currency_id
            WHEN %1$L = ''dominating'' THEN psp.territory_currency_id
            WHEN %1$L = ''global''     THEN psp.default_currency_id
        END,

        /* --- avg retail price with VAT --- */
        AVG(
            CASE
                WHEN %1$L = ''local''      THEN psp.msrp_with_vat
                WHEN %1$L = ''dominating'' THEN psp.msrp_territory_with_vat
                WHEN %1$L = ''global''     THEN psp.msrp_default_with_vat
            END
        ),

        d1.effective_price_point
    FROM price_markdown.tb_strategy_discount_%4$I_%3$s d1
    LEFT JOIN price_markdown.tb_strategy_sku_store_mapping_%3$s ssm
           ON d1.product_level_id = ssm.product_level_id
          AND d1.store_level_id   = ssm.store_level_id
    LEFT JOIN price_markdown.tb_product_store_price psp
           ON ssm.product_id = psp.product_id
          AND ssm.store_id   = psp.store_id
    GROUP BY
        d1.strategy_id,
        d1.product_level_value,
        d1.store_level_value,
        d1.pcd_id,
        d1.markdown_percentage,
        d1.is_locked,
        d1.created_by,
        d1.updated_by,
        d1.product_level_id,
        d1.store_level_id,
        d1.previous_markdown_percentage,
        d1.incremental_discount,
        d1.approval_status,
        d1.previous_pcd_id,
        d1.channel_info,
        d1.markdown_type,
        d1.action_status,
        d1.effective_price_point,
        CASE
            WHEN %1$L = ''local''      THEN psp.currency_id
            WHEN %1$L = ''dominating'' THEN psp.territory_currency_id
            WHEN %1$L = ''global''     THEN psp.default_currency_id
        END
    ',
    _possible_currency_type,   -- %1$L
    _possible_currency_type,   -- %2$I (target table suffix)
    _strategy_id,              -- %3$s
    _input_currency_type       -- %4$I (source table suffix)
    );

END;
$$;
