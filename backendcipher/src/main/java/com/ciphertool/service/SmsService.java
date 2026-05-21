package com.ciphertool.service;

/**
 * SMS Service Interface
 */
public interface SmsService {

    /**
     * Send SMS verification code
     *
     * @param phone phone number
     * @param code  verification code
     * @return true if sent successfully
     */
    boolean sendSmsCode(String phone, String code);
}




















