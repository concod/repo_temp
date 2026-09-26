--liquibase formatted sql
--changeset shreyas.sankpal@impactanalytics.co:product_store_mapping_pg_stores_list_RL_MTP-52725 runOnChange:true stripComments:false splitStatements:false context:release_1_0 labels:mapping_is_upload_feature
--comment: added created type and updated_type
--rollback: SELECT 1
DROP FUNCTION IF EXISTS "global".product_store_mapping_pg_stores_list(_int4, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.product_store_mapping_pg_stores_list(input integer[], jsonb, jsonb, jsonb)
 RETURNS TABLE(store_code character varying, product_code character varying, size character varying, store_name character varying, attributes json, validity datemultirange, updated_by character varying, updated_at timestamp with time zone, created_type boolean, updated_type boolean)
 LANGUAGE plpgsql
AS $function$
  declare
  	_query_sm text := '';
  	_query_sa text := '';
  	_query_table_filters text := '';
  	_query_combine text;
  	_store_attributes_column text[]:= array['sm.store_code']::text[];
  	_store_attribute_json_build_column_for_filter  text[]:= array['''store_code''', 'X.store_code']::text[];
  	_key text;
  	_value text;
  	begin
  		for _key, _value in SELECT * FROM jsonb_each_text($3) WHERE value IS NOT NULL loop
  			continue when _key = 'group';
  			_store_attributes_column := array_append(_store_attributes_column, 'sm.'||_key||'');
  			_store_attribute_json_build_column_for_filter := array_append(array_append(_store_attribute_json_build_column_for_filter, ''''||_key||''''),'X.'|| _key ||'');
  		end loop;
  		_query_sm := 'SELECT * FROM "global".store_master' || ("global".form_main_table_filters('store_master', $2));
   		_query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $3);
  		_query_table_filters := "global".form_table_query($4);
  		_query_combine := 'SELECT X.store_code, X.product_code, X.size, X.store_name , json_build_object(' || array_to_string(_store_attribute_json_build_column_for_filter, ' ,') ||'), X.validity, X.updated_by, X.updated_at, X.created_type, X.updated_type FROM (
  					select sm.*,
  					psm.product_code,
					psm.size,
  					psm.validity,
					psm.updated_by,
					psm.updated_at,
					psm.created_type,
					psm.updated_type
  				 from (SELECT main.store_name, attributes.* FROM (' || _query_sm || ') main JOIN (' || _query_sa || ') attributes ON main.store_code = attributes.store_code) sm
  						left join (
  				select
  					psm.product_code,
					paf.size,
					psm.store_code,
					psm.validity,
					um.name as updated_by,
					pg_xact_commit_timestamp(psm.xmin) as updated_at,
					uc1.updation_value as created_type,
					uc2.updation_value as updated_type
  				from
  					(select distinct product_code from global.product_groups_mapping where pg_code = any(''' || $1::varchar || '''::int[])) pgm
  				join global.product_mapping_product_store psm
  				on
  					pgm.product_code = psm.product_code
				join global.product_attributes_filter paf on paf.product_code = psm.product_code
				left join global.user_master um on psm.updated_by = um.user_code
				left join global.updation_config uc1 on uc1.updation_key = psm.creation_source_id
				left join global.updation_config uc2 on uc2.updation_key = psm.current_updation_id
  				) psm
  						on
  					sm.store_code = psm.store_code
  					where psm.validity is not null
  						) X ' || _query_table_filters;
  		raise notice '%', _query_combine;
  		RETURN QUERY execute _query_combine;
   	end
  $function$
;