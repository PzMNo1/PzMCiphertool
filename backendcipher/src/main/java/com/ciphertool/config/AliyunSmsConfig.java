package com.ciphertool.config;

import com.aliyuncs.DefaultAcsClient;
import com.aliyuncs.IAcsClient;
import com.aliyuncs.profile.DefaultProfile;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Aliyun SMS Configuration
 */
@Getter
@Setter
@Configuration
@ConfigurationProperties(prefix = "aliyun.sms")
public class AliyunSmsConfig {

    private String accessKeyId;

    private String accessKeySecret;

    private String signName;

    private String templateCode;

    private String regionId = "cn-hangzhou";

    @Bean
    public IAcsClient acsClient() {
        DefaultProfile profile = DefaultProfile.getProfile(
                regionId,
                accessKeyId,
                accessKeySecret
        );
        return new DefaultAcsClient(profile);
    }
}

