package com.ciphertool.service.impl;

import com.alibaba.fastjson2.JSON;
import com.aliyuncs.IAcsClient;
import com.aliyuncs.dypnsapi.model.v20170525.SendSmsVerifyCodeRequest;
import com.aliyuncs.dypnsapi.model.v20170525.SendSmsVerifyCodeResponse;
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
 * Aliyun PNVS SMS Service Implementation
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AliyunSmsServiceImpl implements SmsService {

    private final IAcsClient acsClient;
    private final AliyunSmsConfig smsConfig;

    @Value("${auth.code.expire-minutes:5}")
    private int expireMinutes;

    @Override
    public boolean sendSmsCode(String phone, String code) {
        try {
            SendSmsVerifyCodeRequest request = new SendSmsVerifyCodeRequest();
            request.setPhoneNumber(phone);
            request.setSignName(smsConfig.getSignName());
            request.setTemplateCode(smsConfig.getTemplateCode());
            request.setCountryCode("86");
            request.setValidTime((long) expireMinutes * 60);
            request.setInterval(60L);
            request.setCodeType(1L);
            request.setCodeLength((long) code.length());
            request.setReturnVerifyCode(false);
            request.setAutoRetry(1L);

            Map<String, String> params = new HashMap<>();
            params.put("code", code);
            params.put("min", String.valueOf(expireMinutes));
            request.setTemplateParam(JSON.toJSONString(params));

            SendSmsVerifyCodeResponse response = acsClient.getAcsResponse(request);

            if ("OK".equals(response.getCode()) && !Boolean.FALSE.equals(response.getSuccess())) {
                String bizId = response.getModel() == null ? null : response.getModel().getBizId();
                log.info("SMS sent successfully: phone={}, bizId={}", maskPhone(phone), bizId);
                return true;
            }

            log.error("SMS send failed: phone={}, code={}, message={}",
                    maskPhone(phone), response.getCode(), response.getMessage());
            return false;
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
