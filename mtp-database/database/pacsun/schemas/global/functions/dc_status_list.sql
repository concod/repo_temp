--liquibase formatted sql
--changeset ShreyanshPandey:dc_status_list_v1 runOnChange:true stripComments:false splitStatements:false context:dc_status_list labels:MTP-77363
--comment: MTP-77363
--rollback: SELECT 1


DROP FUNCTION IF EXISTS "global".dc_status_list(refcursor, jsonb, jsonb, bool);

CREATE OR REPLACE FUNCTION global.dc_status_list(input refcursor, jsonb, jsonb, boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
	_query_sa text := '';
	_query_table_filters text := '';
	_query_combine text;
	_final_query text := '';
	begin
		_query_sa := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
		_query_table_filters := "global".form_table_query($3);
 		_query_combine := '
			select
				*
			from
				(
				select
					dc.*,
					pta.status,
					pta.start_time,
					pta.updated_at,
					um.name as updated_by,

					case when concat(pta.end_time) = ''2099-12-31'' then ''-''::varchar else concat(pta.end_time)::varchar end as end_time
				from (
select
	main.dc_code,
	main.name,
	main.store_name,
	attributes.*
from
	(
	select
		dc.dc_code,
				dc.name,
				sm.store_code,
				sm.store_name
	from
		"global".distribution_centres dc
	join "global".store_master sm on
		dc.dc_code = sm.dc_code
) main
join (' || _query_sa || ') attributes on
	main.store_code = attributes.store_code
) dc
				left join (
				    select 
				      store_code, 
					  start_time as start_time, 
					  end_time as end_time, 
					  attribute_value as status,
					  updated_at,
					  updated_by
				    from 
				      "global".store_time_attributes 
				    where 
				      attribute_name = ''status''
				) pta
				on dc.store_code = pta.store_code
			left join global.user_master um on um.user_code = pta.updated_by

			) X' || _query_table_filters;
		
		raise notice '%',_query_combine;
		if $4 is false then 
                _final_query := _query_combine;
            else
            	_final_query := 'select count(*) from (' || _query_combine || ') temp' ;
        end if;
            
		open $1 for execute _final_query;
		RETURN $1;
	end
$function$
;