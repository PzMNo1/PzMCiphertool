package com.ciphertool.service;

import com.ciphertool.dto.ApiRouterDashboard;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ApiRouterServicePaymentTest {

    @Test
    void paymentCallbackRejectsReplayNonceWithoutDuplicateCredit() {
        TestContext context = newContext();
        ApiRouterDashboard.OrderInfo order = context.service.createOrder(
                "buyer@example.com",
                10.0,
                "manual-test",
                "idem-replay",
                "replay test"
        );
        long timestamp = System.currentTimeMillis();
        String payload = order.getId() + "|10.0000|manual-test|trade_replay_1|PAID|" + timestamp + "|nonce_replay_1";
        String signature = hmacSha256(payload, "test-secret");

        ApiRouterDashboard.OrderInfo paid = context.service.handlePaymentCallback(
                order.getId(),
                10.0,
                "manual-test",
                "trade_replay_1",
                "PAID",
                timestamp,
                "nonce_replay_1",
                signature
        );

        assertThat(paid.getStatus()).isEqualTo("PAID");
        assertThat(context.count("select count(*) from api_router_ledger where usage_id = ? and entry_type = 'ORDER_CREDIT'", order.getId()))
                .isEqualTo(1);

        assertThatThrownBy(() -> context.service.handlePaymentCallback(
                order.getId(),
                10.0,
                "manual-test",
                "trade_replay_1",
                "PAID",
                timestamp,
                "nonce_replay_1",
                signature
        )).hasMessageContaining("重放");

        assertThat(context.count("select count(*) from api_router_ledger where usage_id = ? and entry_type = 'ORDER_CREDIT'", order.getId()))
                .isEqualTo(1);
        assertThat(context.count("select count(*) from api_router_payment_callbacks where replay = true"))
                .isEqualTo(1);
    }

    private TestContext newContext() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:api_router_payment_" + System.nanoTime() + ";MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
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

        ApiRouterService service = new ApiRouterService(new ObjectMapper(), jdbcTemplate, paymentService);
        ReflectionTestUtils.setField(service, "paymentCallbackSecret", "test-secret");
        ReflectionTestUtils.setField(service, "paymentCallbackWindowMinutes", 15L);
        return new TestContext(service, jdbcTemplate);
    }

    private String hmacSha256(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private record TestContext(ApiRouterService service, JdbcTemplate jdbcTemplate) {
        private int count(String sql, Object... args) {
            Integer count = jdbcTemplate.queryForObject(sql, Integer.class, args);
            return count == null ? 0 : count;
        }
    }
}
