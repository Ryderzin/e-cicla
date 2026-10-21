package br.com.ecicla.api.auth;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final ObjectMapper objectMapper;
    private final String fromAddress;
    private final String brevoApiKey;
    private final HttpClient httpClient;

    public EmailService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            ObjectMapper objectMapper,
            @Value("${app.mail.from:${spring.mail.username:nao-responda@e-cicla.com.br}}") String fromAddress,
            @Value("${app.mail.brevo-api-key:${BREVO_API_KEY:}}") String brevoApiKey) {
        this.mailSenderProvider = mailSenderProvider;
        this.objectMapper = objectMapper;
        this.fromAddress = fromAddress;
        this.brevoApiKey = brevoApiKey == null ? "" : brevoApiKey.trim();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public void sendPasswordReset(String toEmail, String userName, String resetUrl) {
        String greeting = userName != null && !userName.isBlank() ? "Olá, " + userName + "!" : "Olá!";
        String html = """
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px 20px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
                  <div style="margin-bottom: 24px;">
                    <span style="font-size: 22px; font-weight: bold; color: #047857;">E-Cicla</span>
                  </div>
                  <h2 style="font-size: 20px; color: #0f172a; margin-top: 0;">Recuperação de Senha</h2>
                  <p style="font-size: 15px; line-height: 1.6; color: #334155;">%s</p>
                  <p style="font-size: 15px; line-height: 1.6; color: #334155;">
                    Recebemos uma solicitação para redefinir a senha da sua conta na plataforma E-Cicla.
                    Para escolher uma nova senha, clique no botão abaixo:
                  </p>
                  <div style="margin: 30px 0; text-align: center;">
                    <a href="%s" style="background-color: #047857; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; display: inline-block;">Redefinir minha senha</a>
                  </div>
                  <p style="font-size: 14px; line-height: 1.5; color: #64748b;">
                    Este link é válido por <strong>1 hora</strong>. Se você não solicitou a redefinição ou não tem uma conta no E-Cicla, ignore esta mensagem com segurança.
                  </p>
                  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0;" />
                  <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
                    E-Cicla — Descarte consciente de lixo eletrônico.
                  </p>
                </div>
                """.formatted(greeting, resetUrl);

        // 1. Prioriza o envio via API REST HTTPS (porta 443), compatível com o plano gratuito do Render
        if (!brevoApiKey.isBlank()) {
            try {
                sendViaBrevoApi(toEmail, userName, html);
                return;
            } catch (Exception e) {
                log.error("Falha ao enviar e-mail via API Brevo para {}: {}", toEmail, e.getMessage(), e);
                log.warn("Link para contingência: {}", resetUrl);
                return;
            }
        }

        // 2. Fallback para SMTP padrão caso configurado (em planos pagos do Render ou servidores com porta 587 liberada)
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.info("Simulação de envio de e-mail (nenhum provedor SMTP ou API configurado). Para: {}, Link: {}", toEmail, resetUrl);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setFrom(fromAddress, "E-Cicla");
            helper.setTo(toEmail);
            helper.setSubject("Redefinição de senha — E-Cicla");
            helper.setText(html, true);
            mailSender.send(message);
            log.info("E-mail de redefinição de senha enviado com sucesso via SMTP para {}", toEmail);
        } catch (Exception e) {
            log.error("Falha ao enviar e-mail via SMTP para {}: {}", toEmail, e.getMessage(), e);
            log.warn("Link para contingência: {}", resetUrl);
        }
    }

    private void sendViaBrevoApi(String toEmail, String userName, String htmlContent) throws Exception {
        Map<String, Object> payload = Map.of(
                "sender", Map.of("name", "E-Cicla", "email", fromAddress),
                "to", List.of(Map.of("email", toEmail, "name", userName != null ? userName : toEmail)),
                "subject", "Redefinição de senha — E-Cicla",
                "htmlContent", htmlContent
        );

        String json = objectMapper.writeValueAsString(payload);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.brevo.com/v3/smtp/email"))
                .timeout(Duration.ofSeconds(10))
                .header("api-key", brevoApiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            log.info("E-mail de redefinição de senha enviado com sucesso via API HTTPS (Brevo) para {}", toEmail);
        } else {
            throw new IllegalStateException("Brevo API retornou status " + response.statusCode() + ": " + response.body());
        }
    }
}
