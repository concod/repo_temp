--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:pc_refresh_3_store_data_5 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: pc_change_4 for pc_refresh_3_store_data_5

DROP PROCEDURE IF EXISTS global.pc_refresh_3_store_data;

CREATE OR REPLACE PROCEDURE global.pc_refresh_3_store_data()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.pc_refresh_3_store_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_promo_id integer;
	_all_stores_promo_ids integer[];
	_bnm_or_ecom_promo_ids integer[];
	all_active_stores_count integer;
	promo_store_hierarchy_record record;
	new_stores integer[];
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	-- All stores selection type promos.
	select
		array_agg(promo_id) into _all_stores_promo_ids
	from
		price_promo.promo_master pm
	where
		pm.store_selection_type = (select id from price_promo.store_selection_type_config sstc where sstc.store_selection_type = 'all_stores');
	raise notice '_all_stores_promo_ids : %', _all_stores_promo_ids;

--	_all_stores_promo_ids = array[61];
	if array_length(_all_stores_promo_ids, 1) > 0 then
		foreach _promo_id in array _all_stores_promo_ids loop
			select
				count(store_id) into all_active_stores_count
			from
				global.tb_store_master tsm
			where
				tsm.is_active = 1;
			update price_promo.promo_master set stores_count = all_active_stores_count where promo_id = _promo_id;
		end loop;
	end if;

	-- Pre Compute store hierarchy.
	IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'tb_store_hierarchy_agg_data') THEN
        TRUNCATE TABLE tb_store_hierarchy_agg_data;
    ELSE
    	CREATE TEMP TABLE tb_store_hierarchy_agg_data (
		    promo_id integer,
		    s0_ids integer[],
		    s1_ids integer[],
		    s2_ids integer[],
		    s3_ids integer[],
		    s4_ids integer[],
		    s5_ids integer[],
			market_ids integer[],
			store_ids integer[],
			active_flag integer[]
		);
    END IF;

   	-- Insert aggrigated store hierarchy.
	WITH hierarchy_data AS (
		SELECT tph.promo_id,
		    CASE
		        WHEN tph.hierarchy_level_id = 0 THEN tph.hierarchy_value_id
		        ELSE NULL::integer
		    END AS s0_ids,
		    CASE
		        WHEN tph.hierarchy_level_id = 1 THEN tph.hierarchy_value_id
		        ELSE NULL::integer
		    END AS s1_ids,
		    CASE
		        WHEN tph.hierarchy_level_id = 2 THEN tph.hierarchy_value_id
		        ELSE NULL::integer
		    END AS s2_ids,
		    CASE
		        WHEN tph.hierarchy_level_id = 3 THEN tph.hierarchy_value_id
		        ELSE NULL::integer
		    END AS s3_ids,
		    CASE
		        WHEN tph.hierarchy_level_id = 4 THEN tph.hierarchy_value_id
		        ELSE NULL::integer
		    END AS s4_ids,
		    CASE
		        WHEN tph.hierarchy_level_id = 5 THEN tph.hierarchy_value_id
		        ELSE NULL::integer
		    END AS s5_ids,
			CASE
		        WHEN tph.hierarchy_level_id = 6 THEN tph.hierarchy_value_id
		        ELSE NULL::integer
		    END AS market_ids,
			CASE
		        WHEN tph.hierarchy_level_id = 7 THEN tph.hierarchy_value_id
		        ELSE NULL::integer
		    END AS store_ids,
			CASE
		        WHEN tph.hierarchy_level_id = 8 THEN tph.hierarchy_value_id
		        ELSE NULL::integer
		    END AS active_flag
		FROM
			price_promo.promo_store_hierarchy tph
		GROUP BY
			tph.promo_id, tph.hierarchy_level_id, tph.hierarchy_value_id
	),
	hierarchy_agg_data AS (
		SELECT hierarchy_data.promo_id,
		    array_agg(DISTINCT hierarchy_data.s0_ids) FILTER (WHERE hierarchy_data.s0_ids IS NOT NULL) AS s0_ids,
		    array_agg(DISTINCT hierarchy_data.s1_ids) FILTER (WHERE hierarchy_data.s1_ids IS NOT NULL) AS s1_ids,
		    array_agg(DISTINCT hierarchy_data.s2_ids) FILTER (WHERE hierarchy_data.s2_ids IS NOT NULL) AS s2_ids,
		    array_agg(DISTINCT hierarchy_data.s3_ids) FILTER (WHERE hierarchy_data.s3_ids IS NOT NULL) AS s3_ids,
		    array_agg(DISTINCT hierarchy_data.s4_ids) FILTER (WHERE hierarchy_data.s4_ids IS NOT NULL) AS s4_ids,
		    array_agg(DISTINCT hierarchy_data.s5_ids) FILTER (WHERE hierarchy_data.s5_ids IS NOT NULL) AS s5_ids,
			array_agg(DISTINCT hierarchy_data.market_ids) FILTER (WHERE hierarchy_data.market_ids IS NOT NULL) AS market_ids,
			array_agg(DISTINCT hierarchy_data.store_ids) FILTER (WHERE hierarchy_data.store_ids IS NOT NULL) AS store_ids,
			array_agg(DISTINCT hierarchy_data.active_flag) FILTER (WHERE hierarchy_data.active_flag IS NOT NULL) AS active_flag
		FROM
			hierarchy_data
		GROUP BY
			hierarchy_data.promo_id
	)
	INSERT INTO tb_store_hierarchy_agg_data (
		promo_id, 
		s0_ids, 
		s1_ids, 
		s2_ids, 
		s3_ids, 
		s4_ids, 
		s5_ids,
		market_ids,
		store_ids,
		active_flag
	)
	SELECT
		hierarchy_agg_data.promo_id,
		hierarchy_agg_data.s0_ids,
	    hierarchy_agg_data.s1_ids,
	    hierarchy_agg_data.s2_ids,
	    hierarchy_agg_data.s3_ids,
	    hierarchy_agg_data.s4_ids,
	    hierarchy_agg_data.s5_ids,
		hierarchy_agg_data.market_ids,
		hierarchy_agg_data.store_ids,
		hierarchy_agg_data.active_flag
	FROM
		hierarchy_agg_data;

	-- All bnm or ecom selection type promos.
	select
		array_agg(promo_id) into _bnm_or_ecom_promo_ids
	from
		price_promo.promo_master pm
	where
		pm.store_selection_type in (select id from price_promo.store_selection_type_config sstc where sstc.store_selection_type in('bnm_stores', 'ecom_stores'));
	raise notice '_bnm_or_ecom_promo_ids : %', _bnm_or_ecom_promo_ids;

	--_bnm_or_ecom_promo_ids = array[202];
	if array_length(_bnm_or_ecom_promo_ids, 1) > 0 then
		foreach _promo_id in array _bnm_or_ecom_promo_ids loop
			SELECT
		        promo_id, 
				s0_ids, 
				s1_ids, 
				s2_ids, 
				s3_ids, 
				s4_ids, 
				s5_ids,
				market_ids,
				store_ids,
				active_flag
		    INTO
		   		promo_store_hierarchy_record
		    FROM
		        tb_store_hierarchy_agg_data
		    WHERE
		        promo_id = _promo_id;
		    new_stores = null::integer[];
			new_stores = global.fn_fetch_store_ids_by_hierarchy(
				promo_store_hierarchy_record.s0_ids, 
				promo_store_hierarchy_record.s1_ids, 
				promo_store_hierarchy_record.s2_ids, 
				promo_store_hierarchy_record.s3_ids, 
				promo_store_hierarchy_record.s4_ids, 
				promo_store_hierarchy_record.s5_ids,
				promo_store_hierarchy_record.market_ids,
				promo_store_hierarchy_record.store_ids,
				promo_store_hierarchy_record.active_flag
			);
			raise notice '_bnm_or_ecom_promo_id : %,  new_stores: %', _promo_id, new_stores;
			perform global.fn_refresh_promo_stores(_promo_id, new_stores);
		end loop;
	end if;


	DROP TABLE IF EXISTS tb_store_hierarchy_agg_data;
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

