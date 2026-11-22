package com.ciphertool.service;

import com.ciphertool.dto.AgentRechargeCredits;
import com.ciphertool.dto.UsageStatus;
import com.ciphertool.dto.UsageSummary;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UsageQuotaServiceTest {

    private StringRedisTemplate redisTemplate;
    private ValueOperations<String, String> valueOperations;
    private AgentRechargeCreditStore creditStore;
    private UsageQuotaService service;
    private HttpServletRequest request;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        valueOperations = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        AuthService authService = mock(AuthService.class);
        when(authService.resolveSessionAccount(any())).thenReturn("buyer@example.com");
        when(authService.requireSessionAccount(any())).thenReturn("buyer@example.com");

        RiskControlService riskControlService = mock(RiskControlService.class);
        when(riskControlService.clientIp(any())).thenReturn("127.0.0.1");

        creditStore = mock(AgentRechargeCreditStore.class);
        service = new UsageQuotaService(redisTemplate, authService, riskControlService, creditStore);
        ReflectionTestUtils.setField(service, "agentDailyLimit", 2);
        ReflectionTestUtils.setField(service, "agentmasterDailyLimit", 5);
        ReflectionTestUtils.setField(service, "imageDailyLimit", 10);
        ReflectionTestUtils.setField(service, "videoDailyLimit", 5);
        ReflectionTestUtils.setField(service, "authorAccount", "");
        ReflectionTestUtils.setField(service, "developerIdentity", "");

        request = mock(HttpServletRequest.class);
    }

    @Test
    void agentConsumesPurchasedCreditAfterDailyFreeQuotaIsExhausted() {
        when(valueOperations.setIfAbsent(anyString(), eq("1"), any(Duration.class))).thenReturn(true);
        when(valueOperations.get(startsWith("usage:daily:agent:"))).thenReturn("2");
        when(creditStore.creditsFor("buyer@example.com")).thenReturn(new AgentRechargeCredits(1, 0, 0, 0));
        when(creditStore.consume("buyer@example.com", "agent", 1)).thenReturn(true);

        UsageStatus status = service.consume("Bearer token", request, "agent", "turn-1");

        assertThat(status.isAllowed()).isTrue();
        assertThat(status.getLimit()).isEqualTo(2);
        assertThat(status.getUsed()).isEqualTo(2);
        verify(creditStore).consume("buyer@example.com", "agent", 1);
    }

    @Test
    void agentmasterConsumesPurchasedCreditAfterDailyFreeQuotaIsExhausted() {
        when(valueOperations.setIfAbsent(anyString(), eq("1"), any(Duration.class))).thenReturn(true);
        when(valueOperations.get(startsWith("usage:daily:agentmaster:"))).thenReturn("5");
        when(creditStore.creditsFor("buyer@example.com")).thenReturn(new AgentRechargeCredits(0, 1, 0, 0));
        when(creditStore.consume("buyer@example.com", "agentmaster", 1)).thenReturn(true);

        UsageStatus status = service.consume("Bearer token", request, "agentmaster", "turn-master");

        assertThat(status.isAllowed()).isTrue();
        assertThat(status.getLimit()).isEqualTo(5);
        assertThat(status.getUsed()).isEqualTo(5);
        verify(creditStore).consume("buyer@example.com", "agentmaster", 1);
    }

    @Test
    void agentRejectsWhenFreeQuotaAndPurchasedCreditsAreBothExhausted() {
        when(valueOperations.setIfAbsent(anyString(), eq("1"), any(Duration.class))).thenReturn(true);
        when(valueOperations.get(startsWith("usage:daily:agent:"))).thenReturn("2");
        when(creditStore.creditsFor("buyer@example.com")).thenReturn(new AgentRechargeCredits(0, 0, 0, 0));
        when(creditStore.consume("buyer@example.com", "agent", 1)).thenReturn(false);

        UsageStatus status = service.consume("Bearer token", request, "agent", "turn-1");

        assertThat(status.isAllowed()).isFalse();
        assertThat(status.getMessage()).contains("充值");
    }

    @Test
    void mediaRejectsWhenFreeAndPurchasedCreditsAreInsufficient() {
        when(valueOperations.get(startsWith("usage:daily:image:"))).thenReturn("10");
        when(creditStore.creditsFor("buyer@example.com")).thenReturn(new AgentRechargeCredits(0, 0, 2, 0));

        assertThatThrownBy(() -> service.consumeMedia("Bearer token", request, UsageQuotaService.Surface.IMAGE, 3))
                .isInstanceOf(UsageQuotaService.UsageLimitException.class)
                .hasMessageContaining("充值");
    }

    @Test
    void mediaConsumesFreeQuotaThenPurchasedCredits() {
        when(valueOperations.get(startsWith("usage:daily:image:"))).thenReturn("8");
        when(creditStore.creditsFor("buyer@example.com")).thenReturn(new AgentRechargeCredits(0, 0, 3, 0));
        when(creditStore.consume("buyer@example.com", "image", 2)).thenReturn(true);
        when(valueOperations.increment(anyString(), eq(2L))).thenReturn(3L);

        UsageQuotaService.QuotaCharge charge = service.consumeMedia("Bearer token", request, UsageQuotaService.Surface.IMAGE, 4);

        assertThat(charge.freeUsed()).isEqualTo(2);
        assertThat(charge.creditUsed()).isEqualTo(2);
        verify(valueOperations).increment(startsWith("usage:daily:image:"), eq(2L));
        verify(creditStore).consume("buyer@example.com", "image", 2);
    }

    @Test
    void mediaRefundRestoresFreeQuotaAndPurchasedCredits() {
        UsageQuotaService.QuotaCharge charge = new UsageQuotaService.QuotaCharge(
                "buyer@example.com", "u:buyer@example.com", UsageQuotaService.Surface.IMAGE, "2026-11-20", 2, 3);

        service.refundMedia(charge);

        verify(valueOperations).decrement(startsWith("usage:daily:image:"), eq(2L));
        verify(creditStore).refund("buyer@example.com", "image", 3);
    }

    @Test
    void summaryExposesFreeRemainingAndPurchasedCredits() {
        when(valueOperations.get(anyString())).thenReturn("0");
        when(creditStore.creditsFor("buyer@example.com")).thenReturn(new AgentRechargeCredits(3, 5, 100, 20));

        UsageSummary summary = service.summary("Bearer token");

        assertThat(summary.getAgent().getRemaining()).isEqualTo(2);
        assertThat(summary.getAgent().getCredits()).isEqualTo(3);
        assertThat(summary.getAgentmaster().getRemaining()).isEqualTo(5);
        assertThat(summary.getAgentmaster().getCredits()).isEqualTo(5);
        assertThat(summary.getImage().getCredits()).isEqualTo(100);
        assertThat(summary.getVideo().getCredits()).isEqualTo(20);
    }
}
