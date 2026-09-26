--liquibase formatted sql
--changeset Shaik.Azmathulla:generate_rcl_week_level_constraint_data runOnChange:true stripComments:false splitStatements:false context:generate_rcl_week_level_constraint_data labels:MTP-74285
--comment: created procedure generate_rcl_week_level_constraint_data
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.generate_rcl_week_level_constraint_data() ;

CREATE OR REPLACE PROCEDURE public.generate_rcl_week_level_constraint_data(
	IN _l0 text,
	IN _rcl_codes integer[],
	IN _limit integer DEFAULT 104)
LANGUAGE 'plpgsql'
SECURITY DEFINER 
AS $procedure$
/*
 * Function/Procedure name: public.generate_rcl_week_level_constraint_data
 * Created by: Shaik Azmathulla
 * Created at: 07-Jan-2025
 * No of input parameter: 4
 * Parameter Description : 
 * 						   $1 = l0 name
						   $3 = rcl codes in array format
						   $4 = limit of the weeks
 						
 * Purpose: This procedure been created to store allocation constraints at product_code,store data on week level
 * Calling Statement: 

 CALL public.generate_rcl_week_level_constraint_data('PINK_PINK', '202_APPAREL','{57,4,3}'::int[],104 )
		
 * if any modification done in same function/procedure please record the changes in below format
 *
 * 		Updated_by       		Updated_on      	Purpose
 * 		----------       		-----------     	--------
 		Shaik Azmathulla		24th Feb,2025		MTP-74285:Execution time for rcl_week_level_constraint_data sp is longer
		Shaik Azmathulla        11th Jul,2025		MTP-96089:Update SKU Eligibility Condition in generate_all_week_level_rcl_constraint_data
 */
 
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.generate_rcl_week_level_constraint_data';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_rcl_code int;
	_uuid text;
	_sql text;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
	rcl_count INT;
	exe_count INT; 
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	--set work_mem = '10GB';
--	raise notice '%, %, %', _rcl_codes, _l0, _l1;
	_uuid := md5(_l0);
	--_uuid := md5(_l0);
	
	DROP TABLE IF EXISTS FiscalWeek;
	DROP TABLE IF EXISTS product_attributes_filter_temp;
	DROP TABLE IF EXISTS product_store_attributes_filter_temp;
	
	_sql := 'CREATE TEMP TABLE "constraint_rcl_' || _uuid || '" (
		rcl_code int4 NOT NULL,
		fiscal_week_begin_date DATE NOT NULL,
		fiscal_year_week int4 NOT NULL,
		rule_code int4 NOT NULL,
		psa_code varchar NOT NULL,
		product_codes _varchar NULL,
		wos float4 NULL,
        dos float4 NULL,
		transit_time float4 NULL,
		safety_stock float4 NULL,
		min_stock float4 NULL,
		max_stock float4 NULL,
		min_distribution varchar NULL,
		aps float4 NULL,
		ros float4 NULL,
		st float4 NULL,
		store_codes _varchar NULL
	) ON COMMIT DROP';
	execute _sql;

	_sql := 'CREATE TEMP TABLE "constraint_rcl_exec_' || _uuid || '" (
		rcl_code int4 NOT NULL,
		fiscal_week_begin_date DATE NOT NULL,
		fiscal_year_week int4 NOT NULL,
		rule_code int4 NOT NULL,
		product_codes _varchar NULL,
		wos float4 NULL,
        dos float4 NULL,
		transit_time float4 NULL,
		safety_stock float4 NULL,
		min_stock float4 NULL,
		max_stock float4 NULL,
		min_distribution varchar NULL,
		aps float4 NULL,
		ros float4 NULL,
		st float4 NULL,
		store_code varchar NULL
	) ON COMMIT DROP';
	execute _sql;
	
	execute '	CREATE INDEX idx_constraint_rcl_exec_' || _uuid || ' ON "constraint_rcl_exec_' || _uuid || '" USING BTREE (store_code ,fiscal_week_begin_date,fiscal_year_week);
	 			CREATE INDEX idx_constraint_rcl_' || _uuid || ' ON "constraint_rcl_' || _uuid || '" USING BTREE (psa_code ,fiscal_week_begin_date,fiscal_year_week); 
	 			CREATE INDEX gin_constraint_rcl_' || _uuid || ' ON "constraint_rcl_' || _uuid || '" USING GIN (product_codes);
	 			CREATE INDEX gin_constraint_rcl_exec_' || _uuid || ' ON "constraint_rcl_exec_' || _uuid || '" USING GIN (product_codes);' ;      
			 

	CREATE TEMP TABLE FiscalWeek 
	(
		fiscal_week_begin_date DATE NOT NULL,
		fiscal_year_week INT NOT NULL
		
	);
			
	_sql := ' INSERT INTO FiscalWeek (fiscal_week_begin_date,fiscal_year_week)
			  SELECT fiscal_week_begin_date, fiscal_year_week
			  FROM global.fiscal_date_mapping fdm
			  WHERE calendar_date >= current_date
			  GROUP BY fiscal_week_begin_date, fiscal_year_week
			  ORDER BY fiscal_week_begin_date
			  LIMIT ' || _limit || '  ;

			  CREATE INDEX idx_FiscalWeek ON FiscalWeek  USING btree (fiscal_week_begin_date);

		 	CREATE TEMP TABLE product_store_attributes_filter_temp AS
			SELECT  l0_name, l1_name
			FROM  global.product_store_attributes_filter paf 
			WHERE 	paf.l0_name = ' || quote_literal(_l0) || '
			group by l0_name, l1_name ;
			
			CREATE INDEX idx_product_store_attributes_filter_temp ON product_store_attributes_filter_temp  USING btree (l0_name, l1_name);

			CREATE TEMP TABLE product_attributes_filter_temp AS
			SELECT  paf.product_code,paf.rcl_hash,l0_name, l1_name
			FROM  global.product_attributes_filter paf 
			WHERE  EXISTS (SELECT 1 FROM product_store_attributes_filter_temp saf WHERE paf.l0_name = saf.l0_name and paf.l1_name = saf.l1_name )
			AND paf.active 
			AND not paf.is_deleted 
            AND EXISTS( SELECT 1 FROM inventory_smart.oms_constraints_status ocs 
						WHERE ocs.product_code = paf.product_code 
						and status in (''Laddering'',''Laddering and Ordering'') 
					  )  ;
			
			CREATE INDEX idx_product_attributes_filter_temp_product_code ON product_attributes_filter_temp  USING btree (product_code);';

			 raise notice 'temp_table query : %', _sql;
			 execute _sql;
			 _sql:= '';
	FOREACH _rcl_code in array _rcl_codes loop

			
	 		DROP INDEX IF EXISTS idx_paf_rcl_hash ;
	 
			execute ' CREATE INDEX idx_paf_rcl_hash ON product_attributes_filter_temp ((rcl_hash ->> ''' || _rcl_code || ''')); ';

			_sql := '	
					SELECT COUNT (*)
					FROM product_attributes_filter_temp paf
					INNER JOIN inventory_smart.rcl_constraint_master_rule rcmr on paf.rcl_hash->>''' || _rcl_code || ''' = md5(rcmr.rcl_dimension::text)
					WHERE EXISTS ( SELECT 1 FROM inventory_smart.rcl_constraint_master rcm WHERE rcmr.rcl_code = rcm.rcl_code AND rcmr.rule_code = rcm.rule_code and not rcm.is_deleted )
					AND rcmr.rcl_code = ' || _rcl_code || '
					 ;';	
		EXECUTE _sql INTO rcl_count;	
		raise notice 'rcl_count: %, _sql: %', rcl_count, _sql;
		_sql := '';
		IF rcl_count > 0 THEN
		
			_st := clock_timestamp();
			_sql:= 'CREATE TEMP TABLE unnestCTE_temp AS
					SELECT unnest(product_codes) as product_code, psa_code ,fiscal_year_week
					FROM "constraint_rcl_' || _uuid || '"
					WHERE product_codes is not null and psa_code IS NOT NULL  AND fiscal_year_week IS NOT NULL;
				
					CREATE INDEX idx_unnestCTE_temp_product_code ON unnestCTE_temp  USING btree (product_code,psa_code,fiscal_year_week);';
					
			execute _sql;
			raise notice 'unnestCTE_temp_time: %, _sql: %', (clock_timestamp() - _st), _sql;
			_st := clock_timestamp();
			_sql := '';
			_sql := '
			INSERT INTO "constraint_rcl_' || _uuid || '" (
				rcl_code, fiscal_week_begin_date,fiscal_year_week,rule_code, psa_code, product_codes, wos, dos, transit_time, safety_stock, min_stock, max_stock, min_distribution, aps, ros, st, store_codes
			)
			SELECT x.rcl_code,fiscal_week_begin_date,fiscal_year_week,rule_code, psa_code,product_codes,wos, dos, transit_time, safety_stock, min_stock, max_stock, min_distribution, aps, ros, st,
			y.store_codes 
			FROM (
					SELECT 	' || _rcl_code || ' as rcl_code , fiscal_week_begin_date,fiscal_year_week,rule_code, psa_code, array_agg(product_code) as product_codes, 
							min(wos) as wos, min(dos) as dos, min(transit_time) as transit_time, min(safety_stock) as safety_stock, min(min_stock) as min_stock, min(max_stock) as max_stock, min(min_distribution) as min_distribution, min(aps ) as aps, min(ros) as ros, min(st) as st,
							l0_name, l1_name
					FROM 	product_attributes_filter_temp paf
							INNER JOIN inventory_smart.rcl_constraint_master_rule rcmr on paf.rcl_hash->>''' || _rcl_code || ''' = md5(rcmr.rcl_dimension::text)
							INNER JOIN inventory_smart.rcl_constraint_master rcm USING(rcl_code, rule_code)
							INNER JOIN FiscalWeek FW ON rcm.validity @> FW.fiscal_week_begin_date
					WHERE  rcmr.rcl_code = ' || _rcl_code || '
	                       AND NOT rcm.is_deleted
							AND NOT EXISTS (SELECT 1 FROM unnestCTE_temp UN WHERE UN.product_code = paf.product_code AND  UN.psa_code = rcm.psa_code 
											AND UN.fiscal_year_week = FW.fiscal_year_week)
					GROUP BY fiscal_week_begin_date,fiscal_year_week,rule_code, psa_code,l0_name, l1_name
				) x 
				INNER JOIN (
							SELECT psa_code, l0_name, l1_name,array_agg(store_code) as store_codes 
							FROM "global".product_store_attributes_filter psaf join global.store_master sm USING(store_code) 
							WHERE NOT is_deleted AND active
								AND EXISTS (SELECT 1 FROM product_store_attributes_filter_temp saf WHERE psaf.l0_name = saf.l0_name and psaf.l1_name = saf.l1_name )
							GROUP BY psa_code, l0_name, l1_name
				) y USING(psa_code,l0_name, l1_name) ;';
			
			execute _sql;
			raise notice 'constraint_rcl_ _time: %, _sql: %', (clock_timestamp() - _st), _sql;
				
		END IF;
			
			_sql := '	
					SELECT COUNT (*)
					FROM product_attributes_filter_temp paf
					INNER JOIN inventory_smart.rcl_constraint_master_rule rcmr on paf.rcl_hash->>''' || _rcl_code || ''' = md5(rcmr.rcl_dimension::text)
					WHERE EXISTS ( SELECT 1 FROM inventory_smart.rcl_constraint_master_exceptions rcm WHERE rcmr.rcl_code = rcm.rcl_code AND rcmr.rule_code = rcm.rule_code )
					AND rcmr.rcl_code = ' || _rcl_code || '
					 ;';	
			EXECUTE _sql INTO exe_count;
			raise notice 'exe_count: %, _sql: %', exe_count, _sql;	
			_sql := '';
			
		IF exe_count > 0 THEN	

			_st := clock_timestamp();
			_sql := ' 
					CREATE TEMP TABLE  exec_unnestCTE_temp AS 
					SELECT unnest(product_codes) as product_code, store_code ,fiscal_year_week
					FROM "constraint_rcl_exec_' || _uuid || '"
					WHERE product_codes is not null and store_code IS NOT NULL  AND fiscal_year_week IS NOT NULL ; 
					
					CREATE INDEX idx_exec_unnestCTE_temp_product_code ON exec_unnestCTE_temp  USING btree (product_code,store_code,fiscal_year_week); ';
					
			execute _sql;
			raise notice 'exec_unnestCTE_temp_time: %, _sql: %', (clock_timestamp() - _st), _sql;
			_sql := '';
			_st := clock_timestamp();
			_sql := '
			INSERT INTO "constraint_rcl_exec_' || _uuid || '" (
				rcl_code, fiscal_week_begin_date,fiscal_year_week,rule_code, product_codes, wos, dos, transit_time, safety_stock, min_stock, max_stock, min_distribution, aps, ros, st, store_code
			)
			SELECT 	' || _rcl_code || ' as rcl_code, fiscal_week_begin_date,fiscal_year_week,rule_code, array_agg(product_code) as product_codes, 
					min(wos), min(dos), min(transit_time), min(safety_stock), min(min_stock), min(max_stock), min(min_distribution), min(aps), min(ros), min(st), store_code
			FROM 	product_attributes_filter_temp paf
					INNER JOIN inventory_smart.rcl_constraint_master_rule rcmr on paf.rcl_hash->>''' || _rcl_code || ''' = md5(rcmr.rcl_dimension::text)
					INNER JOIN inventory_smart.rcl_constraint_master_exceptions rcm USING(rcl_code, rule_code)
					INNER JOIN FiscalWeek FW ON rcm.validity @> FW.fiscal_week_begin_date
			WHERE  rcmr.rcl_code = ' || _rcl_code || '
					AND NOT EXISTS (SELECT 1 FROM exec_unnestCTE_temp UN WHERE UN.product_code = paf.product_code AND  UN.store_code = rcm.store_code AND UN.fiscal_year_week = FW.fiscal_year_week)
			GROUP BY fiscal_week_begin_date,fiscal_year_week,rule_code, store_code ;';
			
			execute _sql;
			raise notice 'constraint_rcl_exec_ _time: %, _sql: %', (clock_timestamp() - _st), _sql;
			
		END IF;

		DROP TABLE IF EXISTS exec_unnestCTE_temp;
		DROP TABLE IF EXISTS unnestCTE_temp;
	
	end loop;
	
	raise notice '_loop_end';
	
	_st := clock_timestamp();
	_sql := 'INSERT INTO public.rcl_week_level_constraint_data (l0_name,rcl_code, fiscal_week_begin_date,fiscal_year_week,rule_code, psa_code, product_codes, wos,dos, transit_time, safety_stock, min_stock, max_stock, min_distribution, aps, ros, st, store_codes)
	SELECT '|| quote_literal(_l0) || ' as l0_name,* 
	FROM (
			SELECT rcl_code,fiscal_week_begin_date ,fiscal_year_week, rule_code,psa_code,product_codes,wos,dos,transit_time,safety_stock, 
		  			min_stock,max_stock, min_distribution, aps,ros, st, 
				  (
				    SELECT array_agg(store_code) 
				    FROM (
					        SELECT UNNEST(main.store_codes) as store_code 
					        EXCEPT 
					        SELECT UNNEST(exec.store_codes) as store_code
					      ) x
				  ) as store_codes 
			FROM "constraint_rcl_' || _uuid || '" main full 
		    OUTER JOIN (
			    			SELECT rcl_code, rule_code,fiscal_week_begin_date,fiscal_year_week,
							       array_agg(store_code) as store_codes 
							FROM   "constraint_rcl_exec_' || _uuid || '" 
							GROUP BY 1, 2,3,4
			  			) exec USING(rcl_code, rule_code,fiscal_week_begin_date,fiscal_year_week)
		) x 
	WHERE store_codes is not null AND psa_code IS NOT NULL AND fiscal_week_begin_date IS NOT NULL AND fiscal_year_week IS NOT NULL
	
	UNION ALL
	
	SELECT '|| quote_literal(_l0) || ' as l0_name,rcl_code, fiscal_week_begin_date ,fiscal_year_week,rule_code, null as psa_code, product_codes, 
	  		wos,dos, transit_time, safety_stock,min_stock, max_stock, min_distribution, aps, ros,st,array[store_code] as store_codes
	FROM  "constraint_rcl_exec_' || _uuid || '" 
	WHERE 	store_code IS NOT NULL AND fiscal_week_begin_date IS NOT NULL AND fiscal_year_week IS NOT NULL ;';
	
	execute _sql;
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
$procedure$;
