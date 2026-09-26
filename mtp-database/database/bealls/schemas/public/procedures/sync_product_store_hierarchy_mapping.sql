--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_product_season_time_attribute runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:sync_product_season_time_attribute
--comment: creating sp for sync_product_store_hierarchy_mapping

DROP PROCEDURE IF EXISTS public.sync_product_store_hierarchy_mapping();

CREATE OR REPLACE PROCEDURE public.sync_product_store_hierarchy_mapping(IN p_truncate boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_hierarchy_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

IF p_truncate THEN
    DELETE FROM global.product_store_hierarchy_mapping;
END IF;


-- 1. Create a Temporary Table to hold the "New State"
-- This avoids running the complex JOIN logic multiple times.
    create temp table current_sync_state on
commit drop as
    select
	distinct
        t1.l1_name,
	t1.l2_name,
	t2.s0_name,
	t2.climate,
	t2.store_code
from
	(
	select
		distinct
            paf.l1_name,
		paf.l2_name
	from
		global.product_attributes_filter paf
	join global.product_time_attributes
			using (product_code)
	where
		attribute_value = 'active'
		and current_date between start_time and end_time
      ) t1
cross join (
	select
		distinct
            s0_name,
		store_code,
		climate
	from
		global.store_attributes_filter saf
	where
		saf.active
		and not saf.is_deleted
		and special_classification != 'WHS'
      ) t2
where
	t1.l1_name is not null
	and t1.l2_name is not null
	and t2.s0_name is not null
	and t2.climate is not null
	and t2.store_code is not null;
-- 2. Remove records from the main table that are no longer in our "Current Sync State"
-- This handles the "Truncate irrelevant" part of your request.
    delete
from
	"global".product_store_hierarchy_mapping m
where
	not exists (
	select
		1
	from
		current_sync_state s
	where
		s.l1_name = m.l1_name
		and s.l2_name = m.l2_name
		and s.store_code = m.store_code
    );
-- 3. Insert only the NEW records that don't already exist in the main table
    insert
	into
	"global".product_store_hierarchy_mapping (
        l1_name,
	l2_name,
	s0_name,
	climate,
	store_code
    )
    select
	s.l1_name,
	s.l2_name,
	s.s0_name,
	s.climate,
	s.store_code
from
	current_sync_state s
where
	not exists (
	select
		1
	from
		"global".product_store_hierarchy_mapping m
	where
		m.l1_name = s.l1_name
		and m.l2_name = s.l2_name
		and m.store_code = s.store_code
    );
-- Temp table is automatically dropped at the end of the transaction/session
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;