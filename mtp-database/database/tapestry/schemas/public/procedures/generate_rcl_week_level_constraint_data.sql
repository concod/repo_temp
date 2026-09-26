--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:generate_rcl_week_level_constraint_data runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:generate_rcl_week_level_constraint_data
--comment: initial changeset generate_rcl_week_level_constraint_data 

DROP PROCEDURE IF EXISTS public.generate_rcl_week_level_constraint_data(text, text, _int4, int4);
CREATE OR REPLACE PROCEDURE public.generate_rcl_week_level_constraint_data(IN _l0 text, IN _l1 text, IN _rcl_codes integer[], IN _limit integer DEFAULT 104)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
/*
 * Function/Procedure name: inventory_smart.allocation_summary_list
 * Created by: Shaik Azmathulla
 * Created at: 20-Nov-2024
 * No of input parameter: 4
 * Parameter Description : 
 * 						   $1 = l0 name
 					   	   $2 = l1 name
						   $3 = rcl codes in array format
						   $4 = limit of the weeks
 						
 * Purpose: This procedure been created to store allocation constraints at product_code,store data on week level
 * Calling Statement:
		 CALL public.generate_rcl_week_level_constraint_data('CAN','Brick __ia_char_13 Mortar','{32772,16385,8201,8193,516,387,260,130,68,36,35,33,9,4,1}'::int[],104)
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 */
 
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.generate_rcl_week_level_constraint_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_uuid text;
	_sql text;
	_rcl_code int;
	
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
--	_l0:='CAN';
	--_l1 :='Brick __ia_char_13 Mortar';
	--_rcl_codes := '{32772,16385,8201,8193,516,387,260,130,68,36,35,33,9,4,1}'::int[];
--set work_mem = '10GB';
--	raise notice '%, %, %', _rcl_codes, _l0, _l1;
	_uuid := md5(_l0 || '-' || _l1);

	DROP TABLE IF EXISTS FiscalWeek;
	
	execute 'CREATE TEMP TABLE "constraint_rcl_' || _uuid || '" (
		rcl_code int4 NOT NULL,
		fiscal_week_begin_date DATE NOT NULL,
		fiscal_year_week int4 NOT NULL,
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
	)ON COMMIT DROP; ';
  
	execute 'CREATE TEMP TABLE "constraint_rcl_exec_' || _uuid || '" (
		rcl_code int4 NOT NULL,
		fiscal_week_begin_date DATE NOT NULL,
		fiscal_year_week int4 NOT NULL,
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
	)ON COMMIT DROP; 
	
	CREATE TEMP TABLE FiscalWeek 
	(
		fiscal_week_begin_date DATE NOT NULL,
		fiscal_year_week INT NOT NULL	
	)ON COMMIT DROP ; ';

	execute 'CREATE INDEX idx_constraint_rcl_exec_' || _uuid || ' ON "constraint_rcl_exec_' || _uuid || '" USING BTREE (store_code ,fiscal_week_begin_date,fiscal_year_week);
			 CREATE INDEX idx_constraint_rcl_' || _uuid || ' ON "constraint_rcl_' || _uuid || '" USING BTREE (psa_code ,fiscal_week_begin_date,fiscal_year_week); 
             CREATE INDEX gin_constraint_rcl_' || _uuid || ' ON "constraint_rcl_' || _uuid || '" USING GIN (product_codes);
             CREATE INDEX gin_constraint_rcl_exec_' || _uuid || ' ON "constraint_rcl_exec_' || _uuid || '" USING GIN (product_codes); ' ;        

	execute ' INSERT INTO FiscalWeek (fiscal_week_begin_date,fiscal_year_week)
			  SELECT fiscal_week_begin_date, fiscal_year_week
			  FROM global.fiscal_date_mapping fdm
			  WHERE date >= current_date
--			  WHERE calendar_date >= current_date
			  GROUP BY fiscal_week_begin_date, fiscal_year_week
			  ORDER BY fiscal_week_begin_date
			  LIMIT 	' || _limit || '  ';
	
	FOREACH _rcl_code in array _rcl_codes loop
		_st := clock_timestamp();
		_sql := '
					WITH unnestCTE
						AS (
							SELECT unnest(product_codes) as product_code, psa_code ,fiscal_week_begin_date,fiscal_year_week
							FROM "constraint_rcl_' || _uuid || '"
							WHERE psa_code IS NOT NULL AND fiscal_week_begin_date IS NOT NULL AND fiscal_year_week IS NOT NULL
						   )
									
			INSERT INTO "constraint_rcl_' || _uuid || '" (
			rcl_code, fiscal_week_begin_date,fiscal_year_week,rule_code, psa_code, product_codes, wos, transit_time, safety_stock, min_stock, max_stock,min_distribution, aps, ros, st, store_codes
		)
		SELECT x.*, y.store_codes 
		FROM (
				
					SELECT 		' || _rcl_code || ' AS rcl_code , fiscal_week_begin_date,fiscal_year_week,rule_code, psa_code, array_agg(product_code) as product_codes, 
								min(wos) AS wos, min(transit_time) AS transit_time, min(safety_stock) AS safety_stock, min(min_stock) AS min_stock, 
								min(max_stock) AS max_stock, min(min_distribution) as min_distribution, min(aps) AS aps, min(ros) AS ros, min(st) AS st
					FROM 		global.product_attributes_filter paf
					INNER JOIN  inventory_smart.rcl_constraint_master_rule rcmr on paf.rcl_hash->>''' || _rcl_code || ''' = md5(rcmr.rcl_dimension::text)
					INNER JOIN  inventory_smart.rcl_constraint_master rcm USING(rcl_code, rule_code)
					INNER JOIN FiscalWeek FW ON rcm.validity @> FW.fiscal_week_begin_date
					WHERE 		paf.l0_name = ''' || _l0 || '''
								and paf.l1_name = ''' || _l1 || '''
								and paf.active 
								and not paf.is_deleted 
								and rcmr.rcl_code = ' || _rcl_code || '
--								and not rcm.is_deleted 
								and paf.ordering = ''Y''
								AND NOT EXISTS (SELECT 1 FROM unnestCTE UN WHERE UN.product_code = paf.product_code AND  UN.psa_code = rcm.psa_code 
								AND UN.fiscal_week_begin_date = FW.fiscal_week_begin_date AND UN.fiscal_year_week = FW.fiscal_year_week)
								--AND (paf.product_code, psa_code,FW.fiscal_week_begin_date,FW.fiscal_year_week) not in(select unnest(product_codes), psa_code,fiscal_week_begin_date,fiscal_year_week from "constraint_rcl_' || _uuid || '")	       
					GROUP BY fiscal_week_begin_date,fiscal_year_week,rule_code, psa_code
		) x 
		INNER JOIN (
					SELECT  psa_code, array_agg(store_code) as store_codes 
					FROM 	"global".product_store_attributes_filter psaf 
					INNER JOIN  global.store_master sm USING(store_code) 
					WHERE   not is_deleted and active
							and l0_name = ''' || _l0 || '''
							and l1_name = ''' || _l1 || '''
					GROUP BY 1
		) y USING(psa_code);
		';
		
		EXECUTE _sql;
		raise notice '_time: %, _sql: %', (clock_timestamp() - _st), _sql;
		_st := clock_timestamp();
		
		_sql := '
					WITH unnestCTE
						AS (
							SELECT unnest(product_codes) as product_code, store_code ,fiscal_week_begin_date,fiscal_year_week
							FROM "constraint_rcl_exec_' || _uuid || '"
							WHERE store_code IS NOT NULL AND fiscal_week_begin_date IS NOT NULL AND fiscal_year_week IS NOT NULL
						   )
			
		INSERT INTO "constraint_rcl_exec_' || _uuid || '" (
			rcl_code,fiscal_week_begin_date,fiscal_year_week, rule_code, product_codes, wos, transit_time, safety_stock, min_stock, max_stock, min_distribution, aps, ros, st, store_code
		)
			SELECT ' || _rcl_code || ' as rcl_code,fiscal_week_begin_date,fiscal_year_week, rule_code, array_agg(product_code) as product_codes,  
					min(wos) as wos, min(transit_time) as transit_time, min(safety_stock) as safety_stock, min(min_stock) as min_stock, 
					min(max_stock) as max_stock, min(min_distribution) as min_distribution, min(aps) as aps, min(ros) as ros, min(st) as st, store_code
			FROM 	global.product_attributes_filter paf
			INNER JOIN inventory_smart.rcl_constraint_master_rule rcmr on paf.rcl_hash->>''' || _rcl_code || ''' = md5(rcmr.rcl_dimension::text)
			INNER JOIN inventory_smart.rcl_constraint_master_exceptions rcm using(rcl_code, rule_code)
			INNER JOIN FiscalWeek FW ON rcm.validity @> FW.fiscal_week_begin_date
			WHERE paf.l0_name = ''' || _l0 || '''
				  and paf.l1_name = ''' || _l1 || '''
				  and paf.active 
				  and not paf.is_deleted 
				  and rcmr.rcl_code = ' || _rcl_code || '
				  and paf.ordering = ''Y''
				  --and (paf.product_code, store_code) not in(select unnest(product_codes), store_code from "constraint_rcl_exec_' || _uuid || '")
				  AND NOT EXISTS (SELECT 1 FROM unnestCTE UN WHERE UN.product_code = paf.product_code AND  UN.store_code = rcm.store_code AND UN.fiscal_week_begin_date = FW.fiscal_week_begin_date AND UN.fiscal_year_week = FW.fiscal_year_week)
			GROUP BY fiscal_week_begin_date,fiscal_year_week,rule_code, store_code ; ';

		EXECUTE _sql;
		raise notice '_time: %, _sql: %', (clock_timestamp() - _st), _sql;

	end loop;
	raise notice '_loop_end';
	
		_st := clock_timestamp();

		_sql := 'INSERT INTO public.rcl_week_level_constraint_data ( l0_name, l1_name,rcl_code, fiscal_week_begin_date,fiscal_year_week,rule_code, psa_code, product_codes, wos, transit_time, safety_stock, min_stock, max_stock, min_distribution, aps, ros, st, store_codes)
		SELECT ' || quote_literal(_l0) || ' AS l0_name, ' || quote_literal(_l1) || ' AS l1_name, * 
		FROM 
			(
				SELECT 	rcl_code,fiscal_week_begin_date ,fiscal_year_week,rule_code, psa_code, product_codes,wos,transit_time,safety_stock,min_stock, max_stock, min_distribution, aps, ros,st, 
					   (
					    SELECT array_agg(store_code) 
					    FROM (
					        	SELECT  UNNEST(main.store_codes) as store_code 
					        	EXCEPT 
					        	SELECT UNNEST(exec.store_codes) as store_code
					      ) x
					   ) as store_codes 
				FROM  "constraint_rcl_' || _uuid || '" main 
				FULL OUTER JOIN 
				(
					SELECT rcl_code, rule_code, fiscal_week_begin_date,fiscal_year_week,
						   ARRAY_AGG(store_code) as store_codes 
					FROM   "constraint_rcl_exec_' || _uuid || '" 
					WHERE  store_code IS NOT NULL AND fiscal_week_begin_date IS NOT NULL AND fiscal_year_week IS NOT NULL
					GROUP BY rcl_code, rule_code, fiscal_week_begin_date,fiscal_year_week
				  ) exec USING(rcl_code, rule_code,fiscal_week_begin_date,fiscal_year_week)
			) x 
		WHERE store_codes IS NOT NULL AND psa_code IS NOT NULL AND fiscal_week_begin_date IS NOT NULL AND fiscal_year_week IS NOT NULL
		
		UNION ALL
		
		SELECT  ' || quote_literal(_l0) || ' AS l0_name,' || quote_literal(_l1) || ' AS l1_name, rcl_code,fiscal_week_begin_date ,fiscal_year_week,rule_code,null as psa_code,product_codes,wos, transit_time, 
		  		safety_stock, min_stock,max_stock, min_distribution, aps,ros,st, array[store_code] as store_codes
		FROM 	"constraint_rcl_exec_' || _uuid || '" ex
		WHERE 	store_code IS NOT NULL AND fiscal_week_begin_date IS NOT NULL AND fiscal_year_week IS NOT NULL
				--AND NOT EXISTS (SELECT 1 FROM rcl_week_level_constraint_data WL WHERE WL.rcl_code = ex.rcl_code) ;';
				
		--raise notice '_time: %, _sql: %', (clock_timestamp() - _st), _sql;
		EXECUTE _sql;
		raise notice '_time: %, _sql: %', (clock_timestamp() - _st), _sql;
	--	raise notice '%', _uuid;
		
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
