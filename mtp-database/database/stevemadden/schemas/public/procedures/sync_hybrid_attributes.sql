--liquibase formatted sql
--changeset ashish@impactanalytics.co:sync_hybrid_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-20302
--comment: initial changeset for sync_hybrid_attributes
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_hybrid_attributes();
CREATE OR REPLACE PROCEDURE public.sync_hybrid_attributes()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_hybrid_attributes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	 _column_cnt integer;
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		select 
		  count(1) into _column_cnt 
		from 
		  information_schema."columns" c 
		where 
		  table_schema = 'global' 
		  and table_name = 'product_attributes_filter' 
		  and column_name in (
			'product_direct_channel'
		  );
		if _column_cnt = 1 then
			DELETE FROM 
			  "global".product_attributes pa USING "global".product_master pm 
			WHERE 
			  pa.product_code = pm.product_code 
			  and attribute_name in (
				'product_direct_channel'
			  ) 
			  AND pm.is_deleted = false;
			insert into global.product_attributes (
			  product_code, attribute_name, attribute_value
			) 
			select 
			  product_code, 
			  'product_direct_channel' as attribute_name, 
			  product_direct_channel as attribute_value 
			from 
			  global.product_master pm 
			  join (
				SELECT 
				  product_code, 
				  case 
						when (channel like '%Factory%' and channel like '%Full%') then 'Factory & Full Line'
						when (channel like '%Full%') then 'Full Line Exclusive'
						when (channel like '%Factory%') then 'Factory Exclusive'
					end as product_direct_channel
				FROM 
				  public.product_direct_channel
			  ) pc using(product_code) 
			where 
			  is_deleted = false on conflict(product_code, attribute_name) do 
			update 
			set 
			  attribute_value = excluded.attribute_value;
			update 
			  global.product_attributes_filter paf 
			set 
			  product_direct_channel = x.attribute_value 
			from 
			  (
				select 
				  product_code, 
				  attribute_value 
				from 
				  global.product_attributes 
				where 
				  attribute_name = 'product_direct_channel'
			  ) x 
			where 
			  paf.product_code = x.product_code;
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
