--liquibase formatted sql
--changeset liquibase:get_dcs runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_dcs
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_dcs(input jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_dcs(input jsonb)
 RETURNS TABLE(dc_code integer, name character varying, linked_store_code character varying)
 LANGUAGE plpgsql
AS $function$
/*
 * 
 * $1 - dc attributes

 select
 	*
 from
 	inventory_smart.get_dcs('{"dc_code": [{"operator": "in", "type": "list", "values": [92,96]}]}');
 	
 */
 declare
	 _query text := '';
	 _query_dc text := '';
	
 begin
	 _query_dc  := global.form_main_table_filters('distribution_centres', $1);
	 
	     if (_query_dc = '') IS FALSE
         then
                 _query_dc := '   '||_query_dc||' and is_active=true and is_deleted=false ' ;
         else
         	_query_dc := ' WHERE is_active=true and is_deleted=false ';
         end if;
        

        
        _query := 'select
					dc_code,
					name,
					linked_store_code
				from
					global.distribution_centres
					' || _query_dc ||'
				';
		 		
 		raise notice '%',  _query;
 		RETURN QUERY execute _query;
		
        
  	end
 $function$
;
