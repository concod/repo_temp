--liquibase formatted sql
--changeset liquibase:akshay.jain runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for resend_otp_complete
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.resend_otp_complete(p_user_id bigint, p_purpose character varying, p_otp_hash bytea, p_otp_salt bytea);
CREATE OR REPLACE FUNCTION global.resend_otp_complete(p_user_id bigint, p_purpose character varying, p_otp_hash bytea, p_otp_salt bytea)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_challenge_record RECORD;
    v_new_expires_at TIMESTAMPTZ;
    v_cooldown_end TIMESTAMPTZ;
    v_remaining_seconds INTEGER;
    v_remaining_resends INTEGER;
    v_result JSON;
	v_remaining_lifecycle_seconds INTEGER;
BEGIN
    -- Combined query: Get user, challenge, and policy details in single operation
    SELECT 
        oc.id, oc.used_at, oc.expires_at, oc.last_sent_at, oc.resend_count,
        mp.resend_cooldown_seconds, mp.max_resends_per_otp, mp.ttl_seconds,
        um.user_code, oc.oc_lifecycle_expiry
    INTO v_challenge_record
    FROM global.user_master um
    JOIN global.otp_challenges oc ON oc.user_id = um.user_code
    JOIN global.mfa_policies mp ON oc.policy_id = mp.id
    WHERE um.user_code = p_user_id
    AND um.is_deleted = false
    AND mp.purpose = p_purpose
    AND oc.expires_at > NOW()
    AND oc.used_at IS NULL
    ORDER BY oc.created_at DESC
    LIMIT 1;


	
    
    -- Check if user exists and has active challenge
    IF v_challenge_record.id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not found or no active OTP challenge exists',
            'status_code', 404
        );
    END IF;
    
    -- Check resend cooldown
    v_cooldown_end := v_challenge_record.last_sent_at + (v_challenge_record.resend_cooldown_seconds || ' seconds')::INTERVAL;
    IF NOW() < v_cooldown_end THEN
        v_remaining_seconds := EXTRACT(EPOCH FROM (v_cooldown_end - NOW()))::INTEGER;
        RETURN json_build_object(
            'success', false,
            'message', 'Please wait ' || v_remaining_seconds || ' seconds before requesting another OTP',
            'status_code', 429
        );
    END IF;

	v_remaining_lifecycle_seconds := EXTRACT(EPOCH FROM (v_challenge_record.oc_lifecycle_expiry - NOW()));

    
    -- Check maximum resends
    IF v_challenge_record.resend_count >= v_challenge_record.max_resends_per_otp THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Maximum resend limit reached. Please request a new OTP after ' || v_remaining_lifecycle_seconds || ' seconds',
            'status_code', 400
        );
    END IF;

	v_new_expires_at := NOW() + (v_challenge_record.ttl_seconds || ' seconds')::INTERVAL;
        
    -- Update challenge with new OTP details atomically
	
    UPDATE global.otp_challenges 
    SET 
        resend_count = v_challenge_record.resend_count + 1,
        otp_hash = p_otp_hash,
        otp_salt = p_otp_salt,
        expires_at = v_new_expires_at,
        last_sent_at = NOW(),
        updated_at = NOW(),
        attempts = 0  -- Reset attempts for new OTP
    WHERE id = v_challenge_record.id;
    
    -- Calculate remaining resends
    v_remaining_resends := v_challenge_record.max_resends_per_otp - (v_challenge_record.resend_count + 1);
    
    -- Build success response with generated OTP for logging/email sending
    v_result := json_build_object(
        'success', true,
        'message', 'OTP Data Update successfully',
        'expires_at', v_new_expires_at,
        'resend_cooldown_seconds', v_challenge_record.resend_cooldown_seconds,
        'remaining_resends', v_remaining_resends,
        'status_code', 200
    );
    
    RETURN v_result;
    
END;
$function$
;
