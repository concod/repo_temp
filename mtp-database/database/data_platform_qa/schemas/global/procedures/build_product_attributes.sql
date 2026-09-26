--liquibase formatted sql
--changeset ashish@impactanalytics.co:build_product_attributes runOnChange:true stripComments:false splitStatements:false context:New_Sync_Stratgy labels:DAT-832
--comment: initial changeset for build_product_attributes
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS global.build_product_attributes();
CREATE OR REPLACE PROCEDURE global.build_product_attributes()
 LANGUAGE plpgsql
AS $procedure$
declare
	_attrs text;
	_worker text;
	_st TIMESTAMP := clock_timestamp();
	_sql text;
	_log_code varchar := gen_random_uuid();
    _sp_name varchar := 'global.build_product_attributes';
 	_log_step varchar;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null,  (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        /* ------------------------------------------------------------------------
        ----------- Old products will not come in daily sync so cleanup -----------
        ------------------------------------------------------------------------ */
		_log_step := 'calculate non deleted product attributes';
		SELECT async_query INTO _worker FROM public.async_query('call global.build_list_partitions(''product_attributes'');');
        PERFORM public.async_query_status(_worker, 'cleanup');

		SELECT async_query INTO _worker FROM public.async_query('DROP TABLE IF EXISTS public.pa_delete;');
        PERFORM public.async_query_status(_worker, 'cleanup');
		
        _sql :='
        CREATE TABLE public.pa_delete AS 
        SELECT product_code FROM global.product_master pm
        JOIN "global".product_attributes pa USING(product_code)
        WHERE pm.is_deleted = false
        AND pa.attribute_name = ''l0_name'';';
        SELECT async_query INTO _worker FROM public.async_query(_sql);
        PERFORM public.async_query_status(_worker, 'cleanup');
		call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);
		
		_log_step := 'cleanup non deleted product attributes';
		perform set_config('local.log_step', _log_step, true);
        _sql := 'WITH rows AS (
        DELETE FROM 
          global.product_attributes pa {where} 
          AND attribute_name NOT IN (
            ''product_tag'', ''ordering'', ''sku_grade''
          ) RETURNING 1
        ) 
        SELECT 
          count(1) as cnt 
        FROM 
          rows;';
        PERFORM public.parellel_insert(_sql, 50, 'public.pa_delete', 'product_code', 'pa_delete_product_code_pk', 500);
		call global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

        /* ------------------------------------------------------------------------
        ------------------------------- Ingestion ---------------------------------
        ------------------------------------------------------------------------ */
		_log_step := 'pa upsert';
		perform set_config('local.log_step', _log_step, true);
        select 
          string_agg(generic_column_name, ', ') 
          into _attrs 
        from 
          global.product_generic_schema_mapping 
        where 
          required_in_product 
          and (
            is_attribute 
            or is_pk
          ) 
          and generic_column_name not in (
            'product_tag', 'ordering', 'sku_grade', 
            'clearance_article', 'product_direct_channel', 
            'articlestatustag'
          );

        perform public.parellel_insert('WITH rows AS (
          INSERT INTO global.product_attributes (
            product_code, attribute_name, attribute_value
          ) 
          select 
              x.product_code, 
              x.attribute_name, 
              case when gsm.generic_column_datatype = ''varchar[]'' then array(
                select 
                  jsonb_array_elements_text(x.attribute_value::jsonb)
              )::varchar else x.attribute_value end as attribute_value 
            from 
              (
                select 
                  product_code, 
                  j.key as attribute_name, 
                  j.value as attribute_value 
                from 
                  (
                    select 
                      product_code, 
                      to_jsonb(t) as j 
                    from 
                      (
                        select 
                          ' || _attrs || '
                        from 
                          (select * from public.product_validated_table {where}) pvt 
                          join global.product_master pm using(product_code) 
                        where 
                          pm.is_deleted = false
                      ) t
                  ) x, 
                  jsonb_each_text(j) as j 
                where 
                 value is not null 
                  and value != '''' 
                  and key not in(''product_code'')
              ) x 
              join global.product_generic_schema_mapping gsm on x.attribute_name = gsm.generic_column_name RETURNING 1
        ) 
        SELECT 
          count(1) as cnt 
        FROM 
          rows;', 50, 'public.product_validated_table', 'product_code', 'product_validated_table_pk', 500);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	 exception
	        when others then
	        -- Log the error if an exception occurs during any part of the procedure
			call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
			raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;		
end;
$procedure$;