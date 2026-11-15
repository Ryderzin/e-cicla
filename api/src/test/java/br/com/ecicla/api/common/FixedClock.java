package br.com.ecicla.api.common;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Fixed clock for the tests: 2026-12-01 01:30 UTC, which is still 30 November 2026 (22:30) in São Paulo.
 * That checks that days and months follow São Paulo time, not the server's.
 */
@TestConfiguration
public class FixedClock {

    public static final Instant NOW = Instant.parse("2026-12-01T01:30:00Z");

    @Bean
    @Primary
    Clock fixedClock() {
        return Clock.fixed(NOW, ZoneOffset.UTC);
    }
}
