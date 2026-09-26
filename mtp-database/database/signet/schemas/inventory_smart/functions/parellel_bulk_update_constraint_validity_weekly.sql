--liquibase formatted sql
--changeset alam.khan@impactanalytics.co:action_oms_orders runOnChange:true stripComments:false splitStatements:false context:MTP-48841 labels:MTP-48841
--comment: MTP-48841
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.parellel_bulk_update_constraint_validity_weekly(int4, jsonb, jsonb, jsonb, jsonb, jsonb, int4, _int4, text);

CREATE OR REPLACE FUNCTION inventory_smart.parellel_bulk_update_constraint_validity_weekly(_concurrency integer, _pf jsonb, _sf jsonb, _tf jsonb, _nv jsonb, _cmwf jsonb, _updated_by integer, _mapping_codes integer[], _return_type text)
 RETURNS TABLE(count jsonb)
 LANGUAGE plpgsql
AS $function$
	declare
		_psql text;
		_queue_length int;
		_worker text;
		_workers text[];
		_is_busy int;
		_r record;
		_record_count float := 0;
		_count float := 0;
		_status bool;
		_result jsonb;
		_error_message text;
        _error_detail text;
        _error_hint text;
	begin 
		raise notice 'Constraints Master Weekly %', _cmwf;
		
		-- get max concurrency according to input + server capacity
		SELECT least((current_setting('max_connections')::int/2) - count(1), _concurrency) into _queue_length FROM pg_stat_activity WHERE pg_stat_activity.datname = current_database();
		raise notice '_queue_length: %', _queue_length;
		--
		-- exception block
		BEGIN
			for _r in select * from cache.calculate_chunks('update_constraint', _pf) loop 
				_psql := 'select *
						from
						inventory_smart.bulk_update_constraint_validity_weekly(
						' || quote_literal(_r.chunk) || ',
						' || quote_literal(_sf) || ',
						' || quote_literal(_tf) || ',
						' || quote_literal(_nv) || ',
						' || quote_literal(_updated_by) || ',
						' || quote_literal(_mapping_codes) || ',
						
						' || quote_literal(_cmwf ) ||  ',
						' || quote_literal(_return_type) ||
						');';
				raise notice '_psql: %', _psql;
				select async_query into _worker from public.async_query(_psql);
				_workers := array_append(_workers, _worker);
				--raise notice '_workers: %', _workers;
				-- if jobs are more then limit
				if array_length(_workers, 1) > _queue_length-1 then
					FOREACH _worker in array _workers loop
						SELECT dblink_is_busy(_worker) into _is_busy;
						if _is_busy = 0 then
							select (jsb->>'record_count')::float + _record_count, (jsb->>'sku_count')::float + _count 
							into _record_count, _count 
							from dblink_get_result(_worker, true) AS t1(jsb jsonb);
							--raise notice 'Progress: %', (_feedback_cnt/_total_records)*100;
							raise notice 'round 1 record_count %  count %', _record_count, _count; 
							perform dblink_disconnect(_worker);
							_workers := array_remove(_workers, _worker);
						end if;
					end loop;
				end if;
				-- if limit breached
				if array_length(_workers, 1) > _queue_length-1 then
					-- raise notice 'Sleep: %', array_length(_workers, 1);
					perform pg_sleep(5);
				end if;
			end loop;
			-- final cleanup
			raise notice 'Final cleanup: %', array_length(_workers, 1);
			raise notice '_workers: %', _workers;
		
			FOREACH _worker in array _workers loop
				select (jsb->>'record_count')::float + _record_count, (jsb->>'sku_count')::float + _count 
				into _record_count, _count 
				from dblink_get_result(_worker, true) AS t1(jsb jsonb);
		 
				raise notice 'round 2 record_count %  count %', _record_count, _count; 
				perform dblink_disconnect(_worker);
				_workers := array_remove(_workers, _worker);
			end loop;
			_status := true;
		exception when others then 
			GET STACKED DIAGNOSTICS _error_message = MESSAGE_TEXT,
                                    _error_detail = PG_EXCEPTION_DETAIL,
                                    _error_hint = PG_EXCEPTION_HINT;
                                    
            RAISE NOTICE 'Error Message: %', _error_message;
            RAISE NOTICE 'Error Detail: %', COALESCE(_error_detail, 'N/A');
            RAISE NOTICE 'Error Hint: %', COALESCE(_error_hint, 'N/A');
            
--			raise notice 'X';
			_status := false;
		END;
		-- cleanup connections in case any worker failed
		if not _status then
			FOREACH _worker in array _workers loop
				perform dblink_disconnect(_worker);
			end loop;
			RAISE EXCEPTION 'Error in % workers', array_length(_workers, 1);
		end if;
		raise notice '_status: %', _status;
		return query execute 'select json_build_object(''record_count'', '||_record_count||', ''sku_count'','||_count||')::jsonb as count';
	end 
$function$
;
