--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:pc_refresh_4_hierarchy_configs_9 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: pc_change_2 for pc_refresh_4_hierarchy_configs_9

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
				select distinct 0 as hierarchy_level, l0_cid as hierarchy_value, l0_cuq as hierarchy_name from price_promo.product_master pm
				union all
				select distinct 1 as hierarchy_level, l1_cid as hierarchy_value, l1_cuq as hierarchy_name from price_promo.product_master pm
				union all
				select distinct 2 as hierarchy_level, l2_cid as hierarchy_value, l2_cuq as hierarchy_name from price_promo.product_master pm
				union all
				select distinct 3 as hierarchy_level, l3_cid as hierarchy_value, l3_cuq as hierarchy_name from price_promo.product_master pm
				union all
				select distinct 4 as hierarchy_level, l4_cid as hierarchy_value, l4_cuq as hierarchy_name from price_promo.product_master pm
				union all
				select distinct 5 as hierarchy_level, l5_cid as hierarchy_value, l5_cuq as hierarchy_name from price_promo.product_master pm
                union all
                select distinct 6 as hierarchy_level,  l6_cid as hierarchy_value, l6_cuq as hierarchy_name from price_promo.product_master pm
                union all
                select distinct -1 as hierarchy_level, realism_id as hierarchy_value, realism as hierarchy_name from price_promo.product_master pm
                union all
                select distinct -2 as hierarchy_level, size_id as hierarchy_value, size as hierarchy_name from price_promo.product_master pm
                union all
                select distinct -3 as hierarchy_level, light_type_id as hierarchy_value, light_type as hierarchy_name from price_promo.product_master pm
                union all
                select distinct -4 as hierarchy_level, derived_status_id as hierarchy_value, derived_status as hierarchy_name from price_promo.product_master pm
			) dd
	)
	insert
		into global.tb_hierarchy_cid_mapping(hierarchy_level, hierarchy_value, hierarchy_name)
	select
		hierarchy_level,
		hierarchy_value,
		hierarchy_name
	from
		hierarchy_map_cte
	where hierarchy_name is not null;



	-- tb_hierarchy_level_config

	IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'global' AND tablename = 'tb_hierarchy_level_config') THEN
        TRUNCATE TABLE global.tb_hierarchy_level_config;
    END IF;


	insert into global.tb_hierarchy_level_config
		select distinct 0 as hierarchy_level, 'Brand' as hierarchy_level_name, l0_id::text as id, l0_cid as cid, l0_name as name, l0_cuq as cuq from price_promo.product_master pm
		union all
		select distinct 1 as hierarchy_level, 'Department' as hierarchy_level_name, l1_id::text as id, l1_cid as cid, l1_name as name, l1_cuq as cuq from price_promo.product_master pm
		union all
		select distinct 2 as hierarchy_level, 'Sub Department' as hierarchy_level_name, l2_id::text as id, l2_cid as cid, l2_name as name, l2_cuq as cuq from price_promo.product_master pm
		union all
		select distinct 3 as hierarchy_level, 'Class' as hierarchy_level_name, l3_id::text as id, l3_cid as cid, l3_name as name, l3_cuq as cuq from price_promo.product_master pm
		union all
		select distinct 4 as hierarchy_level, 'Family' as hierarchy_level_name, l4_id::text as id, l4_cid as cid, l4_name as name, l4_cuq as cuq from price_promo.product_master pm
		union all
		select distinct 5 as hierarchy_level, 'Parent' as hierarchy_level_name, l5_id::text as id, l5_cid as cid, l5_name as name, l5_cuq as cuq from price_promo.product_master pm
		union all
        select distinct 6 as hierarchy_level, 'SKU' as hierarchy_level_name, l6_id::text as id, l6_cid as cid, l6_name as name, l6_cuq as cuq from price_promo.product_master pm
        union all
        select distinct -1 as hierarchy_level, 'Realism' as hierarchy_level_name, realism_id::text as id, realism_id as cid, realism as name, realism as cuq from price_promo.product_master pm
        union all
        select distinct -2 as hierarchy_level, 'Size' as hierarchy_level_name, size_id::text as id, size_id as cid, size as name, size as cuq from price_promo.product_master pm
        union all
        select distinct -3 as hierarchy_level, 'Light Type' as hierarchy_level_name, light_type_id::text as id, light_type_id as cid, light_type as name, light_type as cuq from price_promo.product_master pm
        union all
        select distinct -4 as hierarchy_level, 'Status' as hierarchy_level_name, derived_status_id::text as id, derived_status_id as cid, derived_status as name, derived_status as cuq from price_promo.product_master pm
    ;


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
        l5_id, l5_cid, l5_cuq,
        derived_status_id, derived_status_cid, derived_status,
        realism_id, realism_cid, realism,
        size_id, size_cid, size,
        light_type_id, light_type_cid, light_type
    )
    SELECT DISTINCT
        l0_id, l0_cid, l0_cuq,
        l1_id, l1_cid, l1_cuq,
        l2_id, l2_cid, l2_cuq,
        l3_id, l3_cid, l3_cuq,
        l4_id, l4_cid, l4_cuq,
        l5_id, l5_cid, l5_cuq,
        derived_status_id, derived_status_id, derived_status,
        realism_id, realism_id, realism,
        size_id, size_id, size,
        light_type_id, light_type_id, light_type
    FROM
        price_promo.product_master;



    -- tb_product_hierarchy_lifecycle_combination
	INSERT INTO price_promo.tb_product_hierarchy_lifecycle_combination (
        l0_id, l0_cid, l0_cuq,
        l1_id, l1_cid, l1_cuq,
        l2_id, l2_cid, l2_cuq,
        l3_id, l3_cid, l3_cuq,
        l4_id, l4_cid, l4_cuq,
        l5_id, l5_cid, l5_cuq,
        derived_status_id, derived_status_cid, derived_status,
        realism_id, realism_cid, realism,
        size_id, size_cid, size,
        light_type_id, light_type_cid, light_type
    )
    SELECT
	    pm.l0_id, pm.l0_cid, pm.l0_cuq,
	    pm.l1_id, pm.l1_cid, pm.l1_cuq,
	    pm.l2_id, pm.l2_cid, pm.l2_cuq,
	    pm.l3_id, pm.l3_cid, pm.l3_cuq,
	    pm.l4_id, pm.l4_cid, pm.l4_cuq,
	    pm.l5_id, pm.l5_cid, pm.l5_cuq,
	    pm.derived_status_id, pm.derived_status_id, pm.derived_status,
	    pm.realism_id, pm.realism_id, pm.realism,
	    pm.size_id, pm.size_id, pm.size,
	    pm.light_type_id, pm.light_type_id, pm.light_type
	FROM (
	    select
            distinct
	        l0_id, l0_cid, l0_cuq,
	        l1_id, l1_cid, l1_cuq,
	        l2_id, l2_cid, l2_cuq,
	        l3_id, l3_cid, l3_cuq,
	        l4_id, l4_cid, l4_cuq,
	        l5_id, l5_cid, l5_cuq,
	        derived_status_id, derived_status,
	        realism_id, realism,
	        size_id, size,
	        light_type_id, light_type
	    FROM price_promo.product_master pm
	) pm
	left JOIN price_promo.tb_product_hierarchy_lifecycle_combination phlc
	    ON phlc.l0_cid is not distinct from pm.l0_cid
	    AND phlc.l1_cid is not distinct from pm.l1_cid
	    AND phlc.l2_cid is not distinct from pm.l2_cid
	    AND phlc.l3_cid is not distinct from pm.l3_cid
	    AND phlc.l4_cid is not distinct from pm.l4_cid
	    AND phlc.l5_cid is not distinct from pm.l5_cid
        and phlc.derived_status_id is not distinct from pm.derived_status_id
        and phlc.realism_id is not distinct from pm.realism_id
        and phlc.size_id is not distinct from pm.size_id
        and phlc.light_type_id is not distinct from pm.light_type_id
	WHERE phlc.hierarchy_id IS NULL;



	--  tb_product_hierarchy_mapping
	IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'price_promo' AND table_name = 'tb_product_hierarchy_mapping') THEN
        TRUNCATE TABLE price_promo.tb_product_hierarchy_mapping;
    END IF;


	-- Insert new data into the table
	INSERT INTO price_promo.tb_product_hierarchy_mapping
    (product_id, hierarchy_id, is_active)
	SELECT
	    pm.product_id, pl.hierarchy_id, pm.is_active
	FROM
	    price_promo.product_master pm
	LEFT JOIN
		price_promo.tb_product_hierarchy_lifecycle_combination pl
	    ON pl.l0_cid is not distinct from pm.l0_cid
       	AND pl.l1_cid is not distinct from pm.l1_cid
       	AND pl.l2_cid is not distinct from pm.l2_cid
       	AND pl.l3_cid is not distinct from pm.l3_cid
       	AND pl.l4_cid is not distinct from pm.l4_cid
        and pl.l5_cid is not distinct from pm.l5_cid
        and pl.derived_status_id is not distinct from pm.derived_status_id
        and pl.realism_id is not distinct from pm.realism_id
        and pl.size_id is not distinct from pm.size_id
        and pl.light_type_id is not distinct from pm.light_type_id;
    
    insert into price_promo.tb_store_hierarchy_combination
    (s0_id, s0_name, s1_id, s1_name, s2_id, s2_name, s3_id, s3_name, s4_id, s4_name, s5_id, s5_name)
    select distinct 
    sm.s0_id, sm.s0_name, sm.s1_id, sm.s1_name, sm.s2_id, sm.s2_name, sm.s3_id, sm.s3_name, sm.s4_id, sm.s4_name, sm.s5_id, sm.s5_name
    from pricesmart.tb_store_master sm
    left join price_promo.tb_store_hierarchy_combination shc
    on shc.s0_id is not distinct from sm.s0_id
    and shc.s1_id is not distinct from sm.s1_id
    and shc.s2_id is not distinct from sm.s2_id
    and shc.s3_id is not distinct from sm.s3_id
    and shc.s4_id is not distinct from sm.s4_id
    and shc.s5_id is not distinct from sm.s5_id
    where shc.hierarchy_id is null;

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
