--liquibase formatted sql
--changeset liquibase:akshay.jain runOnChange:true stripComments:false splitStatements:false context:release_1 labels:liquibase_project_start
--comment: first version of sending otp challenges
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.create_otp_challenge(p_user_id bigint, p_factor_type character varying, p_purpose character varying, p_otp_hash bytea, p_otp_salt bytea);
CREATE OR REPLACE FUNCTION global.create_otp_challenge(p_user_id bigint, p_factor_type character varying, p_purpose character varying, p_otp_hash bytea, p_otp_salt bytea)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_policy_record RECORD;
    v_active_challenge_count INTEGER;
    v_challenge_id INTEGER;
    v_expires_at TIMESTAMPTZ;
    v_result JSON;
	v_lifecycle_expiry TIMESTAMPTZ;
BEGIN
    -- Get MFA policy for the given factor type and purpose
    SELECT id, ttl_seconds, max_attempts, resend_cooldown_seconds, max_resends_per_otp, lifecycle_expiry
    INTO v_policy_record
    FROM global.mfa_policies 
    WHERE factor_type = p_factor_type 
    AND purpose = p_purpose 
    AND is_active = true;
    
    -- Check if policy exists
    IF v_policy_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No active MFA policy found for purpose: ' || p_purpose,
            'status_code', 400
        );
    END IF;
    
    -- Check for existing active OTP challenges for this user and purpose
    SELECT COUNT(*)
    INTO v_active_challenge_count
    FROM global.otp_challenges oc
    JOIN global.mfa_policies mp ON oc.policy_id = mp.id
    WHERE oc.user_id = p_user_id 
    AND mp.purpose = p_purpose
    AND oc.expires_at > NOW()
	AND oc.oc_lifecycle_expiry > NOW()
    AND oc.used_at IS NULL;
    
    -- If active challenge exists, return error
    IF v_active_challenge_count > 0 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'An active OTP challenge already exists. Please wait for it to expire or use the existing one.',
            'status_code', 409
        );
    END IF;
    
    -- Calculate expiration time
    v_expires_at := NOW() + (v_policy_record.ttl_seconds || ' seconds')::INTERVAL;

	v_lifecycle_expiry := NOW() + (v_policy_record.lifecycle_expiry || ' seconds')::INTERVAL;
    
    -- Create new OTP challenge
    INSERT INTO global.otp_challenges (
        user_id, policy_id, otp_hash, otp_salt, 
        attempts, resend_count, created_at, updated_at, 
        last_sent_at, expires_at, used_at, oc_lifecycle_expiry
    ) VALUES (
        p_user_id, v_policy_record.id, p_otp_hash, p_otp_salt,
        0, 0, NOW(), NOW(),
        NOW(), v_expires_at, NULL, v_lifecycle_expiry
    ) RETURNING id INTO v_challenge_id;
    
    -- Build success response
    v_result := json_build_object(
        'success', true,
        'challenge_id', v_challenge_id,
        'expires_at', v_expires_at,
        'resend_cooldown_seconds', v_policy_record.resend_cooldown_seconds,
        'max_attempts', v_policy_record.max_attempts,
        'max_resends_per_otp', v_policy_record.max_resends_per_otp,
        'message', 'OTP challenge created successfully',
        'status_code', 200,
		'lifecyle_expiry', v_lifecycle_expiry
    );
    
    RETURN v_result;
    
--EXCEPTION
--    WHEN OTHERS THEN
--        RETURN json_build_object(
--            'success', false,
--            'status_code', 500
--        );
END;
$function$
;
