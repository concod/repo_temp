--liquibase formatted sql
--changeset shreeraksha.n@impactanalytics.co :product_groups_products_list runOnChange:true stripComments:false splitStatements:false context:119715 labels:MTP-119715
--comment: view group api fix
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_groups_products_list(input integer, jsonb);
CREATE OR REPLACE FUNCTION global.product_groups_products_list(input integer, jsonb)
 RETURNS TABLE(product_code character varying, product_name character varying, product_description text, color character varying, size character varying, avg_st_perc real, rev_con_perc real)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_table_filters text := '';
	_query_combine text := '';
	begin
		_query_table_filters := global.form_table_query($2);
 		_query_combine := 'SELECT * FROM (
			select
				pg.product_code,
				pm.product_name,
				pm.product_description,
				col.color,
				sz.size,
				pg.avg_st_perc,
				pg.rev_con_perc
			from
				(
				select
					*
				from
					global.product_groups_mapping
				where
					pg_code = $1) pg
			join global.product_master pm on
				pg.product_code = pm.product_code
			left join (
				select
					product_code,
					attribute_value as color
				from
					global.product_attributes
				where
					attribute_name = ''color'') as col on
				pg.product_code = col.product_code
			left join (
				select
					product_code,
					attribute_value as size
				from
					global.product_attributes
				where
					attribute_name = ''size'') as sz on
				pg.product_code = sz.product_code
		) X ' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute _query_combine using pg_code;
	end $function$
;


DROP FUNCTION IF EXISTS global.product_groups_products_list(input jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.product_groups_products_list(input jsonb, jsonb, jsonb)
 RETURNS TABLE(product_code character varying, product_name character varying, product_description text, attributes json)
 LANGUAGE plpgsql
AS $function$
  	declare
  	_query_pm text := '';
  	_query_pa text := '';
  	_query_table_filters text := '';
  	_query_combine text := '';
  	_product_attribute_json_build_column text[] := array[]::text[];
   	_key text;
   	_value text;
  	begin
  		_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $1));
  		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
 		 	continue when _key = 'group';
  			_product_attribute_json_build_column := array_append(array_append(_product_attribute_json_build_column, quote_literal(_key)), 'X.' || quote_ident(_key));
  		end loop;
  		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
  		raise notice '%',_query_pa;
  		_query_table_filters := global.form_table_query($3);
   		_query_combine := '
  			select
 				X.product_code,
  				X.product_name,
				X.product_description,
  				json_build_object(' || array_to_string(_product_attribute_json_build_column, ' ,') ||') as attributes
  			from
  				(
  				select
  					pm.*
  				from
  							(
  					select
  						main.product_name,
  						main.product_description,
  						attributes.*
  					from
  						(' || _query_pm || ') main
  					join (' || _query_pa || ') attributes on
  						main.product_code = attributes.product_code) pm
  		) X' || _query_table_filters;
  		raise notice '%',_query_combine;
  		return query execute _query_combine;
  	end $function$
;

--changeset shreeraksha.n@impactanalytics.co:MTP-45903 from return type runOnChange:true stripComments:false splitStatements:false context:release1_1 labels:MTP-45903
--comment: view group api fix
DROP FUNCTION IF EXISTS global.product_groups_products_list(input jsonb, jsonb, jsonb, integer);
CREATE OR REPLACE FUNCTION global.product_groups_products_list(input jsonb, jsonb, jsonb, integer)
 RETURNS TABLE(product_code character varying, product_name character varying, product_description text, attributes json, is_mapped boolean)
 LANGUAGE plpgsql
AS $function$
   	declare
   	_query_pm text := '';
   	_query_pa text := '';
   	_query_table_filters text := '';
   	_query_combine text := '';
   	_product_attribute_json_build_column text[] := array[]::text[];
    	_key text;
    	_value text;
   	begin
  		_query_pm := 'SELECT * FROM global.product_master' || (global.form_main_table_filters('product_master', $1));
  		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
 		  	continue when _key = 'group';
   			_product_attribute_json_build_column := array_append(array_append(_product_attribute_json_build_column, ''''||_key||''''),'X.'|| _key ||'');
   		end loop;
   		_query_pa := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
  		_query_table_filters := global.form_table_query($3);
    		_query_combine := '
   				select
   					X.product_code,
   					X.product_name,
                    X.product_description,
   					json_build_object(' || array_to_string(_product_attribute_json_build_column, ' ,') ||') as attributes,
   					X.is_mapped	
   				from
   					(
   					select
   								pm.*,
   								(case
   							when pgm.product_code is null then false
   							else true
   						end) as is_mapped
   					from
   								(
   						select
   							main.product_name,
   							main.product_description,
   							attributes.*
   						from
   							(' || _query_pm || ') main
   						join (' || _query_pa || ') attributes on
   							main.product_code = attributes.product_code) pm
   					left join (
   						select
   							product_code
   						from
   							"global".product_groups_mapping
   						where
   							pg_code = ' || $4 || ') pgm on
   							pm.product_code = pgm.product_code
   			) X ' || _query_table_filters;
   		raise notice '%',_query_combine;
   		return query execute _query_combine;
   	end $function$
;

DROP FUNCTION IF EXISTS global.product_groups_products_list(input integer, jsonb);
CREATE OR REPLACE FUNCTION global.product_groups_products_list(input integer, jsonb)
 RETURNS TABLE(product_code character varying, product_name character varying, product_description text, color character varying, size character varying, avg_st_perc real, rev_con_perc real)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_table_filters text := '';
	_query_combine text := '';
	begin
		_query_table_filters := global.form_table_query($2);
 		_query_combine := 'SELECT * FROM (
			select
				pg.product_code,
				pm.product_name,
				pm.product_description,
				col.color,
				sz.size,
				pg.avg_st_perc,
				pg.rev_con_perc
			from
				(
				select
					*
				from
					global.product_groups_mapping
				where
					pg_code = $1) pg
			join global.product_master pm on
				pg.product_code = pm.product_code
			left join (
				select
					product_code,
					attribute_value as color
				from
					global.product_attributes
				where
					attribute_name = ''color'') as col on
				pg.product_code = col.product_code
			left join (
				select
					product_code,
					attribute_value as size
				from
					global.product_attributes
				where
					attribute_name = ''size'') as sz on
				pg.product_code = sz.product_code
		) X ' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute _query_combine using pg_code;
	end $function$
;
