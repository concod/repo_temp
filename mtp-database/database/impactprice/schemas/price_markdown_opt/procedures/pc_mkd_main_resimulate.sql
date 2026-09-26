--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_mkd_main_resimulate_03042026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_mkd_main_resimulate_03042026

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_mkd_main_resimulate(int4, int4, int4, text, text);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_mkd_main_resimulate(IN _strategy_id integer, IN _min_strategy_disc_id integer, IN _max_strategy_disc_id integer, IN _table_type text, IN _temp_table_ssd_fin text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
    DECLARE _pcd_start_date date;
            _min_week_start date;
            _max_week_start date;
            _is_there integer;
            _sim_is_there integer;
            _daysplit_is_there integer;
            _storesplit_is_there integer;
            _destination_table_agg text;
            _reference_table_agg text;
            start_time TIMESTAMP;
            end_time TIMESTAMP;
            _ssd_table_fin text := 'tb_ssd_'||_table_type || '_' ||_strategy_id;
            _agg_table_fin text := 'tb_agg_'||_table_type || '_' ||_strategy_id;

    begin
        -- edge case handling in case of empty discount ids
        start_time := clock_timestamp();
        if _min_strategy_disc_id IS NOT NULL and _max_strategy_disc_id IS NOT NULL THEN
            raise notice 'min_discount_id and max_discount_id when input : % and %', _min_strategy_disc_id, _max_strategy_disc_id;
        else
            select min(id), max(id) from price_markdown.tb_strategy_discount sd
            left join price_markdown.tb_strategy_pcd_new pcd on sd.pcd_id = pcd.pcd_id
            where sd.strategy_id = _strategy_id and pcd.pcd_start_date > date(timezone('EST', now()))
         into _min_strategy_disc_id, _max_strategy_disc_id;
            raise notice 'min_discount_id and max_discount_id when empty input : % and %', _min_strategy_disc_id, _max_strategy_disc_id;
        end if;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken IF-Else statement: %', end_time - start_time;

        start_time := clock_timestamp();
        select * from price_markdown_opt.fn_get_mkd_resimulate_arg(_strategy_id, _min_strategy_disc_id, _max_strategy_disc_id)
        into _pcd_start_date, _min_week_start, _max_week_start;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken SQL fn_get_mkd_resimulate_arg: %', end_time - start_time;

        start_time := clock_timestamp();
        select fin_value_exists::integer a from price_markdown_opt.fn_check_metric_table_data_exists(_strategy_id) into _is_there;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken SQL fn_check_metric_table_data_exists: %', end_time - start_time;

        SELECT price_markdown_opt.fn_check_artifacts_opt('materialized view', 'price_markdown_opt', 'mvm_sim_'||_strategy_id) INTO _sim_is_there;
        SELECT price_markdown_opt.fn_check_artifacts_opt('materialized view', 'price_markdown_opt', 'mvm_day_split_'||_strategy_id) INTO _daysplit_is_there;
       SELECT price_markdown_opt.fn_check_artifacts_opt('materialized view', 'price_markdown_opt', 'mvm_store_split_'||_strategy_id) INTO _storesplit_is_there;

        start_time := clock_timestamp();
        if _sim_is_there = 0 then
            call price_markdown_opt.pc_create_materialized_view_sim(_strategy_id);
            RAISE NOTICE 'Table Not Exist';
        else
            RAISE NOTICE 'Table Exist';
        end if;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken for sim creation: %', end_time - start_time;

        start_time := clock_timestamp();
        if _daysplit_is_there = 0 then
            call price_markdown_opt.pc_create_materialized_view_day_split(_strategy_id);
            RAISE NOTICE 'Table Not Exist';
        else
            RAISE NOTICE 'Table Exist';
        end if;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken for day split creation: %', end_time - start_time;

       start_time := clock_timestamp();
        if _storesplit_is_there = 0 then
            call price_markdown_opt.pc_create_materialized_view_store_split(_strategy_id);
            RAISE NOTICE 'Table Not Exist';
        else
            RAISE NOTICE 'Table Exist';
        end if;
        end_time := clock_timestamp();
        RAISE NOTICE 'Time taken for store split creation: %', end_time - start_time;

        if _is_there = 0 then
            start_time := clock_timestamp();
           call price_markdown_opt.pc_create_pcd_partitions(_strategy_id, 'price_markdown', 'tb_ssd_fin');
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL pc_create_mkd_sku_store_date: %', end_time - start_time;

            start_time := clock_timestamp();
           call price_markdown_opt.pc_create_pcd_partitions(_strategy_id, 'price_markdown', 'tb_agg_fin');
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL pc_create_mkd_agg_date: %', end_time - start_time;

           start_time := clock_timestamp();
           call price_markdown_opt.pc_create_pcd_partitions(_strategy_id, 'price_markdown', 'tb_ssd_ia');
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL pc_create_mkd_sku_store_date: %', end_time - start_time;

           start_time := clock_timestamp();
           call price_markdown_opt.pc_create_pcd_partitions(_strategy_id, 'price_markdown', 'tb_agg_ia');
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL pc_create_mkd_sku_store_date: %', end_time - start_time;

            start_time := clock_timestamp();
            call price_markdown_opt.pc_create_pcd_partitions(_strategy_id, 'price_markdown', 'tb_ssd_actual');
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL pc_create_mkd_sku_store_date_actuals: %', end_time - start_time;

            start_time := clock_timestamp();
           call price_markdown_opt.pc_create_pcd_partitions(_strategy_id, 'price_markdown', 'tb_agg_actual');
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL pc_create_mkd_agg_date_actuals: %', end_time - start_time;

            start_time := clock_timestamp();
            call price_markdown_opt.pc_get_sku_store_date_disc_resim(_strategy_id, _min_strategy_disc_id, _max_strategy_disc_id, _pcd_start_date, 'resim_temp');
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL pc_get_sku_store_date_disc_resim: %', end_time - start_time;

            start_time := clock_timestamp();
            call price_markdown_opt.pc_get_mkd_new_resim(_strategy_id, _min_week_start, _max_week_start, 'fin', 'resim_temp', _temp_table_ssd_fin);
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL pc_get_mkd_new_resim: %', end_time - start_time;

        else
            start_time := clock_timestamp();
            call price_markdown_opt.pc_get_sku_store_date_disc_exist_resim(_strategy_id, _min_strategy_disc_id, _max_strategy_disc_id, _pcd_start_date, _ssd_table_fin, 'resim_temp');
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL pc_get_sku_store_date_disc_exist_resim: %', end_time - start_time;

            start_time := clock_timestamp();
            call price_markdown_opt.pc_get_mkd_exist_resim(_strategy_id, _min_week_start, _max_week_start, 'resim_temp', _temp_table_ssd_fin);
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL pc_get_mkd_exist_resim: %', end_time - start_time;

            start_time := clock_timestamp();
            call price_markdown_opt.pc_delete_mkd_resim_fin(_temp_table_ssd_fin, _ssd_table_fin, _pcd_start_date);
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL pc_delete_mkd_resim_fin: %', end_time - start_time;

            start_time := clock_timestamp();
            call price_markdown_opt.pc_delete_mkd_resim_fin(_temp_table_ssd_fin, _agg_table_fin, _pcd_start_date);
            end_time := clock_timestamp();
            RAISE NOTICE 'Time taken SQL pc_delete_mkd_resim_fin: %', end_time - start_time;

        end if;

    END;
    $procedure$
;
