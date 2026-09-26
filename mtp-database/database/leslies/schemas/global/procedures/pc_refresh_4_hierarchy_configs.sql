--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:pc_refresh_4_hierarchy_configs_8 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: pc_change_2 for pc_refresh_4_hierarchy_configs_8

DROP PROCEDURE IF EXISTS global.pc_refresh_4_hierarchy_configs;

CREATE OR REPLACE PROCEDURE global.pc_refresh_4_hierarchy_configs()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.pc_refresh_4_hierarchy_configs';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	-- hierarchy cid mapping

	IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'global' AND tablename = 'tb_hierarchy_cid_mapping') THEN
        TRUNCATE TABLE global.tb_hierarchy_cid_mapping;
    END IF;

	with hierarchy_map_cte as(
		select
			hierarchy_level,
			hierarchy_value,
			hierarchy_name
		from
			(
				select distinct 0 as hierarchy_level, l0_cid as hierarchy_value, l0_cuq as hierarchy_name from price_promo.product_master pm  where l0_cid is not null
				union all
				select distinct 1 as hierarchy_level, l1_cid as hierarchy_value, l1_cuq as hierarchy_name from price_promo.product_master pm  where l1_cid is not null
				union all
				select distinct 2 as hierarchy_level, l2_cid as hierarchy_value, l2_cuq as hierarchy_name from price_promo.product_master pm  where l2_cid is not null
				union all
				select distinct 3 as hierarchy_level, l3_cid as hierarchy_value, l3_cuq as hierarchy_name from price_promo.product_master pm  where l3_cid is not null
				union all
				select distinct -3 as hierarchy_level, manufacturer_id as hierarchy_value, manufacturer_name as hierarchy_name from price_promo.product_master pm where manufacturer_id is not null
                union all
                select distinct -4 as hierarchy_level, product_status_cid as hierarchy_value, product_status as hierarchy_name from price_promo.product_master pm where product_status_cid is not null
                union all
                select distinct -5 as hierarchy_level, map_flag as hierarchy_value, map_flag::text as hierarchy_name from price_promo.product_master pm where map_flag is not null
				union all
				select distinct -6 as hierarchy_level, clearance_cid as hierarchy_value, clearance as hierarchy_name from price_promo.product_master where clearance_cid is not null
                union all
                select distinct -7 as hierarchy_level, kvc_store_res_id as hierarchy_value, kvc_store_res as hierarchy_name from price_promo.product_master pm  where kvc_store_res_id is not null
                union all
                select distinct -8 as hierarchy_level, kvi_store_res_id as hierarchy_value, kvi_store_res as hierarchy_name from price_promo.product_master pm  where kvi_store_res_id is not null
                union all
                select distinct -9 as hierarchy_level, kvc_les_res_id as hierarchy_value, kvc_les_res as hierarchy_name from price_promo.product_master pm  where kvc_les_res_id is not null
                union all
                select distinct -10 as hierarchy_level, kvi_les_res_id as hierarchy_value, kvi_les_res as hierarchy_name from price_promo.product_master pm  where kvi_les_res_id is not null
                union all
                select distinct -11 as hierarchy_level, kvc_its_res_id as hierarchy_value, kvc_its_res as hierarchy_name from price_promo.product_master pm  where kvc_its_res_id is not null
                union all
                select distinct -12 as hierarchy_level, kvi_its_res_id as hierarchy_value, kvi_its_res as hierarchy_name from price_promo.product_master pm  where kvi_its_res_id is not null
                union all 
                select distinct -13 as hierarchy_level, kvc_com_com_id as hierarchy_value, kvc_com_com as hierarchy_name from price_promo.product_master pm  where kvc_com_com_id is not null
                union all
                select distinct -14 as hierarchy_level, kvi_com_com_id as hierarchy_value, kvi_com_com as hierarchy_name from price_promo.product_master pm  where kvi_com_com_id is not null
			)dd
	)
	insert
		into global.tb_hierarchy_cid_mapping(hierarchy_level, hierarchy_value, hierarchy_name)
	select
		hierarchy_level,
		hierarchy_value,
		hierarchy_name
	from
		hierarchy_map_cte;



	-- tb_hierarchy_level_config

	IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'global' AND tablename = 'tb_hierarchy_level_config') THEN
        TRUNCATE TABLE global.tb_hierarchy_level_config;
    END IF;


	insert into global.tb_hierarchy_level_config
		select distinct 0 as hierarchy_level, 'Department' as hierarchy_level_name, l0_id as id, l0_cid as cid, l0_name as name, l0_cuq as cuq from price_promo.product_master pm  where l0_cid is not null
		union all
		select distinct 1 as hierarchy_level, 'Sub Department' as hierarchy_level_name, l1_id as id, l1_cid as cid, l1_name as name, l1_cuq as cuq from price_promo.product_master pm  where l1_cid is not null
		union all
		select distinct 2 as hierarchy_level, 'Class' as hierarchy_level_name, l2_id as id, l2_cid as cid, l2_name as name, l2_cuq as cuq from price_promo.product_master pm  where l2_cid is not null
		union all
		select distinct 3 as hierarchy_level, 'Sub Class' as hierarchy_level_name, l3_id as id, l3_cid as cid, l3_name as name, l3_cuq as cuq from price_promo.product_master pm  where l3_cid is not null
		union all
        select distinct -3 as hierarchy_level, 'Manufacturer' as hierarchy_level_name, manufacturer_id::text as id, manufacturer_id as cid, manufacturer_name as name, manufacturer_name as cuq from price_promo.product_master pm where manufacturer_id is not null
        union all
        select distinct -4 as hierarchy_level, 'Status Code' as hierarchy_level_name, product_status_cid::text as id, product_status_cid as cid, product_status as name, product_status as cuq from price_promo.product_master pm where product_status_cid is not null
        union all
        select distinct -5 as hierarchy_level, 'Map Flag' as hierarchy_level_name, map_flag::text as id, map_flag as cid, map_flag::text as name, map_flag::text as cuq from price_promo.product_master pm where map_flag is not null
        union all
        select distinct -6 as hierarchy_level, 'Clearance Flag' as hierarchy_level_name, clearance_cid::text as id, clearance_cid as cid, clearance as name, clearance as cuq from price_promo.product_master pm where clearance_cid is not null
        union all
        select distinct -7 as hierarchy_level, 'KVC - Residential x Store' as hierarchy_level_name, kvc_store_res_id::text as id, kvc_store_res_id as cid, kvc_store_res as name, kvc_store_res as cuq from price_promo.product_master pm where kvc_store_res_id is not null
        union all
        select distinct -8 as hierarchy_level, 'KVI - Residential x Store' as hierarchy_level_name, kvi_store_res_id::text as id, kvi_store_res_id as cid, kvi_store_res as name, kvi_store_res as cuq from price_promo.product_master pm where kvi_store_res_id is not null
        union all
        select distinct -9 as hierarchy_level, 'KVC - Residential x Lesliespool.com' as hierarchy_level_name, kvc_les_res_id::text as id, kvc_les_res_id as cid, kvc_les_res as name, kvc_les_res as cuq from price_promo.product_master pm where kvc_les_res_id is not null
        union all
        select distinct -10 as hierarchy_level, 'KVI - Residential x Lesliespool.com' as hierarchy_level_name, kvi_les_res_id::text as id, kvi_les_res_id as cid, kvi_les_res as name, kvi_les_res as cuq from price_promo.product_master pm where kvi_les_res_id is not null
        union all
        select distinct -11 as hierarchy_level, 'KVC - Residential x ITS' as hierarchy_level_name, kvc_its_res_id::text as id, kvc_its_res_id as cid, kvc_its_res as name, kvc_its_res as cuq from price_promo.product_master pm where kvc_its_res_id is not null
        union all
        select distinct -12 as hierarchy_level, 'KVI - Residential x ITS' as hierarchy_level_name, kvi_its_res_id::text as id, kvi_its_res_id as cid, kvi_its_res as name, kvi_its_res as cuq from price_promo.product_master pm where kvi_its_res_id is not null
        union all
        select distinct -13 as hierarchy_level, 'KVC - Commercial' as hierarchy_level_name, kvc_com_com_id::text as id, kvc_com_com_id as cid, kvc_com_com as name, kvc_com_com as cuq from price_promo.product_master pm where kvc_com_com_id is not null
        union all
        select distinct -14 as hierarchy_level, 'KVI - Commercial' as hierarchy_level_name, kvi_com_com_id::text as id, kvi_com_com_id as cid, kvi_com_com as name, kvi_com_com as cuq from price_promo.product_master pm where kvi_com_com_id is not null;



	-- tb_product_hierarchy_combination
	IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'price_promo' AND tablename = 'tb_product_hierarchy_combination') THEN
        TRUNCATE TABLE price_promo.tb_product_hierarchy_combination;
    END IF;
    INSERT INTO price_promo.tb_product_hierarchy_combination (
        l0_id, l0_cid, l0_cuq,
        l1_id, l1_cid, l1_cuq,
        l2_id, l2_cid, l2_cuq,
        l3_id, l3_cid, l3_cuq,
        manufacturer_id, manufacturer_name,
        product_status_cid,product_status,
        map_flag,
        clearance_cid, clearance,
        kvc_store_res_id, kvc_store_res,
        kvi_store_res_id, kvi_store_res,
        kvc_les_res_id, kvc_les_res,
        kvi_les_res_id, kvi_les_res,
        kvc_its_res_id, kvc_its_res,
        kvi_its_res_id, kvi_its_res,
        kvc_com_com_id, kvc_com_com,
        kvi_com_com_id, kvi_com_com,
        product_id, product_name
    )
    SELECT DISTINCT
        l0_id, l0_cid, l0_cuq,
        l1_id, l1_cid, l1_cuq,
        l2_id, l2_cid, l2_cuq,
        l3_id, l3_cid, l3_cuq,
        manufacturer_id, manufacturer_name,
        product_status_cid, product_status,
        map_flag,
        clearance_cid, clearance,
        kvc_store_res_id, kvc_store_res,
        kvi_store_res_id, kvi_store_res,
        kvc_les_res_id, kvc_les_res,
        kvi_les_res_id, kvi_les_res,
        kvc_its_res_id, kvc_its_res,
        kvi_its_res_id, kvi_its_res,
        kvc_com_com_id, kvc_com_com,
        kvi_com_com_id, kvi_com_com,
        product_id, product_name
    FROM
        price_promo.product_master;



    -- tb_product_hierarchy_lifecycle_combination
	INSERT INTO price_promo.tb_product_hierarchy_lifecycle_combination (
        l0_id, l0_cid, l0_cuq,
        l1_id, l1_cid, l1_cuq,
        l2_id, l2_cid, l2_cuq,
        l3_id, l3_cid, l3_cuq,
        manufacturer_id, manufacturer_name,
        product_status_cid,product_status,
        map_flag,
        clearance_cid, clearance,
        kvc_store_res_id, kvc_store_res,
        kvi_store_res_id, kvi_store_res,
        kvc_les_res_id, kvc_les_res,
        kvi_les_res_id, kvi_les_res,
        kvc_its_res_id, kvc_its_res,
        kvi_its_res_id, kvi_its_res,
        kvc_com_com_id, kvc_com_com,
        kvi_com_com_id, kvi_com_com,
        product_id, product_name
    )
    SELECT DISTINCT
        pm.l0_id, pm.l0_cid, pm.l0_cuq,
        pm.l1_id, pm.l1_cid, pm.l1_cuq,
        pm.l2_id, pm.l2_cid, pm.l2_cuq,
        pm.l3_id, pm.l3_cid, pm.l3_cuq,
        pm.manufacturer_id, pm.manufacturer_name,
        pm.product_status_cid, pm.product_status,
        pm.map_flag,
        pm.clearance_cid, pm.clearance,
        pm.kvc_store_res_id, pm.kvc_store_res,
        pm.kvi_store_res_id, pm.kvi_store_res,
        pm.kvc_les_res_id, pm.kvc_les_res,
        pm.kvi_les_res_id, pm.kvi_les_res,
        pm.kvc_its_res_id, pm.kvc_its_res,
        pm.kvi_its_res_id, pm.kvi_its_res,
        pm.kvc_com_com_id, pm.kvc_com_com,
        pm.kvi_com_com_id, pm.kvi_com_com,
        pm.product_id, pm.product_name
    FROM
        price_promo.product_master pm
	left join price_promo.tb_product_hierarchy_lifecycle_combination phlc
        on phlc.product_id = pm.product_id
	WHERE phlc.hierarchy_id IS NULL;



	--  tb_product_hierarchy_mapping
	IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'price_promo' AND table_name = 'tb_product_hierarchy_mapping') THEN
        TRUNCATE TABLE price_promo.tb_product_hierarchy_mapping;
    END IF;


	-- Insert new data into the table
	INSERT INTO price_promo.tb_product_hierarchy_mapping
        (product_id, hierarchy_id, is_active)
	SELECT
	    pm.product_id, phlc.hierarchy_id, pm.is_active
	FROM
	    price_promo.product_master pm
	LEFT JOIN
		price_promo.tb_product_hierarchy_lifecycle_combination phlc
    ON 
        phlc.product_id = pm.product_id;

    insert into price_promo.tb_store_hierarchy_combination
    (
        s0_id,s0_name,
        s1_id,s1_name,
        s2_id,s2_name,
        s3_id,s3_name,
        s4_id,s4_name,
        s5_id,s5_name,
        market_id,market_name,
        is_active,
        store_id,store_name
    )
    select 
        sm.s0_id,sm.s0_name,
        sm.s1_id,sm.s1_name,
        sm.s2_id,sm.s2_name,
        sm.s3_id,sm.s3_name,
        sm.s4_id,sm.s4_name,
        sm.s5_id,sm.s5_name,
        sm.market_id,sm.market_name,
        sm.is_active,
        sm.store_id,sm.store_name
    from global.tb_store_master sm
    left join price_promo.tb_store_hierarchy_combination shc
    on sm.store_id = shc.store_id
    where shc.hierarchy_id is null;
    
    --  tb_store_hierarchy_mapping
	IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'price_promo' AND table_name = 'tb_store_hierarchy_mapping') THEN
        TRUNCATE TABLE price_promo.tb_store_hierarchy_mapping;
    END IF;

    -- Insert new data into the table
	INSERT INTO price_promo.tb_store_hierarchy_mapping
        (store_id, store_code, hierarchy_id, is_active)
	SELECT
	    sm.store_id, sm.store_code, tshc.hierarchy_id, sm.is_active
	FROM
	    global.tb_store_master sm
	LEFT JOIN
		price_promo.tb_store_hierarchy_combination tshc
    ON 
        tshc.store_id = sm.store_id;

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



