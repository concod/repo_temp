--liquibase formatted sql
--changeset liquibase:pc_preprocess_get_custom_rules_v180924 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_preprocess_get_custom_rules

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_preprocess_get_custom_rules;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_preprocess_get_custom_rules(IN _strategy_id integer, IN _custom_rule_table_name text, IN _tb_rule_master text, IN _tb_strategy_rule text, IN _tb_rule_discount text, IN _tb_strategy_sku_store_mapping text, IN _product_master text, IN _app_sub_master text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_custom_rule_query text;
BEGIN
    _custom_rule_query = FORMAT('DROP TABLE IF EXISTS %2$s ;
        CREATE TABLE %2$s AS
        WITH
        priorities AS
        (
            SELECT rule_type, priority
            FROM %3$s rm
            JOIN (
                SELECT constraint_id, priority
                FROM %4$s
                WHERE strategy_id = %1$s
                  AND constraint_type = 0
            ) sr
            ON rm.rule_id = sr.constraint_id
            AND is_default_rule = 1
        ),
        rules_base AS
        (
            SELECT rm.rule_id, rm.rule_name, rm.rule_product_level, rm.rule_store_level, rm.rule_type AS rule_type_id,
                   rd.product_level_id AS rule_product_level_id,
                   rd.store_level_id AS rule_store_level_id,
                   rd.min_value, rd.max_value, rd.applicable_value, pr.priority, sr.rule_flexibility_type_id
            FROM %3$s rm
            JOIN (
                SELECT constraint_id, priority, rule_flexibility_type_id
                FROM %4$s
                WHERE strategy_id = %1$s
                  AND constraint_type = 0
                  AND status = 0
            ) sr
            ON rm.rule_id = sr.constraint_id
            AND is_default_rule = 0
            JOIN %5$s rd
            ON rm.rule_id = rd.rule_id
            JOIN priorities pr
            ON rm.rule_type = pr.rule_type
        ),
        prod_base AS
        (
            SELECT ssm.product_level_id, ssm.store_level_id, ssm.store_id, pm.l0_cid, pm.l1_cid, pm.l2_cid,
                   pm.l3_cid, pm.l4_cid, pm.l5_cid, product_id
            FROM (
                SELECT product_level_id, store_level_id, product_id, store_id
                FROM %6$s
                WHERE strategy_id = %1$s
            ) ssm
            JOIN %7$s pm
            USING(product_id)
        )
        SELECT pb.product_level_id, pb.store_level_id, rb.rule_id, tb3.name, ''custom'' AS rule_type,
               rule_type_id, rb.min_value, rb.max_value,
               rb.applicable_value, rb.priority, rb.rule_flexibility_type_id
        FROM rules_base rb
        JOIN prod_base pb
        ON CASE
               WHEN rule_product_level = -200 THEN TRUE
               WHEN rule_product_level = -100 THEN rb.rule_product_level_id = pb.product_level_id
               WHEN rule_product_level = 0 THEN rb.rule_product_level_id = pb.l0_cid
               WHEN rule_product_level = 1 THEN rb.rule_product_level_id = pb.l1_cid
               WHEN rule_product_level = 2 THEN rb.rule_product_level_id = pb.l2_cid
               WHEN rule_product_level = 3 THEN rb.rule_product_level_id = pb.l3_cid
               WHEN rule_product_level = 4 THEN rb.rule_product_level_id = pb.l4_cid
               ELSE rb.rule_product_level_id = pb.product_id
           END
           AND CASE
               WHEN rule_store_level = -200 THEN TRUE
               ELSE rb.rule_store_level_id = pb.store_level_id
           END
        INNER JOIN %8$s tb3
        ON rb.rule_type_id = tb3.id
        AND tb3.remarks = ''Markdown Rule''
        GROUP BY 1,2,3,4,5,6,7,8,9,10,11;
    ',
    _strategy_id,
    _custom_rule_table_name,
    _tb_rule_master,
    _tb_strategy_rule,
    _tb_rule_discount,
    _tb_strategy_sku_store_mapping,
    _product_master,
    _app_sub_master
    );

   raise notice 'get_custom_rules query: %', _custom_rule_query;
  execute _custom_rule_query;
END;
$procedure$
;
