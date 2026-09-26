--liquibase formatted sql
--changeset sri.harsha@impactanalytic.co:load_time_attributes_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_3 labels:MTP-45360
--comment: added active status in store time attribute, 
--comment: Not sure about this method use. If sync back to GBQ happening then this no need to calculate on PG + Must not set TA for deleted stores because if any store marked as deleted must not recover by any script.
--comment: Added updated_by check to only update user edited rows 
--comment: Added Signet Specific SPs which update Store and product time attributes runs before load time attributes runs
--removing the user edited records only condition
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.load_time_attributes();
DROP PROCEDURE IF EXISTS global.load_time_attributes(IN _table_name varchar);
CREATE OR REPLACE PROCEDURE global.load_time_attributes(IN _table_name varchar)
 LANGUAGE plpgsql
  SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.load_time_attributes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		if _table_name = 'store_master' then
                CALL public.sync_update_store_status();
			update 
			  "global".store_master sm 
			set 
			  is_deleted = (
				case
					when lower(trim(sta.attribute_value)) in ('deactivate', 'deactivated', 'deactivates') then true
					else sm.is_deleted
				end
			  ), 
			  active = (
				case 
					when lower(trim(sta.attribute_value)) in ('deactivate', 'deactivated', 'deactivates', 'inactive', 'inactivated', 'close', 'closed', 'renovation', 'renovations', 'renewal', 'novation', 'novations', 'maintenance') then false
					when lower(trim(sta.attribute_value)) in ('open', 'opens', 'opened', 'active', 'activated') then true
					else sm.active
				end
			  ) 
			from 
			  "global".store_time_attributes sta 
			where 
			  sta.attribute_name = 'status' 
			  and sm.is_deleted = false
			  and sm.store_code = sta.store_code
			  --@harsha removing the updated by condition for closed stores & new stores
			  and CURRENT_DATE between sta.start_time 
			  and sta.end_time;
			update 
			  global.distribution_centres dc 
			set 
			  is_active = (
				case when lower(
				  trim(sta.attribute_value)
				) in ('close', 'closed') then false else true end
			  ) 
			from 
			  "global".store_time_attributes sta 
			where 
			  sta.attribute_name = 'status' 
			  and dc.is_deleted = false 
			  and dc.linked_store_code = sta.store_code 
			  --only consider user edited rows
			  AND sta.updated_by is not null
			  and CURRENT_DATE between sta.start_time
			  and sta.end_time;
		end if;
		if _table_name = 'product_master' then
                CALL public.sync_update_sku_status();
			UPDATE 
			  "global".product_master pm 
			SET 
			  active = (
			    CASE WHEN lower(trim(pta.attribute_value)) in('active', 'activated', 'clearence', 'clearance') THEN true 
			    WHEN lower(trim(pta.attribute_value)) in('inactive', 'inactivated') THEN false 
			    ELSE pm.active end
			  ), 
			  clearance = (
			    CASE WHEN lower(trim(pta.attribute_value)) in('clearence', 'clearance') THEN true else pm.clearance end
			  ) 
			FROM 
			  "global".product_time_attributes pta 
			WHERE 
			  pta.attribute_name = 'status' 
			  and pm.is_deleted = false
			  and pm.product_code = pta.product_code
			  --@harsha removing the updated by condition for Sub SKUs & Supersession
			  AND CURRENT_DATE BETWEEN pta.start_time
			  AND pta.end_time;
		end if;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end
$procedure$

;