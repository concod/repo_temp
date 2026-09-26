--liquibase formatted sql
--changeset ashish@impactanalytics.co:generate_rcl_week_level_constraint_data runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:generate_rcl_week_level_constraint_data
--comment: initial changeset generate_rcl_week_level_constraint_data 

DROP PROCEDURE IF EXISTS public.generate_rcl_l01_constraint_data(_version int, _l0 text, _l1 text, _rcl_codes int[]);
CREATE OR REPLACE PROCEDURE public.generate_rcl_l01_constraint_data(IN _version integer, IN _l0 text, IN _l1 text, IN _rcl_codes integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.generate_rcl_l01_constraint_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_rcl_code int;
	_uuid text;
	_sql text;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	_uuid := md5(_l0 || '-' || _l1);
	execute 'CREATE TEMP TABLE "constraint_rcl_' || _uuid || '" (
		rcl_code int4 NOT NULL,
		rule_code int4 NOT NULL,
		psa_code varchar NOT NULL,
		product_codes _varchar NULL,
		wos float4 NULL,
		transit_time float4 NULL,
		safety_stock float4 NULL,
		min_stock float4 NULL,
		max_stock float4 NULL,
		min_distribution varchar NULL,
		aps float4 NULL,
		ros float4 NULL,
		st float4 NULL,
		store_codes _varchar NULL
	) ON COMMIT DROP;';
	execute 'CREATE TEMP TABLE "constraint_rcl_exec_' || _uuid || '" (
		rcl_code int4 NOT NULL,
		rule_code int4 NOT NULL,
		product_codes _varchar NULL,
		wos float4 NULL,
		transit_time float4 NULL,
		safety_stock float4 NULL,
		min_stock float4 NULL,
		max_stock float4 NULL,
		min_distribution varchar NULL,
		aps float4 NULL,
		ros float4 NULL,
		st float4 NULL,
		store_code varchar NULL
	) ON COMMIT DROP;';
	FOREACH _rcl_code in array _rcl_codes loop
		execute 'CREATE TEMP TABLE IF NOT EXISTS "psaf_' || _uuid || '" ON COMMIT DROP AS
		select psa_code, array_agg(store_code) as store_codes from "global".product_store_attributes_filter psaf join global.store_master sm using(store_code) 
		where not is_deleted and active and l0_name = ' || quote_literal(_l0) || ' and l1_name = ' || quote_literal(_l1) || ' group by 1;';
		_st := clock_timestamp();
		_sql := 'INSERT INTO "constraint_rcl_' || _uuid || '" (
			rcl_code, rule_code, psa_code, product_codes, wos, transit_time, safety_stock, min_stock, max_stock, min_distribution, aps, ros, st, store_codes
		)
		with paf as materialized (
			select l0_name, l1_name, product_code, paf.rcl_hash->>''' || _rcl_code || ''' as rcl_hash from global.product_attributes_filter paf
			where 
				paf.l0_name = ' || quote_literal(_l0) || '
				and paf.l1_name = ' || quote_literal(_l1) || '
				and paf.active 
				and not paf.is_deleted 
				and paf.rcl_hash->>''' || _rcl_code || ''' is not null
		) 
		select x.*, y.store_codes from (
			select ' || _rcl_code || ', rule_code, psa_code, array_agg(product_code) as product_codes, min(wos), min(transit_time), min(safety_stock), min(min_stock), min(max_stock), min(min_distribution), min(aps), min(ros), min(st) 
			from paf 
			join inventory_smart.rcl_constraint_master_rule rcmr on paf.rcl_hash = md5(rcmr.rcl_dimension::text)
			join inventory_smart.rcl_constraint_master rcm using(rcl_code, rule_code)
			where 
				rcmr.rcl_code = ' || _rcl_code || '
				and rcm.validity @> current_date
				and (paf.product_code, rcm.psa_code) not in(select unnest(product_codes), psa_code from "constraint_rcl_' || _uuid || '")
			group by 
				rule_code, psa_code
		) x join "psaf_' || _uuid || '" y using(psa_code)';
		execute _sql;
--		raise notice '_time: %, _sql: %', (clock_timestamp() - _st), _sql;
--		_st := clock_timestamp();
		_sql := 'INSERT INTO "constraint_rcl_exec_' || _uuid || '" (
			rcl_code, rule_code, product_codes, wos, transit_time, safety_stock, min_stock, max_stock, min_distribution, aps, ros, st, store_code
		)
		with paf as materialized (
			select l0_name, l1_name, product_code, paf.rcl_hash->>''' || _rcl_code || ''' as rcl_hash from global.product_attributes_filter paf
			where 
				paf.l0_name = ' || quote_literal(_l0) || '
				and paf.l1_name = ' || quote_literal(_l1) || '
				and paf.active 
				and not paf.is_deleted 
				and paf.rcl_hash->>''' || _rcl_code || ''' is not null
		) 
		select ' || _rcl_code || ', rule_code, array_agg(product_code) as product_codes, min(wos), min(transit_time), min(safety_stock), min(min_stock), min(max_stock), min(min_distribution), min(aps), min(ros), min(st), store_code
		from paf
			join inventory_smart.rcl_constraint_master_rule rcmr on paf.rcl_hash = md5(rcmr.rcl_dimension::text)
			join inventory_smart.rcl_constraint_master_exceptions rcm using(rcl_code, rule_code)
		where rcmr.rcl_code = ' || _rcl_code || '
			and rcm.validity @> current_date
			and (paf.product_code, rcm.store_code) not in(select unnest(product_codes), store_code from "constraint_rcl_exec_' || _uuid || '")
            and exists (select
                                        1
                                    from
                                        inventory_smart.rcl_constraint_master rcms
                                    where
                                        rcms.rcl_code = rcm.rcl_code
                                        and rcms.rule_code = rcm.rule_code and rcms.validity @> current_date)
		group by 
			rule_code, store_code';
		execute _sql;
--		raise notice '_time: %, _sql: %', (clock_timestamp() - _st), _sql;
	end loop;
--	_st := clock_timestamp();
	_sql := 'INSERT INTO global.rcl_vc_' || _version || '_' || lower(regexp_replace(_l0, '\W+', '', 'g')) || ' (version_code, l0_name, rcl_code, rule_code, psa_code, product_codes, wos, transit_time, safety_stock, min_stock, max_stock, min_distribution, aps, ros, st, store_codes)
	select b.* from (select ' || _version || ', ' || quote_literal(_l0) || ', * from (
		select 
		  rcl_code, 
		  rule_code, 
		  main.psa_code, 
		  product_codes, 
		  wos, 
		  transit_time, 
		  safety_stock, 
		  min_stock, 
		  max_stock,
		  min_distribution, 
		  aps, 
		  ros, 
		  st, 
		  (
		    select 
		      array_agg(store_code) 
		    from 
		      (
		        select 
		          unnest(main.store_codes) as store_code 
		        except 
		        select 
		          unnest(exec.store_codes) as store_code
		      ) x
		  ) as store_codes 
		from 
		  "constraint_rcl_' || _uuid || '" main full 
		  outer join (
		    select 
		      rcl_code, 
		      rule_code,
		      array_agg(store_code) as store_codes 
		    from 
		      "constraint_rcl_exec_' || _uuid || '" 
		    group by 
		      1, 
		      2
		  ) exec using(rcl_code, rule_code)
	) x where store_codes is not null
	union all
	select ' || _version || ', ' || quote_literal(_l0) || ',
	  rcl_code, 
	  rule_code, 
      null as psa_code, 
	  product_codes, 
	  wos, 
	  transit_time, 
	  safety_stock, 
	  min_stock, 
	  max_stock,
	  min_distribution, 
	  aps, 
	  ros, 
	  st, 
	  array[store_code] as store_codes
	from 
	  "constraint_rcl_exec_' || _uuid || '") b 
	join global.rcl_master using(rcl_code) 
	 order by priority asc;';
	execute _sql;
--	raise notice '_time: %, _sql: %', (clock_timestamp() - _st), _sql;
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

