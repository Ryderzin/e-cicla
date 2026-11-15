package br.com.ecicla.api.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/** Lets e-mails of notices go in the background ({@code @Async}), with Spring Boot's default task executor. */
@Configuration
@EnableAsync
public class AsyncConfig {
}
