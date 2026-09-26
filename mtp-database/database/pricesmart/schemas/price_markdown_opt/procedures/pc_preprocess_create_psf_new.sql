--liquibase formatted sql
--changeset liquibase:pc_preprocess_create_psf_new runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_create_psf_new

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_create_psf_new;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_create_psf_new(IN _prod_store_filter_new text, IN _prod_store_filter text, IN _opt_bin_mapping text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_create_psf_new_query text;
BEGIN

    _create_psf_new_query = format('DROP TABLE IF EXISTS %1$s;

        CREATE TABLE %1$s AS
        (
            SELECT
                a.product_id,
                n_cluster AS store_id,
                new_opt_level_bins AS opt_level_bins,
                CONCAT(a.product_id, ''_'', n_cluster) AS sku_id,
                SUM(inv_oh) AS inv_oh
            FROM
                %2$s a
            JOIN
                %3$s b
            ON
                a.store_id = b.store_level_id
                AND split_part(a.opt_level_bins, ''_'', 1) = CAST(b.product_level_id AS text)
            GROUP BY
                1, 2, 3, 4
        );',
        _prod_store_filter_new, _prod_store_filter, _opt_bin_mapping);
       raise notice 'Create new product store filter query : %', _create_psf_new_query;
		execute _create_psf_new_query;
END $procedure$
;
