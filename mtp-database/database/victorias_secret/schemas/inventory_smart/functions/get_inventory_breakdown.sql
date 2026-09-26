--liquibase formatted sql
--changeset liquibase:get_inventory_breakdown runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_inventory_breakdown
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_inventory_breakdown(input character, character varying, character varying);
CREATE OR REPLACE FUNCTION inventory_smart.get_inventory_breakdown(input character, character varying, character varying)
 RETURNS TABLE(dc_code integer, channel character varying, article character varying, pack_type_id character varying, size character varying, type character varying, units_in_pack integer, reserve_qty integer, available_inventory integer)
 LANGUAGE plpgsql
AS $function$
/*
 * 

 select
 	*
 from
 	inventory_smart.get_inventory_breakdown('''29588-13131''', 'Factory Line Retail', '');
 	
 */
 declare
	 _query text := '';
	_article_filter text := $1;--list of articles in quotes 'art1', 'art2'
	_channel text := $2;
	_dc_filter text := $3;
	v_gen_random_uuid text  := gen_random_uuid()::varchar;
 begin
	 
	     if (_dc_filter = '') IS FALSE
         then
                 _dc_filter := ' and dc_code =  '||_dc_filter||' ' ;
         end if;
        

        
        _query := 'select
					dc_code,
					channel,
					article,
					pack_type_id,
					size,
					sa.type::varchar,
					units_in_pack::integer,
					sum(coalesce(sdru.quantity, 0))::integer as reserve_qty,
					sum(coalesce(sa.oh, 0))::integer as available_inventory
				from
					inventory_smart.sku_dc_available_units sa
				left join inventory_smart.sku_dc_reserved_units sdru
						using (dc_code,
					channel,
					article,
					size)
				left join (select dc_code, channel, article, size, pack_type_id, SUM(quantity) as quantity from inventory_smart.sku_dc_allocated_units GROUP BY dc_code, channel, article, size, pack_type_id) sdal
						using (dc_code,
					channel,
					article,
					size,
					pack_type_id)
				where 			
					article in ('|| _article_filter ||')
					and channel = '''|| _channel ||'''
					'|| _dc_filter ||'
				group by
					1,
					2,
					3,
					4,
					5,
					6,
					7';
		 		
 		raise notice '%',  _query;
		perform  global.sp_log(v_gen_random_uuid,'inventory_smart.get_inventory_breakdown', 'Before Return',_query,jsonb_build_object('_article_filter', $1, '_channel', $2,'_dc_filter',$3));
 		RETURN QUERY execute _query;        
  	end
 $function$
;
