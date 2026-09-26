--liquibase formatted sql
--changeset shreyansh.pandey:manage_order_batching_lock runOnChange:true stripComments:false splitStatements:false context:MTP-97972-2 labels:MTP-97972-2
--comment: lock acquire status logic fix 
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.manage_order_batching_lock(hierarchy text, user_id integer, lock_period integer, operation text) ;

CREATE OR REPLACE FUNCTION inventory_smart.manage_order_batching_lock(hierarchy text, user_id integer, lock_period integer, operation text)
 RETURNS TABLE(lock_received boolean, locked_by_user_name text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    row_rec RECORD;
    expiry_time TIMESTAMP;
    locked_by_user_name TEXT := '';
    user_name TEXT;
    locked_user_id INTEGER;
    _query_combine TEXT := '';
	lock_received BOOLEAN ;
    -- Compute base64 hash of product_filter
    latest_hierarchy_hash TEXT := encode(convert_to(hierarchy, 'UTF8'), 'base64');
BEGIN

    IF operation = 'ACQUIRE' THEN

    -- Try to find a matching row
	    SELECT * INTO row_rec
	    FROM inventory_smart.order_batching_access_data
	    WHERE hierarchy_hash = latest_hierarchy_hash
	      AND (expire_by > CURRENT_TIMESTAMP
		  AND status in (1,2) )
	    LIMIT 1;
	
	    IF row_rec IS NULL THEN
	        expiry_time := NOW() + (lock_period || ' minutes')::INTERVAL;
	        SELECT name INTO user_name FROM global.user_master WHERE user_code = user_id LIMIT 1;
	        -- Fetch user name for the user who acquired the lock
	        _query_combine := format(
	            'INSERT INTO inventory_smart.order_batching_access_data (hierarchies, hierarchy_hash,  expire_by, locked_by_user_id, status) VALUES (%L, %L, %L, %s, 1)',
	            hierarchy, latest_hierarchy_hash, expiry_time, user_id
	        );
	        EXECUTE _query_combine;
	        lock_received := true;
	        locked_by_user_name := user_name;
	    	raise notice 'locked_by_user_name --> %', locked_by_user_name;
	    
		ELSE
			IF row_rec.locked_by_user_id = user_id AND row_rec.status = 1 THEN
		        lock_received := true;
		        -- Fetch user name for the user who currently holds the lock
		        locked_user_id := row_rec.locked_by_user_id;
			ELSE
		        _query_combine := format(
		            'UPDATE inventory_smart.order_batching_access_data SET notifyee = CASE WHEN NOT coalesce(notifyee, ARRAY[]::integer[]) @> ARRAY[%s] THEN array_append(coalesce(notifyee, ARRAY[]::integer[]), %s) ELSE notifyee END WHERE id = %s',
		            user_id, user_id, row_rec.id
		        );
		        EXECUTE _query_combine;
		        lock_received := false;
		        -- Fetch user name for the user who currently holds the lock
		        locked_user_id := row_rec.locked_by_user_id;
		        SELECT name INTO locked_by_user_name FROM global.user_master WHERE user_code = locked_user_id LIMIT 1;
		    	raise notice 'locked_by_user_name --> %', locked_by_user_name;
	
	    	END IF;
		END IF ;
	ELSIF operation = 'EXTEND' THEN
        -- Try to extend the lock for current user
        SELECT * INTO row_rec
        FROM inventory_smart.order_batching_access_data
        WHERE hierarchy_hash = latest_hierarchy_hash
          AND locked_by_user_id = user_id
        ORDER BY id desc LIMIT 1;

        IF row_rec IS NOT NULL THEN
            _query_combine := format(
                'UPDATE inventory_smart.order_batching_access_data SET expire_by = expire_by + INTERVAL ''%s minutes'' WHERE id = %s',
                lock_period, row_rec.id
            );
            EXECUTE _query_combine;
			raise notice 'extending expiry ---> %', _query_combine ;

            lock_received := true;
            SELECT name INTO locked_by_user_name FROM global.user_master WHERE user_code = user_id LIMIT 1;
        ELSE
            lock_received := false;
            SELECT name INTO locked_by_user_name FROM global.user_master WHERE user_code = user_id LIMIT 1;
        END IF;

    ELSE
        RAISE EXCEPTION 'Invalid operation: %, expected ''acquire'' or ''extend''', operation;
    END IF;
    raise notice 'query combine --> %', _query_combine;

	RETURN QUERY SELECT lock_received, locked_by_user_name;
END;
$function$
;
