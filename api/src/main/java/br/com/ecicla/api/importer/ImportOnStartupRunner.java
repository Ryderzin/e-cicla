package br.com.ecicla.api.importer;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/** Runs the import when the API starts with {@code --app.import.on-startup=true}. */
@Component
@Order(10)
@ConditionalOnProperty(name = "app.import.on-startup", havingValue = "true")
class ImportOnStartupRunner implements ApplicationRunner {

    private final PointImportService importService;

    ImportOnStartupRunner(PointImportService importService) {
        this.importService = importService;
    }

    @Override
    public void run(ApplicationArguments args) {
        importService.importAll();
    }
}
