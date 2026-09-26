--liquibase formatted sql
--changeset liquibase:pc_preprocess_create_non_5_multiple_discounts_base runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_create_non_5_multiple_discounts_base

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_create_non_5_multiple_discounts_base;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_create_non_5_multiple_discounts_base(IN _non_5_mul_discounts text, IN _client_reco_table text, IN _prev_week_table text, IN _item_opt_mapping text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_non_5_mul_discounts_query text;
BEGIN
    _non_5_mul_discounts_query = format(
        'DROP TABLE IF EXISTS %1$s;
         CREATE TABLE %1$s AS
         (
            WITH base AS (
                SELECT opt_level_bins, effective_opt_discount
                FROM (
                    SELECT opt_level_bins, effective_opt_discount
                    FROM %2$s
                    WHERE effective_opt_discount::numeric %% 5 != 0
                    UNION ALL
                    SELECT opt_level_bins, effective_opt_discount
                    FROM %3$s
                    WHERE effective_opt_discount::numeric %% 5 != 0
                ) a
                GROUP BY opt_level_bins, effective_opt_discount
            )
            SELECT product_id, effective_opt_discount
            FROM base
            JOIN %4$s USING (opt_level_bins)
            GROUP BY product_id, effective_opt_discount
         );',
        _non_5_mul_discounts,
        _client_reco_table,
        _prev_week_table,
        _item_opt_mapping
    );
 	raise notice '_non_5_mul_discounts_query : %', _non_5_mul_discounts_query;
 	execute _non_5_mul_discounts_query;
END;
$procedure$
;