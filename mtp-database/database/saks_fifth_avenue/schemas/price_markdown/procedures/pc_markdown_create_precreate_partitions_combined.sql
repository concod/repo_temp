--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_markdown_create_precreate_partitions_combined_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_markdown_create_precreate_partitions_combined

DROP PROCEDURE if exists price_markdown.pc_markdown_create_precreate_partitions_combined;

CREATE OR REPLACE PROCEDURE price_markdown.pc_markdown_create_precreate_partitions_combined()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
BEGIN
    -- Call to create predefined partitions for various tables
    CALL price_promo.pc_create_predefined_partitions(
        'price_markdown.tb_strategy_master_strategy_id_seq',
        'last_value',
        'price_markdown.tb_strategy_sku_store_mapping'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_markdown.tb_strategy_master_strategy_id_seq',
        'last_value',
        'price_markdown.tb_strategy_hierarchy'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_markdown.tb_strategy_master_strategy_id_seq',
        'last_value',
        'price_markdown.tb_strategy_discount'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_markdown.tb_strategy_master_strategy_id_seq',
        'last_value',
        'price_markdown.tb_strategy_discount_ia'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_markdown.tb_strategy_master_strategy_id_seq',
        'last_value',
        'price_markdown.tb_approval_metrics'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_markdown.tb_strategy_master_strategy_id_seq',
        'last_value',
        'price_markdown.tb_strategy_date_metrics_ia'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_markdown.tb_strategy_master_strategy_id_seq',
        'last_value',
        'price_markdown.tb_strategy_date_metrics_fin'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_markdown.tb_strategy_master_strategy_id_seq',
        'last_value',
        'price_markdown.tb_ssd_fin',
        100,
        'PARTITION BY RANGE (recommendation_date)'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_markdown.tb_strategy_master_strategy_id_seq',
        'last_value',
        'price_markdown.tb_ssd_ia',
        100,
        'PARTITION BY RANGE (recommendation_date)'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_markdown.tb_strategy_master_strategy_id_seq',
        'last_value',
        'price_markdown.tb_ssd_actual',
        100,
        'PARTITION BY RANGE (recommendation_date)'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_markdown.tb_strategy_master_strategy_id_seq',
        'last_value',
        'price_markdown.tb_agg_fin',
        100,
        'PARTITION BY RANGE (recommendation_date)'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_markdown.tb_strategy_master_strategy_id_seq',
        'last_value',
        'price_markdown.tb_agg_ia',
        100,
        'PARTITION BY RANGE (recommendation_date)'
    );

    CALL price_promo.pc_create_predefined_partitions(
        'price_markdown.tb_strategy_master_strategy_id_seq',
        'last_value',
        'price_markdown.tb_agg_actual',
        100,
        'PARTITION BY RANGE (recommendation_date)'
    );

    call price_promo.pc_create_predefined_partitions('global.tb_product_group_pg_id_seq', 'last_value', 'global.tb_pg_product');

    call price_promo.pc_create_predefined_partitions('global.tb_store_group_sg_id_seq', 'last_value', 'global.tb_sg_store');
END;
$procedure$
;
