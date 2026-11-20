package com.ciphertool.service;

import com.ciphertool.dto.AgentRechargeCredits;
import com.ciphertool.dto.AgentRechargeOrderInfo;
import com.ciphertool.dto.AgentRechargePlanInfo;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AgentRechargeServiceTest {

    @Test
    void plansExposeRequestedPricesAndAllowances() {
        TestContext context = newContext();

        List<AgentRechargePlanInfo> plans = context.service.listPlans();

        assertThat(plans).hasSize(2);
        assertThat(plans.get(0).getPrice()).isEqualTo(9.9);
        assertThat(plans.get(0).getAgentCredits()).isEqualTo(3);
        assertThat(plans.get(0).getImageCredits()).isEqualTo(100);
        assertThat(plans.get(0).getVideoCredits()).isEqualTo(20);
        assertThat(plans.get(1).getPrice()).isEqualTo(19.9);
        assertThat(plans.get(1).getAgentCredits()).isEqualTo(8);
        assertThat(plans.get(1).getImageCredits()).isEqualTo(250);
        assertThat(plans.get(1).getVideoCredits()).isEqualTo(50);
    }

    @Test
    void paidOrderCreditsOnceAndDoesNotDoubleCreditOnRepeat() {
        TestContext context = newContext();
        AgentRechargeOrderInfo order = context.service.createOrder("buyer@example.com", "agent-pack-9", "wechat", "idem-1", "");

        context.service.updateOrderStatus("reviewer@example.com", order.getId(), "PAID", "trade-1", "paid");

        AgentRechargeCredits credits = context.store.creditsFor("buyer@example.com");
        assertThat(credits.getAgent()).isEqualTo(3);
        assertThat(credits.getImage()).isEqualTo(100);
        assertThat(credits.getVideo()).isEqualTo(20);
        assertThat(context.count("select count(*) from agent_recharge_ledger where entry_type = 'ORDER_CREDIT'")).isEqualTo(1);

        context.service.updateOrderStatus("reviewer@example.com", order.getId(), "PAID", "trade-1", "paid again");

        AgentRechargeCredits afterRepeat = context.store.creditsFor("buyer@example.com");
        assertThat(afterRepeat.getAgent()).isEqualTo(3);
        assertThat(afterRepeat.getImage()).isEqualTo(100);
        assertThat(afterRepeat.getVideo()).isEqualTo(20);
        assertThat(context.count("select count(*) from agent_recharge_ledger where entry_type = 'ORDER_CREDIT'")).isEqualTo(1);
    }

    @Test
    void callbackRejectsReplayNonceWithoutDoubleCredit() {
        TestContext context = newContext();
        AgentRechargeOrderInfo order = context.service.createOrder("buyer@example.com", "agent-pack-19", "manual-test", "idem-replay", "");
        long timestamp = System.currentTimeMillis();
        String payload = order.getId() + "|19.9000|manual-test|trade_replay|PAID|" + timestamp + "|nonce_replay";
        String signature = hmacSha256(payload, "test-secret");

        AgentRechargeOrderInfo paid = context.service.handlePaymentCallback(
                order.getId(), 19.9, "manual-test", "trade_replay", "PAID", timestamp, "nonce_replay", signature);

        assertThat(paid.getStatus()).isEqualTo("PAID");
        assertThat(context.store.creditsFor("buyer@example.com").getAgent()).isEqualTo(8);

        assertThatThrownBy(() -> context.service.handlePaymentCallback(
                order.getId(), 19.9, "manual-test", "trade_replay", "PAID", timestamp, "nonce_replay", signature))
                .hasMessageContaining("重放");

        AgentRechargeCredits credits = context.store.creditsFor("buyer@example.com");
        assertThat(credits.getAgent()).isEqualTo(8);
        assertThat(credits.getImage()).isEqualTo(250);
        assertThat(credits.getVideo()).isEqualTo(50);
    }

    @Test
    void cancelledOrderDoesNotCredit() {
        TestContext context = newContext();
        AgentRechargeOrderInfo order = context.service.createOrder("buyer@example.com", "agent-pack-9", "wechat", "idem-cancel", "");

        context.service.updateOrderStatus("reviewer@example.com", order.getId(), "CANCELLED", "", "cancelled");

        AgentRechargeCredits credits = context.store.creditsFor("buyer@example.com");
        assertThat(credits.getAgent()).isZero();
        assertThat(credits.getImage()).isZero();
        assertThat(credits.getVideo()).isZero();
    }

    @Test
    void idempotencyKeyReturnsTheSameOrder() {
        TestContext context = newContext();

        AgentRechargeOrderInfo first = context.service.createOrder("buyer@example.com", "agent-pack-9", "wechat", "same-key", "");
        AgentRechargeOrderInfo second = context.service.createOrder("buyer@example.com", "agent-pack-9", "wechat", "same-key", "");

        assertThat(second.getId()).isEqualTo(first.getId());
        assertThat(context.count("select count(*) from agent_recharge_orders")).isEqualTo(1);
    }

    private TestContext newContext() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:agent_recharge_" + System.nanoTime() + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
                "sa",
                ""
        );
        dataSource.setDriverClassName("org.h2.Driver");
        new ResourceDatabasePopulator(new ClassPathResource("schema.sql")).execute(dataSource);

        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        ApiRouterPaymentService paymentService = new ApiRouterPaymentService();
        ReflectionTestUtils.setField(paymentService, "orderExpireMinutes", 30L);
        ReflectionTestUtils.setField(paymentService, "publicBaseUrl", "http://localhost:8080");
        ReflectionTestUtils.setField(paymentService, "checkoutUrlTemplate", "");
        ReflectionTestUtils.setField(paymentService, "manualInstructions", "manual");

        AgentRechargeCreditStore store = new AgentRechargeCreditStore(jdbcTemplate);
        AgentRechargeService service = new AgentRechargeService(jdbcTemplate, paymentService, store);
        ReflectionTestUtils.setField(service, "paymentCallbackSecret", "test-secret");
        ReflectionTestUtils.setField(service, "paymentCallbackWindowMinutes", 15L);
        return new TestContext(service, store, jdbcTemplate);
    }

    private String hmacSha256(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return java.util.HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private record TestContext(AgentRechargeService service, AgentRechargeCreditStore store, JdbcTemplate jdbcTemplate) {
        private int count(String sql, Object... args) {
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, args);
            return count == null ? 0 : count;
        }
    }
}
