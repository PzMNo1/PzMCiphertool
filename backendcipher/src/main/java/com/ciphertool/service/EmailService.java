package com.ciphertool.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String from;

    /**
     * 发送验证码邮件
     *
     * @param toEmail 接收邮箱
     * @param code    验证码
     * @return 是否发送成功
     */
    public boolean sendCode(String toEmail, String code) {
        try {
            // 使用简单文本邮件
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(toEmail);
            message.setSubject("CipherTool 登录验证码");
            message.setText("【CipherTool】您的验证码是：" + code + "。5分钟内有效，请勿泄露给他人。");

            mailSender.send(message);
            log.info("Email sent successfully: email={}", toEmail);
            return true;
        } catch (Exception e) {
            log.error("Email send failed: email={}, error={}", toEmail, e.getMessage(), e);
            return false;
        }
    }
}








