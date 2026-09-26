--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_preprocess_get_constraints_strategy_v2808 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_constraints_strategy

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_constraints_strategy(IN _constraints_table text, IN _strategy_id integer, IN _tb_strategy_sku_store_mapping text, IN _tb_strategy_rule text, IN _tb_rule_master text, IN _app_sub_master text, IN _custom_rules text, IN _tb_strategy_objective text, IN _item_opt_mapping text, IN _inventory_table text, IN _ia_exist integer, IN _ssd_actuals text, IN _ssd_ia text, IN _max_inv_next_date date, IN _current_pcd_end_date date, in _rules_exist integer);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_constraints_strategy(IN _constraints_table text, IN _strategy_id integer, IN _tb_strategy_sku_store_mapping text, IN _tb_strategy_rule text, IN _tb_rule_master text, IN _app_sub_master text, IN _custom_rules text, IN _tb_strategy_objective text, IN _item_opt_mapping text, IN _inventory_table text, IN _ia_exist integer, IN _ssd_actuals text, IN _ssd_ia text, IN _max_inv_next_date date, IN _current_pcd_end_date date, in _rules_exist integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_get_constraints_strategy_query text;
	_get_constraints_strategy_clause_1 text;
	_get_constraints_strategy_clause_2 text;
	_get_constraints_strategy_clause_3 text;
begin
	_get_constraints_strategy_clause_1 = CASE WHEN _ia_exist = 1 THEN 'SUM(COALESCE(actual_qty, 0))' ELSE '0' end;

	_get_constraints_strategy_clause_2 = CASE WHEN _ia_exist = 1 THEN 'SUM(COALESCE(ongoing_sales, 0))' ELSE '0' end;

	_get_constraints_strategy_clause_3 = CASE WHEN _ia_exist = 1 THEN format('
            LEFT JOIN (
                SELECT product_id, store_id, SUM(sales_units) AS actual_qty
                FROM %1$s
                GROUP BY 1, 2
            ) t3 ON iomi.product_id = t3.product_id AND iomi.store_id = t3.store_id
            LEFT JOIN (
                SELECT product_id, store_id, SUM(sales_units) AS ongoing_sales
                FROM %2$s
                WHERE recommendation_date BETWEEN ''%3$s'' AND ''%4$s''
                GROUP BY 1, 2
            ) t4 ON iomi.product_id = t4.product_id AND iomi.store_id = t4.store_id',
            _ssd_actuals, _ssd_ia, _max_inv_next_date, _current_pcd_end_date) ELSE '' end;

	if _rules_exist > 0 then

    _get_constraints_strategy_query = format('DROP TABLE IF EXISTS %1$s;

    CREATE TABLE IF NOT EXISTS %1$s AS
        (
            WITH global_rules AS (
                SELECT
                    product_level_id,
                    store_level_id,
                    rule_id,
                    tb3.name,
                    ''global'' AS rule_type,
                    rule_type AS rule_type_id,
                    sr.min_value,
                    sr.max_value,
                    sr.applicable_value,
                    priority,
                    rule_flexibility_type_id
                FROM (
                    SELECT product_level_id, store_level_id
                    FROM %2$s tsssm
                    WHERE strategy_id = %3$s
                ) ssm,
                (
                    SELECT *
                    FROM %4$s
                    WHERE strategy_id = %3$s
                    AND constraint_type = 0
                    AND status = 0
                ) sr
                JOIN (
                    SELECT rule_id, rule_name, rule_type
                    FROM %5$s
                    WHERE is_default_rule = 1
                ) rm
                ON sr.constraint_id = rm.rule_id
                INNER JOIN %6$s tb3
                ON rm.rule_type = tb3.id
                AND tb3.remarks = ''Markdown Rule''
            ),
            rules_base AS (
                SELECT *
                FROM (
                    SELECT *, row_number() OVER (PARTITION BY product_level_id, store_level_id, rule_type_id ORDER BY rule_type) AS rnk
                    FROM (
                        SELECT * FROM global_rules
                        UNION
                        SELECT * FROM %7$s
                    ) a
                ) b
                WHERE rnk = 1
            ),
            st_perc AS (
                SELECT 1 AS id, ''st_percent'' AS units_objective, objective_value AS st_percent
                FROM %8$s tsr
                WHERE strategy_id = %3$s
                AND objective_type_id = 48  -- For ST percentage
            ),
            opt_base_transpose AS (
                SELECT
                    opt_level_bins,
                    COALESCE(MAX(min_discount), 1) AS min_discount,
                    COALESCE(MAX(max_discount), 999) AS max_discount,
                    COALESCE(MAX(min_step_size), 1) AS min_step_size,
                    COALESCE(MAX(max_step_size), 999) AS max_step_size,
                    COALESCE(MAX(min_md_freq), 1) AS min_md_freq,
                    COALESCE(MAX(max_md_freq), 999) AS max_md_freq,
                    COALESCE(MAX(min_distinct_discounts), 1) AS min_distinct_discounts,
                    COALESCE(MAX(max_distinct_discounts), 999) AS max_distinct_discounts,
                    COALESCE(MAX(min_first_mkd_discount), 1) AS min_first_mkd_discount,
                    COALESCE(MAX(max_first_mkd_discount), 999) AS max_first_mkd_discount,
                    COALESCE(MAX(min_discount_p), 1) AS min_discount_p,
                    COALESCE(MAX(max_discount_p), 2) AS max_discount_p,
                    COALESCE(MAX(min_step_size_p), 3) AS min_step_size_p,
                    COALESCE(MAX(max_step_size_p), 3) AS max_step_size_p,
                    COALESCE(MAX(min_md_freq_p), 4) AS min_md_freq_p,
                    COALESCE(MAX(max_md_freq_p), 4) AS max_md_freq_p,
                    COALESCE(MAX(min_distinct_discounts_p), 5) AS min_distinct_discounts_p,
                    COALESCE(MAX(max_distinct_discounts_p), 5) AS max_distinct_discounts_p,
                    COALESCE(MAX(min_first_mkd_discount_p), 6) AS min_first_mkd_discount_p,
                    COALESCE(MAX(max_first_mkd_discount_p), 6) AS max_first_mkd_discount_p,
                    COALESCE(MAX(min_discount_f), 999) AS min_discount_f,
                    COALESCE(MAX(max_discount_f), 999) AS max_discount_f,
                    COALESCE(MAX(min_step_size_f), 999) AS min_step_size_f,
                    COALESCE(MAX(max_step_size_f), 999) AS max_step_size_f,
                    COALESCE(MAX(min_md_freq_f), 999) AS min_md_freq_f,
                    COALESCE(MAX(max_md_freq_f), 999) AS max_md_freq_f,
                    COALESCE(MAX(min_distinct_discounts_f), 999) AS min_distinct_discounts_f,
                    COALESCE(MAX(max_distinct_discounts_f), 999) AS max_distinct_discounts_f,
                    COALESCE(MAX(min_first_mkd_discount_f), 999) AS min_first_mkd_discount_f,
                    COALESCE(MAX(max_first_mkd_discount_f), 999) AS max_first_mkd_discount_f
                FROM (
                    SELECT
                        CONCAT(product_level_id, ''_'', store_level_id) AS opt_level_bins,
                        CASE WHEN name = ''min_max_percent'' THEN min_value END AS min_discount,
                        CASE WHEN name = ''min_max_percent'' THEN max_value END AS max_discount,
                        CASE WHEN name = ''step_size_percent'' THEN min_value END AS min_step_size,
                        CASE WHEN name = ''step_size_percent'' THEN max_value END AS max_step_size,
                        CASE WHEN name = ''no_of_markdown'' THEN min_value END AS min_distinct_discounts,
                        CASE WHEN name = ''no_of_markdown'' THEN max_value END AS max_distinct_discounts,
                        CASE WHEN name = ''min_week_pp'' THEN min_value END AS min_md_freq,
                        CASE WHEN name = ''min_week_pp'' THEN max_value END AS max_md_freq,
                        CASE WHEN name = ''first_markdown_percent'' THEN min_value END AS min_first_mkd_discount,
                        CASE WHEN name = ''first_markdown_percent'' THEN max_value END AS max_first_mkd_discount,
                        CASE WHEN name = ''min_max_percent'' THEN priority END AS min_discount_p,
                        CASE WHEN name = ''min_max_percent'' THEN priority END AS max_discount_p,
                        CASE WHEN name = ''step_size_percent'' THEN priority END AS min_step_size_p,
                        CASE WHEN name = ''step_size_percent'' THEN priority END AS max_step_size_p,
                        CASE WHEN name = ''no_of_markdown'' THEN priority END AS min_distinct_discounts_p,
                        CASE WHEN name = ''no_of_markdown'' THEN priority END AS max_distinct_discounts_p,
                        CASE WHEN name = ''min_week_pp'' THEN priority END AS min_md_freq_p,
                        CASE WHEN name = ''min_week_pp'' THEN priority END AS max_md_freq_p,
                        CASE WHEN name = ''first_markdown_percent'' THEN priority END AS min_first_mkd_discount_p,
                        CASE WHEN name = ''first_markdown_percent'' THEN priority END AS max_first_mkd_discount_p,
                        CASE WHEN name = ''min_max_percent'' THEN rule_flexibility_type_id END AS min_discount_f,
                        CASE WHEN name = ''min_max_percent'' THEN rule_flexibility_type_id END AS max_discount_f,
                        CASE WHEN name = ''step_size_percent'' THEN rule_flexibility_type_id END AS min_step_size_f,
                        CASE WHEN name = ''step_size_percent'' THEN rule_flexibility_type_id END AS max_step_size_f,
                        CASE WHEN name = ''no_of_markdown'' THEN rule_flexibility_type_id END AS min_distinct_discounts_f,
                        CASE WHEN name = ''no_of_markdown'' THEN rule_flexibility_type_id END AS max_distinct_discounts_f,
                        CASE WHEN name = ''min_week_pp'' THEN rule_flexibility_type_id END AS min_md_freq_f,
                        CASE WHEN name = ''min_week_pp'' THEN rule_flexibility_type_id END AS max_md_freq_f,
                        CASE WHEN name = ''first_markdown_percent'' THEN rule_flexibility_type_id END AS min_first_mkd_discount_f,
                        CASE WHEN name = ''first_markdown_percent'' THEN rule_flexibility_type_id END AS max_first_mkd_discount_f
                    FROM rules_base
                ) tb1
                GROUP BY 1
            ),
            opt_level_metrics AS (
                SELECT 1 AS id,
                    opt_level_bins,
                    SUM(COALESCE(total_inventory, 0)) AS inv,
                    %11$s AS actual_qty,
                    %12$s AS ongoing_sales
                FROM %9$s iomi
                INNER JOIN %10$s t2
                ON iomi.product_id = t2.product_id
                AND iomi.store_id = t2.store_id
                %13$s
                GROUP BY 1, 2
            )
            SELECT a1.*, a2.sales_units
            FROM (
                SELECT
                    opt_level_bins,
                    rule.min_discount,
                    rule.max_discount,
                    rule.min_step_size,
                    rule.max_step_size,
                    rule.min_distinct_discounts,
                    rule.max_distinct_discounts,
                    rule.min_md_freq,
                    rule.max_md_freq,
                    rule.min_first_mkd_discount,
                    rule.max_first_mkd_discount,
                    rule.min_discount_p,
                    rule.max_discount_p,
                    rule.min_step_size_P,
                    rule.max_step_size_P,
                    rule.min_distinct_discounts_p,
                    rule.max_distinct_discounts_p,
                    rule.min_md_freq_p,
                    rule.max_md_freq_p,
                    rule.min_first_mkd_discount_p,
                    rule.max_first_mkd_discount_p,
                    0 AS hard_markdown_P,
                    CASE WHEN rule.min_discount_f = 1 THEN ''Hard'' ELSE ''Soft'' END AS min_discount_f,
                    CASE WHEN rule.max_discount_f = 1 THEN ''Hard'' ELSE ''Soft'' END AS max_discount_f,
                    CASE WHEN rule.min_step_size_f = 1 THEN ''Hard'' ELSE ''Soft'' END AS min_step_size_f,
                    CASE WHEN rule.max_step_size_f = 1 THEN ''Hard'' ELSE ''Soft'' END AS max_step_size_f,
                    CASE WHEN rule.min_distinct_discounts_f = 1 THEN ''Hard'' ELSE ''Soft'' END AS min_distinct_discounts_f,
                    CASE WHEN rule.max_distinct_discounts_f = 1 THEN ''Hard'' ELSE ''Soft'' END AS max_distinct_discounts_f,
                    CASE WHEN rule.min_md_freq_f = 1 THEN ''Hard'' ELSE ''Soft'' END AS min_md_freq_f,
                    CASE WHEN rule.max_md_freq_f = 1 THEN ''Hard'' ELSE ''Soft'' END AS max_md_freq_f,
                    CASE WHEN rule.min_first_mkd_discount_f = 1 THEN ''Hard'' ELSE ''Soft'' END AS min_first_mkd_discount_f,
                    CASE WHEN rule.max_first_mkd_discount_f = 1 THEN ''Hard'' ELSE ''Soft'' END AS max_first_mkd_discount_f,
                    ''Hard'' AS hard_markdown_f
                FROM
                    opt_base_transpose rule
            ) a1
            LEFT JOIN (
                SELECT
                    opt_level_bins,
                    ((inv + actual_qty) * st_percent / 100) - ongoing_sales AS sales_units
                FROM
                    opt_level_metrics t1
                LEFT JOIN
                    st_perc t2 ON t1.id = t2.id
            ) a2
            ON a1.opt_level_bins = a2.opt_level_bins
        );',
        _constraints_table, _tb_strategy_sku_store_mapping, _strategy_id, _tb_strategy_rule,
        _tb_rule_master, _app_sub_master, _custom_rules, _tb_strategy_objective, _item_opt_mapping, _inventory_table,
        _get_constraints_strategy_clause_1, _get_constraints_strategy_clause_2, _get_constraints_strategy_clause_3
     );

    else

    _get_constraints_strategy_query = format('DROP TABLE IF EXISTS %1$s;

    CREATE TABLE IF NOT EXISTS %1$s AS
	(with rules_base as
		(
		select opt_level_bins,
		1 as min_discount, 999 as max_discount,
		1 as min_step_size, 999 as max_step_size,
		1 as min_md_freq, 999 as max_md_freq,
		2 as min_distinct_discounts, 999 as max_distinct_discounts,
		1 as min_first_mkd_discount, 999 as max_first_mkd_discount,
		1 as min_discount_p, 2 as max_discount_p,
		3 as min_step_size_p, 3 as max_step_size_p,
		4 as min_md_freq_p, 4 as max_md_freq_p,
		5 as min_distinct_discounts_p, 5 as max_distinct_discounts_p,
		6 as min_first_mkd_discount_p, 6 as max_first_mkd_discount_p,
		0 AS hard_markdown_P,
		''Soft'' as min_discount_f, ''Soft'' as max_discount_f,
		''Soft'' as min_step_size_f, ''Soft'' as max_step_size_f,
		''Soft'' as min_distinct_discounts_f, ''Soft'' as max_distinct_discounts_f,
		''Soft'' as min_md_freq_f, ''Soft'' as max_md_freq_f,
		''Soft'' as min_first_mkd_discount_f, ''Soft'' as max_first_mkd_discount_f,
		''Hard'' as hard_markdown_f
		from %2$s
		),
		st_perc AS (
                SELECT 1 AS id, ''st_percent'' AS units_objective, objective_value AS st_percent
                FROM %4$s tsr
                WHERE strategy_id = %3$s
                AND objective_type_id = 48  -- For ST percentage
            ),
		opt_level_metrics AS (
                SELECT 1 AS id,
                    opt_level_bins,
                    SUM(COALESCE(total_inventory, 0)) AS inv,
                    %5$s AS actual_qty,
                    %6$s AS ongoing_sales
                FROM %2$s iomi
                INNER JOIN %7$s t2
                ON iomi.product_id = t2.product_id
                AND iomi.store_id = t2.store_id
                %8$s
                GROUP BY 1, 2
            )
		select a1.*, a2.sales_units
		from rules_base a1
		LEFT JOIN (
                SELECT
                    opt_level_bins,
                    ((inv + actual_qty) * st_percent / 100) - ongoing_sales AS sales_units
                FROM
                    opt_level_metrics t1
                LEFT JOIN
                    st_perc t2 ON t1.id = t2.id
            ) a2
            ON a1.opt_level_bins = a2.opt_level_bins)',
    _constraints_table, _item_opt_mapping, _strategy_id, _tb_strategy_objective,
    _get_constraints_strategy_clause_1, _get_constraints_strategy_clause_2, _inventory_table,
    _get_constraints_strategy_clause_3);

   end if;

	raise notice 'Get constraints strategy query : %', _get_constraints_strategy_query;
	execute _get_constraints_strategy_query;
END;
$procedure$
;
