package com.ciphertool.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.event.ApplicationPreparedEvent;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.boot.logging.DeferredLog;
import org.springframework.context.ApplicationListener;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 把项目根目录的 .env 加载进 Spring 环境，并让它优先于操作系统环境变量。
 *
 * 背景：start.bat 会读取 .env 并覆盖进程环境变量，但直接运行
 * `java -jar target/ciphertool-backend-1.0.0.jar` 时不会经过 start.bat。
 * 而 application.yml 里的 `spring.config.import: optional:file:../.env[.properties]`
 * 虽然会读 .env，但按 Spring Boot 的优先级，操作系统环境变量高于配置文件，
 * 结果是：机器上残留的全局 OPENAI_API_KEY 覆盖了 .env 的 key，
 * 而 base-url 仍来自 .env 或默认值，形成"用 A 家的 key 请求 B 家接口"的错配，
 * 上游只会返回 401，且原因是隐式的。
 *
 * 这里复刻 start.bat 的语义（.env 是本地配置的唯一事实来源），使任何启动方式
 * 都能得到自洽的配置。优先级：命令行参数 > .env > 操作系统环境变量 > application.yml。
 */
public class DotEnvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final DeferredLog DEFERRED_LOG = new DeferredLog();

    public static final String PROPERTY_SOURCE_NAME = "cipherToolDotEnv";
    private static final String ENV_FILE_PROPERTY = "ciphertool.env-file";

    @Override
    public int getOrder() {
        // 在常规环境准备之后运行，确保 systemEnvironment 已存在，便于精确插入位置
        return Ordered.LOWEST_PRECEDENCE;
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        // EnvironmentPostProcessor 早于日志系统初始化，普通 log 会被丢弃，因此用 DeferredLog 延迟输出
        if (application != null) {
            application.addListeners((ApplicationListener<ApplicationPreparedEvent>) event ->
                    DEFERRED_LOG.replayTo(DotEnvEnvironmentPostProcessor.class));
        }

        Path envFile = resolveEnvFile(environment);
        if (envFile == null) {
            DEFERRED_LOG.debug("No project .env file found; using environment variables and application.yml only.");
            return;
        }

        Map<String, Object> values;
        try {
            values = parseEnvFile(envFile);
        } catch (IOException e) {
            DEFERRED_LOG.warn("Failed to read " + envFile + ": " + e.getMessage());
            return;
        }

        if (values.isEmpty()) {
            DEFERRED_LOG.debug("Project .env at " + envFile + " contains no key=value entries.");
            return;
        }

        MutablePropertySources sources = environment.getPropertySources();
        MapPropertySource source = new MapPropertySource(PROPERTY_SOURCE_NAME, values);
        if (sources.contains("systemEnvironment")) {
            // 置于 systemEnvironment 之前：.env 覆盖机器/用户级环境变量，但保留命令行参数的最高优先级
            sources.addBefore("systemEnvironment", source);
        } else {
            sources.addLast(source);
        }

        DEFERRED_LOG.info("Loaded " + values.size() + " entries from " + envFile.toAbsolutePath().normalize()
                + " (project .env takes precedence over OS environment variables).");
    }

    /**
     * 依次尝试：显式指定的路径 -> 工作目录 -> 工作目录上级（backendcipher/ 下启动）-> 再上一级。
     */
    private Path resolveEnvFile(ConfigurableEnvironment environment) {
        String explicit = environment.getProperty(ENV_FILE_PROPERTY);
        if (explicit != null && !explicit.isBlank()) {
            Path path = Paths.get(explicit.trim());
            return Files.isRegularFile(path) ? path : null;
        }

        Path cwd = Paths.get("").toAbsolutePath().normalize();
        Path[] candidates = new Path[] {
                cwd.resolve(".env"),
                cwd.resolve("..").resolve(".env").normalize(),
                cwd.resolve("..").resolve("..").resolve(".env").normalize()
        };
        for (Path candidate : candidates) {
            if (Files.isRegularFile(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    /**
     * 解析 .env：忽略空行与 # 注释，容忍 `export KEY=VALUE` 写法，
     * 剥离成对的首尾引号，保留值中的 '='。
     */
    Map<String, Object> parseEnvFile(Path path) throws IOException {
        Map<String, Object> values = new LinkedHashMap<>();
        for (String rawLine : Files.readAllLines(path, StandardCharsets.UTF_8)) {
            String line = rawLine;
            if (!line.isEmpty() && line.charAt(0) == '\uFEFF') {
                line = line.substring(1);
            }
            line = line.trim();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }
            if (line.startsWith("export ")) {
                line = line.substring("export ".length()).trim();
            }

            int separator = line.indexOf('=');
            if (separator <= 0) {
                continue;
            }
            String key = line.substring(0, separator).trim();
            String value = line.substring(separator + 1).trim();

            if (!key.matches("[A-Za-z_][A-Za-z0-9_.-]*")) {
                continue;
            }
            if (value.length() >= 2) {
                char first = value.charAt(0);
                char last = value.charAt(value.length() - 1);
                if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
                    value = value.substring(1, value.length() - 1);
                }
            }
            values.put(key, value);
        }
        return values;
    }
}
