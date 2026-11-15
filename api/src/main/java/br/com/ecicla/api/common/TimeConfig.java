package br.com.ecicla.api.common;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * The clock used by the rules that depend on "today" (dates of disposals, months of the chart, reminders).
 * Tests replace it with a fixed clock. Calendar days follow São Paulo time, not the server's (UTC on Render).
 */
@Configuration
public class TimeConfig {

    public static final ZoneId SAO_PAULO = ZoneId.of("America/Sao_Paulo");

    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
