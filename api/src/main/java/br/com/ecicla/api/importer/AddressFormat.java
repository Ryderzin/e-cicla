package br.com.ecicla.api.importer;

import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/** Formats addresses as "Rua Exemplo, 100 - Bairro, Cidade - UF", skipping the parts that are missing. */
final class AddressFormat {

    private AddressFormat() {
    }

    /** Returns null when every part is missing. */
    static String format(String street, String number, String suburb, String city, String state) {
        String streetLine = street != null && number != null ? street + ", " + number : street;
        String cityState = join(" - ", city, state);
        // Some sources repeat the city as the neighbourhood ("Centro, Centro - SP" style); show it once.
        String area = join(", ", suburb != null && suburb.equalsIgnoreCase(city) ? null : suburb, cityState);
        return join(" - ", streetLine, area);
    }

    private static String join(String separator, String... parts) {
        String joined = Stream.of(parts).filter(Objects::nonNull).collect(Collectors.joining(separator));
        return joined.isEmpty() ? null : joined;
    }
}
