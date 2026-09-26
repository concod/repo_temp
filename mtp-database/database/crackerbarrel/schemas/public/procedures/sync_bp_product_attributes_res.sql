--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:hardcoded datytype as sync_bp_product_attributes_res_1 runOnChange:true stripComments:false splitStatements:false context:Release_3 labels:CI-137
--comment: hardcoded datytype as sync_bp_product_attributes_res_1

DROP PROCEDURE IF EXISTS public.sync_bp_product_attributes_res();

CREATE OR REPLACE PROCEDURE public.sync_bp_product_attributes_res()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
        declare
        _log_code varchar := gen_random_uuid();
        _sp_name varchar := 'public.sync_bp_product_attributes_res';
        _log_step varchar;
        _st TIMESTAMP := clock_timestamp();
BEGIN
        call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
        perform set_config('local.log_code', _log_code, true);
        perform set_config('local.sp_name', _sp_name, true);
        begin
    TRUNCATE TABLE base_pricing_restaurant.bp_product_attributes CASCADE;

    INSERT INTO base_pricing_restaurant.bp_product_attributes
    (
        product_id,
        base_cost,
        residential_price,
        "size",
        uom,
        active,
        line_group,
        size_family,
        size_class,
        brand_family,
        brand_class,
        pre_price,
        addsub,
        catering_flag,
        guest_proxy_cnt,
        beverage_incidence_proxy_cnt,
        prior_pos_id,
        major_group_master_number,
        family_group_master_number,
        derived_size,
        derived_uom,
        is_usable,
        custom_family_1,
        custom_class_1,
        menu_item_id,
       product_code
    )
    SELECT
        product_id,
        base_cost,
        residential_price,
        "size",
        uom,
        active,
        line_group,
        size_family,
        size_class,
        brand_family,
        brand_class,
        pre_price,
        addsub,
        catering_flag,
        guest_proxy_cnt,
        beverage_incidence_proxy_cnt,
        prior_pos_id,
        major_group_master_number,
        family_group_master_number,
        derived_size,
        derived_uom,
        is_usable,
        custom_family_1,
        custom_class_1,
        menu_item_id,
        product_code
    FROM public.bp_product_attributes_res
    GROUP BY
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
        21, 22, 23, 24,25,26;
                call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
        exception
                when others then
                -- Log the error if an exception occurs during any part of the procedure
                call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
        end;
END;
$procedure$
;
