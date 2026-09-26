--liquibase formatted sql
--changeset liquibase:product_rule runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-24756
--comment: auto allocation status
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_auto_allocation_status(jsonb, jsonb, jsonb, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.update_auto_allocation_status(jsonb, jsonb, jsonb, boolean)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
	_query_combine_format text := '';
	_query_pa text := '';
  	_query_sa text := '';
  	_table_query text := '';
begin
	_query_pa := global.form_main_table_filters('product_attributes_filter', $1);
	--raise notice ' _query_pa : % ', _query_pa ;
	_query_sa := global.form_main_table_filters('store_attributes_filter', $2);
	--raise notice ' _query_sa : %  ', _query_sa ;
	_table_query := global.form_table_query($3);
	--raise notice ' _table_query : %  ', _table_query ;

	_query_combine_format='
		with ph_data as(
			select ph_code, channel from 
				( select * from     
								(select * from inventory_smart.ph_master ' || _query_pa || ') A
								' || _query_sa || '	
				)B
				' || _table_query || '							
		)
		, upsert_data AS (
		    SELECT ph_code, channel, now() as created_at  , ' || $4 || ' AS auto_allocation_status, true AS auto_allocation_update
		    FROM ph_data 
		)

		INSERT INTO inventory_smart.ph_configuration_mapping (ph_code, channel,created_at,  auto_allocation_status, auto_allocation_update)
		SELECT ph_code,channel,created_at, auto_allocation_status, auto_allocation_update
		FROM upsert_data
		ON CONFLICT (ph_code,channel)
		DO UPDATE SET
    		auto_allocation_status = EXCLUDED.auto_allocation_status,
    		auto_allocation_update = EXCLUDED.auto_allocation_update;
	';
	
	raise notice ' _query_combine_format : %  ', _query_combine_format ;
	execute _query_combine_format;	
END;
$function$
;
