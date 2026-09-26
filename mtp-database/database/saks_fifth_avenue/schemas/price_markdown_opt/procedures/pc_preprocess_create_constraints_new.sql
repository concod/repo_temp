--liquibase formatted sql
--changeset liquibase:pc_preprocess_create_constraints_new runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_create_constraints_new

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_create_constraints_new;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_create_constraints_new(IN _constraints_new text, IN _constraints text, IN _opt_bin_mapping text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_constraints_new_query text;
BEGIN
    _constraints_new_query = format('DROP TABLE IF EXISTS %1$s;

        CREATE TABLE %1$s AS
        (
            SELECT
                new_opt_level_bins AS opt_level_bins,
                min_discount, max_discount,
                min_step_size, max_step_size,
                min_distinct_discounts, max_distinct_discounts,
                min_md_freq, max_md_freq,
                min_first_mkd_discount, max_first_mkd_discount,
                min_discount_p, max_discount_p,
                min_step_size_p, max_step_size_p,
                min_distinct_discounts_p, max_distinct_discounts_p,
                min_md_freq_p, max_md_freq_p,
                min_first_mkd_discount_p, max_first_mkd_discount_p,
                hard_markdown_p,
                min_discount_f, max_discount_f,
                min_step_size_f, max_step_size_f,
                min_distinct_discounts_f, max_distinct_discounts_f,
                min_md_freq_f, max_md_freq_f,
                min_first_mkd_discount_f, max_first_mkd_discount_f,
                hard_markdown_f,
                SUM(sales_units) AS sales_units
            FROM
                %2$s
            JOIN
                %3$s
            USING(opt_level_bins)
            GROUP BY
                new_opt_level_bins, min_discount, max_discount,
                min_step_size, max_step_size,
                min_distinct_discounts, max_distinct_discounts,
                min_md_freq, max_md_freq,
                min_first_mkd_discount, max_first_mkd_discount,
                min_discount_p, max_discount_p,
                min_step_size_p, max_step_size_p,
                min_distinct_discounts_p, max_distinct_discounts_p,
                min_md_freq_p, max_md_freq_p,
                min_first_mkd_discount_p, max_first_mkd_discount_p,
                hard_markdown_p,
                min_discount_f, max_discount_f,
                min_step_size_f, max_step_size_f,
                min_distinct_discounts_f, max_distinct_discounts_f,
                min_md_freq_f, max_md_freq_f,
                min_first_mkd_discount_f, max_first_mkd_discount_f,
                hard_markdown_f
        );
    ', _constraints_new, _constraints, _opt_bin_mapping);
   	raise notice 'Constraints new query : %', _constraints_new_query;
   execute _constraints_new_query;
END $procedure$
;
