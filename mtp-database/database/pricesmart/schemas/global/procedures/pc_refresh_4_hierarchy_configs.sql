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
				select 0 as hierarchy_level, l0_cid as hierarchy_value, l0_cuq as hierarchy_name from price_promo.product_master pm group by l0_cid, l0_cuq
				union all
				select 1 as hierarchy_level, l1_cid as hierarchy_value, l1_cuq as hierarchy_name from price_promo.product_master pm group by l1_cid, l1_cuq
				union all
				select 2 as hierarchy_level, l2_cid as hierarchy_value, l2_cuq as hierarchy_name from price_promo.product_master pm group by l2_cid, l2_cuq
				union all
				select 3 as hierarchy_level, l3_cid as hierarchy_value, l3_cuq as hierarchy_name from price_promo.product_master pm group by l3_cid, l3_cuq
				union all
				select 4 as hierarchy_level, l4_cid as hierarchy_value, l4_cuq as hierarchy_name from price_promo.product_master pm group by l4_cid, l4_cuq
				union all
				select 5 as hierarchy_level, l5_cid as hierarchy_value, l5_name as hierarchy_name from price_promo.product_master pm group by l5_cid, l5_name
				union all
				select -1 as hierarchy_level, brand_cid as hierarchy_value, brand as hierarchy_name from price_promo.product_master pm group by brand_cid, brand
				union all
				select -2 as hierarchy_level, id as hierarchy_value, lifecycle_indicator as hierarchy_name from global.tb_lifecycle_indicator_config tlic
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
		select 0 as hierarchy_level, 'Division' as hierarchy_level_name, l0_id as id, l0_cid as cid, l0_name as name, l0_cuq as cuq from price_promo.product_master pm group by 1,2,3,4,5,6
		union all
		select 1 as hierarchy_level, 'Group' as hierarchy_level_name, l1_id as id, l1_cid as cid, l1_name as name, l1_cuq as cuq from price_promo.product_master pm group by 1,2,3,4,5,6
		union all
		select 2 as hierarchy_level, 'Department' as hierarchy_level_name, l2_id as id, l2_cid as cid, l2_name as name, l2_cuq as cuq from price_promo.product_master pm group by 1,2,3,4,5,6
		union all
		select 3 as hierarchy_level, 'Class' as hierarchy_level_name, l3_id as id, l3_cid as cid, l3_name as name, l3_cuq as cuq from price_promo.product_master pm group by 1,2,3,4,5,6
		union all
		select 4 as hierarchy_level, 'Subclass' as hierarchy_level_name, l4_id as id, l4_cid as cid, l4_name as name, l4_cuq as cuq from price_promo.product_master pm group by 1,2,3,4,5,6
		union all
		select 5 as hierarchy_level, 'Parent' as hierarchy_level_name, l5_id as id, l5_cid as cid, l5_name as name, l5_cuq as cuq from price_promo.product_master pm group by 1,2,3,4,5,6
		union all
		select -1 as hierarchy_level, 'Brand' as hierarchy_level_name, mfg_no as id, brand_cid as cid, mfg_name as name, brand as cuq from price_promo.product_master pm group by 1,2,3,4,5,6
		union all
		select -2 as hierarchy_level, 'Lifecycle Indicator' as hierarchy_level_name, id::text as id , id as cid, lifecycle_indicator as name, lifecycle_indicator as cuq from global.tb_lifecycle_indicator_config tlic;



	-- tb_product_hierarchy_combination
	IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'price_promo' AND tablename = 'tb_product_hierarchy_combination') THEN
        TRUNCATE TABLE price_promo.tb_product_hierarchy_combination;
    END IF;
    INSERT INTO price_promo.tb_product_hierarchy_combination (
        l0_id, l0_cid, l0_cuq,
        l1_id, l1_cid, l1_cuq,
        l2_id, l2_cid, l2_cuq,
        l3_id, l3_cid, l3_cuq,
        l4_id, l4_cid, l4_cuq,
        mfg_no, brand_cid, mfg_name, brand
    )
    SELECT DISTINCT
        l0_id, l0_cid, l0_cuq,
        l1_id, l1_cid, l1_cuq,
        l2_id, l2_cid, l2_cuq,
        l3_id, l3_cid, l3_cuq,
        l4_id, l4_cid, l4_cuq,
        mfg_no, brand_cid, mfg_name, brand
    FROM
        price_promo.product_master;



    -- tb_product_hierarchy_lifecycle_combination
	INSERT INTO price_promo.tb_product_hierarchy_lifecycle_combination (
        l0_id, l0_cid, l0_cuq,
        l1_id, l1_cid, l1_cuq,
        l2_id, l2_cid, l2_cuq,
        l3_id, l3_cid, l3_cuq,
        l4_id, l4_cid, l4_cuq,
        mfg_no, brand_cid, mfg_name, brand,
        lifecycle_indicator_id, lifecycle_indicator
    )
    SELECT
	    pm.l0_id, pm.l0_cid, pm.l0_cuq,
	    pm.l1_id, pm.l1_cid, pm.l1_cuq,
	    pm.l2_id, pm.l2_cid, pm.l2_cuq,
	    pm.l3_id, pm.l3_cid, pm.l3_cuq,
	    pm.l4_id, pm.l4_cid, pm.l4_cuq,
	    pm.mfg_no, pm.brand_cid, pm.mfg_name, pm.brand,
	    pm.lifecycle_indicator_id, pm.lifecycle_indicator
	FROM (
	    select
	        l0_id, l0_cid, l0_cuq,
	        l1_id, l1_cid, l1_cuq,
	        l2_id, l2_cid, l2_cuq,
	        l3_id, l3_cid, l3_cuq,
	        l4_id, l4_cid, l4_cuq,
	        mfg_no, brand_cid, mfg_name, brand,
	        lic.lifecycle_indicator_id, lic.lifecycle_indicator
	    FROM price_promo.product_master pm
	    LEFT JOIN global.tb_parent_lifecycle_mapping lic ON pm.l5_id = lic.l5_id
	    group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21
	) pm
	FULL OUTER JOIN price_promo.tb_product_hierarchy_lifecycle_combination phlc
	    ON phlc.l0_cid = pm.l0_cid
	    AND phlc.l1_cid = pm.l1_cid
	    AND phlc.l2_cid = pm.l2_cid
	    AND phlc.l3_cid = pm.l3_cid
	    AND phlc.l4_cid = pm.l4_cid
	    AND phlc.brand_cid = pm.brand_cid
	    AND phlc.lifecycle_indicator_id = pm.lifecycle_indicator_id
	WHERE phlc.hierarchy_id IS NULL;



	--  tb_product_hierarchy_mapping
	IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'price_promo' AND table_name = 'tb_product_hierarchy_mapping') THEN
        TRUNCATE TABLE price_promo.tb_product_hierarchy_mapping;
    END IF;


	-- Insert new data into the table
	INSERT INTO price_promo.tb_product_hierarchy_mapping
	SELECT
	    pm.product_id, pm.l5_cuq, pm.l5_id, pm.l5_name, pl.hierarchy_id, pm.is_active
	FROM
	    price_promo.product_master pm
	LEFT JOIN
	    global.tb_parent_lifecycle_mapping lm
	    ON pm.product_id = lm.product_id
	LEFT JOIN
		price_promo.tb_product_hierarchy_lifecycle_combination pl
	    ON pl.l0_cid = pm.l0_cid
       	AND pl.l1_cid = pm.l1_cid
       	AND pl.l2_cid = pm.l2_cid
       	AND pl.l3_cid = pm.l3_cid
       	AND pl.l4_cid = pm.l4_cid
       	AND pl.brand_cid = pm.brand_cid
       	AND lm.lifecycle_indicator_id = pl.lifecycle_indicator_id;


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



