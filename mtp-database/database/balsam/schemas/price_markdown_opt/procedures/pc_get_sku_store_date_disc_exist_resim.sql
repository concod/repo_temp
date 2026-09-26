--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_get_sku_store_date_disc_exist_resim_29052025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: store split changes for pc_get_sku_store_date_disc_exist_resim

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_get_sku_store_date_disc_exist_resim(int4, int4, int4, date, text, text);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_get_sku_store_date_disc_exist_resim(IN _strategy_id integer, IN _min_strategy_disc_id integer, IN _max_strategy_disc_id integer, IN _pcd_start_date date, IN _reference_table text, IN _table_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

    DECLARE _table_name text;
            _table_name_1 text;
            _table_name_2 text;
            _idx_name text;
            _idx_name_2 text;
            _day_split_table text;
            --_store_split_table text;
            vl_query text;
            v2_query text;
            v3_query text;
    BEGIN
        -- Construct the dynamic SQL statement to drop the table
        _table_name := 'tb_ssd_'||_table_type||_strategy_id;
        _table_name_1 := 'tb_ssd_'||_table_type ||_strategy_id || '_1';
        _table_name_2 := 'tb_ssd_'||_table_type ||_strategy_id || '_2';
        _idx_name_2 := 'idx_sub_class'||_strategy_id;
        _idx_name := 'idx_item_mp' ||_strategy_id;
        _day_split_table := 'mvm_day_split_'||_strategy_id;
        --_store_split_table := 'mvm_store_split_'||_strategy_id;

        vl_query := FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
            CREATE UNLOGGED TABLE price_markdown_opt_temp.%I AS
            select a1.*, pcd_start_date AS start_date, pcd_end_date AS end_date
                from
                (SELECT d1.strategy_id, d1.product_level_id, d1.store_level_id, d1.pcd_id as EVENT,
                d1.markdown_percentage as markdown_percentage_exact, floor(d1.markdown_percentage / 5.0) * 5 as markdown_percentage,
                previous_markdown_percentage, channel_info
                            FROM price_markdown.tb_strategy_discount d1
                            WHERE d1.strategy_id = $1
                            AND EXISTS (
                                SELECT 1
                                FROM price_markdown.tb_strategy_discount d2
                                WHERE d2.strategy_id = d1.strategy_id
                                AND d2.product_level_id = d1.product_level_id
                                AND d2.store_level_id = d1.store_level_id
                                and id BETWEEN $2 AND $3
                                LIMIT 1)) a1
                               join price_markdown.tb_strategy_pcd a2
                              on a1.EVENT = a2.pcd_id
                             ;
            ', _table_name_1, _table_name_1) ;

        raise notice 'CTE --- %', vl_query;
        execute vl_query using _strategy_id , _min_strategy_disc_id, _max_strategy_disc_id;

        v2_query := FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
                            CREATE UNLOGGED TABLE price_markdown_opt_temp.%I as

              select a1.*, product_id, store_id, l3_cid, l0_cid, price, cost, total_inventory, 
              currency_id, price_with_vat
              FROM price_markdown_opt_temp.%I a1
              inner join
              (Select tb1.product_id, tb1.store_id, product_level_id, store_level_id,
                        l3_cid, l0_cid, tb2.msrp as price, tb2.cost, coalesce(total_inventory,0) as total_inventory,
                        tb2.currency_id, tb2.msrp_with_vat as price_with_vat
                from (select product_id, store_id, product_level_id, store_level_id,
                                (rem_inv + sales_units) as total_inventory
                         from price_markdown.%I
                         where recommendation_date = $1
                            ) tb1
                    inner join price_markdown.product_master tb2
                    ON tb1.product_id = tb2.product_id
                    inner join (select product_id, store_id
                        from price_markdown.tb_strategy_sku_store_mapping
                            where strategy_id = $2) tb3
                on tb1.product_id = tb3.product_id
                and tb1.store_id = tb3.store_id) a2
                on a1.product_level_id = a2.product_level_id
                and a1.store_level_id = a2.store_level_id
                ;

            CREATE INDEX %I ON price_markdown_opt_temp.%I using btree (l3_cid, l0_cid);
        ',_table_name_2, _table_name_2, _table_name_1, _reference_table, _idx_name_2, _table_name_2);

        raise notice 'CTE --- %', v2_query;
        execute v2_query using _pcd_start_date, _strategy_id;

            v3_query := FORMAT('DROP TABLE IF EXISTS price_markdown_opt_temp.%I;
                    CREATE UNLOGGED TABLE price_markdown_opt_temp.%I as

                    select tb1.*, 
                    tb2.date, tb2.week_start_date, tb2.day_split_ratio
                    from price_markdown_opt_temp.%I tb1
                    INNER JOIN price_markdown_opt.%I tb2
                    ON tb2.date between start_date and end_date
                    and tb1.l3_cid = tb2.l3_cid
                    and tb2.date >= $1;

        ',_table_name, _table_name, _table_name_2, _day_split_table);

        raise notice 'CTE --- %', v3_query;
        execute v3_query using _pcd_start_date;

END;
$procedure$
;