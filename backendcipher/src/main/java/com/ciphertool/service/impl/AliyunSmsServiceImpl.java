package com.ciphertool.service.impl;

import com.alibaba.fastjson2.JSON;
import com.aliyuncs.IAcsClient;
import com.aliyuncs.dysmsapi.model.v20170525.SendSmsRequest;
import com.aliyuncs.dysmsapi.model.v20170525.SendSmsResponse;
import com.aliyuncs.exceptions.ClientException;
import com.ciphertool.config.AliyunSmsConfig;
import com.ciphertool.service.SmsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Aliyun SMS Service Implementation
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AliyunSmsServiceImpl implements SmsService {

    private final IAcsClient acsClient;
    private final AliyunSmsConfig smsConfig;

    @Value("${sms.code.expire-minutes:5}")
    private int expireMinutes;

    @Override
    public boolean sendSmsCode(String phone, String code) {
        try {
            SendSmsRequest request = new SendSmsRequest();
            request.setPhoneNumbers(phone);
            request.setSignName(smsConfig.getSignName());
            request.setTemplateCode(smsConfig.getTemplateCode());
            
            // Template params: code and min
            Map<String, String> params = new HashMap<>();
            params.put("code", code);
            params.put("min", String.valueOf(expireMinutes));
            request.setTemplateParam(JSON.toJSONString(params));

            SendSmsResponse response = acsClient.getAcsResponse(request);
            
            if ("OK".equals(response.getCode())) {
                log.info("SMS sent successfully: phone={}, bizId={}", maskPhone(phone), response.getBizId());
                return true;
            } else {
                log.error("SMS send failed: phone={}, code={}, message={}", 
                        maskPhone(phone), response.getCode(), response.getMessage());
                return false;
            }
        } catch (ClientException e) {
            log.error("SMS send exception: phone={}, error={}", maskPhone(phone), e.getMessage());
            return false;
        }
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) {
            return phone;
        }
        return phone.substring(0, 3) + "****" + phone.substring(7);
    }
}




















